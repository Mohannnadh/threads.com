const mongoose = require('mongoose');
const Offer = require('./offer.model');
const Product = require('../product/product.model');
const Category = require('../product/category.model');
const { parsePagination, buildPagination, cleanSearch, escapeRegex } = require('../../utils/pagination');

const money = (value) => Math.round(Number(value) * 100) / 100;

const normalizeCategory = (value) => String(value || '').trim().toLowerCase();

// Price after one offer. Never below zero.
const priceWithOffer = (price, offer) => {
  const final =
    offer.type === 'PERCENT'
      ? (price * (100 - offer.value)) / 100
      : price - offer.value;

  return money(Math.max(0, final));
};

// Offers that are switched on, inside their dates, and cover at least one of
// the given products (by product or by category).
const findLiveOffers = async (products) => {
  if (products.length === 0) return [];

  const ids = products.map((product) => product._id);
  const categories = [...new Set(products.map((product) => normalizeCategory(product.category)).filter(Boolean))];
  const now = new Date();

  return Offer.find({
    isActive: true,
    $or: [{ productIds: { $in: ids } }, { categories: { $in: categories } }],
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
    ],
  }).lean();
};

const offerCovers = (offer, product) => {
  const byProduct = (offer.productIds || []).some((id) => String(id) === String(product._id));
  const category = normalizeCategory(product.category);
  const byCategory = Boolean(category) && (offer.categories || []).includes(category);

  return byProduct || byCategory;
};

// The offer that gives the lowest price for a base price, if any apply.
const bestOfferFor = (product, basePrice, offers) => {
  let best = null;

  for (const offer of offers) {
    if (!offerCovers(offer, product)) continue;

    const final = priceWithOffer(basePrice, offer);

    if (!best || final < best.finalPrice) {
      best = { finalPrice: final, offer };
    }
  }

  return best;
};

const summarise = (offer) => ({
  _id: offer._id,
  title: offer.title,
  type: offer.type,
  value: offer.value,
});

// The base price for a colour and size. Products without a colour/size list use
// their single price.
const basePriceFor = (product, color, size) => {
  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    return Number(product.price);
  }

  const wantedColor = String(color || '').trim().toLowerCase();
  const wantedSize = String(size || '').trim().toLowerCase();

  const variant = product.variants.find(
    (item) =>
      String(item.color).trim().toLowerCase() === wantedColor &&
      String(item.size).trim().toLowerCase() === wantedSize
  );

  return variant ? Number(variant.price) : Number(product.price);
};

// The price the customer actually pays for one unit in this colour and size.
// Used by order creation, so the server never trusts the browser.
const effectivePrice = async (product, color, size) => {
  const offers = await findLiveOffers([product]);
  const base = basePriceFor(product, color, size);
  const best = bestOfferFor(product, base, offers);

  if (!best) {
    return { finalPrice: base, offer: null };
  }

  return { finalPrice: best.finalPrice, offer: summarise(best.offer) };
};

// Adds offer prices to products for the API. `price` and each variant's `price`
// stay the originals, so admin screens keep editing the real values.
const applyOffers = async (products) => {
  const list = products.map((product) =>
    typeof product.toObject === 'function' ? product.toObject() : product
  );

  const offers = await findLiveOffers(list);

  return list.map((product) => {
    const best = bestOfferFor(product, product.price, offers);

    const variants = Array.isArray(product.variants)
      ? product.variants.map((variant) => {
          const variantBest = bestOfferFor(product, variant.price, offers);

          return {
            ...variant,
            finalPrice: variantBest ? variantBest.finalPrice : variant.price,
            offer: variantBest ? summarise(variantBest.offer) : null,
          };
        })
      : [];

    const lowestVariant = variants.length
      ? Math.min(...variants.map((variant) => variant.finalPrice))
      : null;

    return {
      ...product,
      variants,
      finalPrice: lowestVariant !== null ? lowestVariant : best ? best.finalPrice : product.price,
      offer: best ? summarise(best.offer) : null,
    };
  });
};

// ---------- Admin ----------

const cleanOfferInput = (data, { partial = false } = {}) => {
  const out = {};
  const has = (key) => data[key] !== undefined;

  if (!partial || has('title')) {
    const title = typeof data.title === 'string' ? data.title.trim() : '';

    if (!title) throw new Error('Enter a name for this offer');
    if (title.length > 80) throw new Error('Offer names can be at most 80 characters');

    out.title = title;
  }

  if (!partial || has('productIds')) {
    const list = Array.isArray(data.productIds) ? [...new Set(data.productIds.map(String))] : [];

    if (!list.every((id) => mongoose.Types.ObjectId.isValid(id))) {
      throw new Error('One of the selected products is not valid');
    }

    out.productIds = list;
  }

  if (!partial || has('categories')) {
    const list = Array.isArray(data.categories)
      ? [...new Set(data.categories.map(normalizeCategory).filter(Boolean))]
      : [];

    if (list.some((name) => name.length > 40)) {
      throw new Error('Category names can be at most 40 characters');
    }

    out.categories = list;
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

  for (const key of ['startsAt', 'expiresAt']) {
    if (has(key)) {
      if (data[key] === null || data[key] === '') {
        out[key] = null;
      } else {
        const date = new Date(data[key]);

        if (Number.isNaN(date.getTime())) throw new Error('Enter a valid date');

        out[key] = date;
      }
    }
  }

  if (out.startsAt && out.expiresAt && out.expiresAt <= out.startsAt) {
    throw new Error('The end date must be after the start date');
  }

  if (has('isActive')) {
    if (typeof data.isActive !== 'boolean') throw new Error('Set the offer to active or inactive');

    out.isActive = data.isActive;
  }

  return out;
};

// An offer needs at least one product or category.
const requireTargets = (productIds, categories) => {
  if ((productIds?.length || 0) + (categories?.length || 0) === 0) {
    throw new Error('Choose at least one product or category for this offer');
  }
};

// Every selected product and category must exist.
const assertTargetsExist = async ({ productIds = [], categories = [] }) => {
  if (productIds.length > 0) {
    const count = await Product.countDocuments({ _id: { $in: productIds } });

    if (count !== productIds.length) {
      throw new Error('Some of the selected products no longer exist. Please choose again.');
    }
  }

  for (const name of categories) {
    const exists =
      (await Category.exists({ name })) ||
      (await Product.exists({ category: new RegExp(`^${escapeRegex(name)}$`, 'i') }));

    if (!exists) {
      throw new Error(`The category "${name}" does not exist`);
    }
  }
};

const listOffers = async (query) => {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 15, maxLimit: 50 });

  const filter = {};
  const search = cleanSearch(query.search);

  if (search) {
    filter.title = new RegExp(escapeRegex(search), 'i');
  }

  if (query.status === 'ACTIVE') filter.isActive = true;
  if (query.status === 'INACTIVE') filter.isActive = false;

  const [offers, total] = await Promise.all([
    Offer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('productIds', 'name images price')
      .lean(),
    Offer.countDocuments(filter),
  ]);

  return { offers, pagination: buildPagination(total, { page, limit }) };
};

const createOffer = async (data) => {
  const fields = cleanOfferInput(data);

  if (fields.type === undefined || fields.value === undefined) {
    throw new Error('Choose a discount type and a discount value');
  }

  const productIds = fields.productIds || [];
  const categories = fields.categories || [];

  requireTargets(productIds, categories);
  await assertTargetsExist({ productIds, categories });

  return Offer.create({ ...fields, productIds, categories });
};

const updateOffer = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid offer ID');

  const current = await Offer.findById(id);
  if (!current) throw new Error('Offer not found');

  const changes = cleanOfferInput(data, { partial: true });
  const merged = { ...current.toObject(), ...changes };

  // Re-check the full offer so a partial edit cannot leave it invalid.
  const checked = cleanOfferInput({
    ...merged,
    productIds: (merged.productIds || []).map(String),
  });

  requireTargets(checked.productIds, checked.categories);
  await assertTargetsExist({
    productIds: changes.productIds,
    categories: changes.categories,
  });

  return Offer.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true });
};

const setOfferStatus = async (id, isActive) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid offer ID');

  const fields = cleanOfferInput({ isActive }, { partial: true });
  const offer = await Offer.findByIdAndUpdate(id, { $set: fields }, { new: true });

  if (!offer) throw new Error('Offer not found');

  return offer;
};

const deleteOffer = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid offer ID');

  const offer = await Offer.findByIdAndDelete(id);
  if (!offer) throw new Error('Offer not found');

  return offer;
};

module.exports = {
  effectivePrice,
  applyOffers,
  listOffers,
  createOffer,
  updateOffer,
  setOfferStatus,
  deleteOffer,
};
