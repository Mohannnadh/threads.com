const mongoose = require('mongoose');
const Coupon = require('./coupon.model');
const Order = require('../order/order.model');
const Product = require('../product/product.model');
const { effectivePrice } = require('../offer/offer.service');
const { parsePagination, buildPagination, cleanSearch, escapeRegex } = require('../../utils/pagination');

const money = (value) => Math.round(Number(value) * 100) / 100;

const normalizeCode = (value) =>
  String(value || '').trim().toUpperCase().replace(/\s+/g, '');

// Discount in rupees for a subtotal. Never more than the subtotal itself.
const computeDiscount = (coupon, subtotal) => {
  let discount =
    coupon.type === 'PERCENT' ? (subtotal * coupon.value) / 100 : coupon.value;

  if (coupon.type === 'PERCENT' && coupon.maxDiscount) {
    discount = Math.min(discount, coupon.maxDiscount);
  }

  return money(Math.min(discount, subtotal));
};

// Checks a code against the rules without using it. Used by the preview
// endpoint and by order creation, which then claims the use.
const resolveCoupon = async (rawCode, subtotal, userId) => {
  const code = normalizeCode(rawCode);

  if (!code) {
    throw new Error('Enter a coupon code');
  }

  const coupon = await Coupon.findOne({ code });

  if (!coupon || !coupon.isActive) {
    throw new Error('This coupon code is not valid');
  }

  const now = new Date();

  if (coupon.startsAt && coupon.startsAt > now) {
    throw new Error('This coupon is not active yet');
  }

  if (coupon.expiresAt && coupon.expiresAt <= now) {
    throw new Error('This coupon has expired');
  }

  if (subtotal < coupon.minSubtotal) {
    throw new Error(
      `This coupon needs a minimum order of ₹${coupon.minSubtotal.toLocaleString('en-IN')}`
    );
  }

  // The usage limit is per customer: each account can use the code up to
  // usageLimit times. Blank means unlimited uses per customer.
  if (userId && coupon.usageLimit) {
    const timesUsed = await Order.countDocuments({
      user: userId,
      couponCode: coupon.code,
      orderStatus: { $ne: 'CANCELLED' },
    });

    if (timesUsed >= coupon.usageLimit) {
      throw new Error(
        coupon.usageLimit === 1
          ? 'You have already used this coupon'
          : `You have already used this coupon ${coupon.usageLimit} times`
      );
    }
  }

  const discount = computeDiscount(coupon, subtotal);

  if (discount <= 0) {
    throw new Error('This coupon does not give a discount on this order');
  }

  return { coupon, discount };
};

// Takes one use of the coupon. The usage limit is checked in the same
// atomic update, so two checkouts cannot both use the last one.
const claimCouponUse = async (coupon) => {
  // Counts total uses for the admin list. The per-customer limit is checked in resolveCoupon.
  await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
};

// Gives a use back, e.g. when an order is cancelled or never saved.
const releaseCouponUse = async (code) => {
  if (!code) return;

  await Coupon.updateOne(
    { code, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } }
  ).catch((error) => {
    console.error('Coupon release failed:', code, error.message);
  });
};

// Subtotal from database prices, for the checkout preview.
const subtotalForItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Your cart is empty');
  }

  let subtotal = 0;

  for (const item of items) {
    if (!mongoose.Types.ObjectId.isValid(item?.product)) {
      throw new Error('Invalid product');
    }

    const quantity = Number(item.quantity);

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new Error('Invalid quantity');
    }

    const product = await Product.findById(item.product).select('price category variants');

    if (!product) {
      throw new Error('A product in your cart is no longer available');
    }

    const { finalPrice } = await effectivePrice(product, item.color, item.size);
    subtotal += finalPrice * quantity;
  }

  return money(subtotal);
};

const previewCoupon = async (userId, { code, items }) => {
  const subtotal = await subtotalForItems(items);
  const { coupon, discount } = await resolveCoupon(code, subtotal, userId);

  return {
    code: coupon.code,
    description: coupon.description,
    subtotal,
    discount,
    total: money(subtotal - discount),
  };
};

// ---------- Admin ----------

const cleanCouponInput = (data, { partial = false } = {}) => {
  const out = {};
  const has = (key) => data[key] !== undefined;

  if (!partial || has('code')) {
    const code = normalizeCode(data.code);

    if (!code) throw new Error('Enter a coupon code');
    if (code.length > 30) throw new Error('Coupon codes can be at most 30 characters');
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      throw new Error('Use only letters, numbers, dashes and underscores in the code');
    }

    out.code = code;
  }

  if (!partial || has('type')) {
    if (!['PERCENT', 'FIXED'].includes(data.type)) {
      throw new Error('Choose a percentage or fixed-amount discount');
    }

    out.type = data.type;
  }

  if (!partial || has('value')) {
    const value = Number(data.value);

    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('Enter a discount greater than zero');
    }

    out.value = money(value);
  }

  const type = out.type ?? data.type;
  const value = out.value ?? Number(data.value);

  if (type === 'PERCENT' && value > 100) {
    throw new Error('A percentage discount cannot be more than 100');
  }

  if (has('maxDiscount')) {
    if (data.maxDiscount === null || data.maxDiscount === '') {
      out.maxDiscount = null;
    } else {
      const max = Number(data.maxDiscount);

      if (!Number.isFinite(max) || max <= 0) {
        throw new Error('The maximum discount must be greater than zero');
      }

      out.maxDiscount = money(max);
    }
  }

  if (has('minSubtotal')) {
    const min = Number(data.minSubtotal || 0);

    if (!Number.isFinite(min) || min < 0) {
      throw new Error('The minimum order must be zero or more');
    }

    out.minSubtotal = money(min);
  }

  if (has('usageLimit')) {
    if (data.usageLimit === null || data.usageLimit === '') {
      out.usageLimit = null;
    } else {
      const limit = Number(data.usageLimit);

      if (!Number.isInteger(limit) || limit < 1) {
        throw new Error('The usage limit must be a whole number of at least 1');
      }

      out.usageLimit = limit;
    }
  }

  for (const key of ['startsAt', 'expiresAt']) {
    if (has(key)) {
      if (data[key] === null || data[key] === '') {
        out[key] = null;
      } else {
        const date = new Date(data[key]);

        if (Number.isNaN(date.getTime())) {
          throw new Error('Enter a valid date');
        }

        out[key] = date;
      }
    }
  }

  if (out.startsAt && out.expiresAt && out.expiresAt <= out.startsAt) {
    throw new Error('The end date must be after the start date');
  }

  if (has('description')) {
    out.description = typeof data.description === 'string'
      ? data.description.trim().slice(0, 120)
      : '';
  }

  if (has('isActive')) {
    if (typeof data.isActive !== 'boolean') {
      throw new Error('Set the coupon to active or inactive');
    }

    out.isActive = data.isActive;
  }

  return out;
};

const listCoupons = async (query) => {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 15, maxLimit: 50 });

  const filter = {};
  const search = cleanSearch(query.search);

  if (search) {
    filter.$or = [
      { code: new RegExp(escapeRegex(search), 'i') },
      { description: new RegExp(escapeRegex(search), 'i') },
    ];
  }

  if (query.status === 'ACTIVE') filter.isActive = true;
  if (query.status === 'INACTIVE') filter.isActive = false;

  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);

  return { coupons, pagination: buildPagination(total, { page, limit }) };
};

const createCoupon = async (data) => {
  const fields = cleanCouponInput(data);

  if (fields.type === undefined) throw new Error('Choose a discount type');
  if (fields.value === undefined) throw new Error('Enter a discount value');

  try {
    return await Coupon.create(fields);
  } catch (error) {
    if (error.code === 11000) throw new Error('A coupon with this code already exists');
    throw error;
  }
};

const updateCoupon = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid coupon ID');

  const current = await Coupon.findById(id);
  if (!current) throw new Error('Coupon not found');

  // Validate against the merged values so partial edits are checked properly.
  const merged = { ...current.toObject(), ...cleanCouponInput(data, { partial: true }) };
  cleanCouponInput(merged);

  const fields = cleanCouponInput(data, { partial: true });

  try {
    const updated = await Coupon.findByIdAndUpdate(id, { $set: fields }, { new: true, runValidators: true });
    return updated;
  } catch (error) {
    if (error.code === 11000) throw new Error('A coupon with this code already exists');
    throw error;
  }
};

const setCouponStatus = async (id, isActive) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid coupon ID');

  const fields = cleanCouponInput({ isActive }, { partial: true });
  const coupon = await Coupon.findByIdAndUpdate(id, { $set: fields }, { new: true });

  if (!coupon) throw new Error('Coupon not found');

  return coupon;
};

const deleteCoupon = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid coupon ID');

  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new Error('Coupon not found');

  return coupon;
};

module.exports = {
  computeDiscount,
  resolveCoupon,
  claimCouponUse,
  releaseCouponUse,
  previewCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  setCouponStatus,
  deleteCoupon,
};
