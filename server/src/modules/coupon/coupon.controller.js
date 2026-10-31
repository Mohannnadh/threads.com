const {
  previewCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  setCouponStatus,
  deleteCoupon,
} = require('./coupon.service');

const sendError = (res, error, notFound = false) => {
  const status = notFound && error.message === 'Coupon not found' ? 404 : 400;

  return res.status(status).json({ success: false, message: error.message });
};

// Customer: check a code against the cart before paying.
const previewCouponController = async (req, res) => {
  try {
    const preview = await previewCoupon(req.user.userId, req.body || {});

    return res.status(200).json({ success: true, preview });
  } catch (error) {
    return sendError(res, error);
  }
};

const adminListCouponsController = async (req, res) => {
  try {
    const data = await listCoupons(req.query);

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error('List coupons error:', error);

    return res.status(500).json({ success: false, message: 'Failed to load coupons' });
  }
};

const adminCreateCouponController = async (req, res) => {
  try {
    const coupon = await createCoupon(req.body || {});

    return res.status(201).json({ success: true, message: 'Coupon created', coupon });
  } catch (error) {
    return sendError(res, error);
  }
};

const adminUpdateCouponController = async (req, res) => {
  try {
    const coupon = await updateCoupon(req.params.id, req.body || {});

    return res.status(200).json({ success: true, message: 'Coupon updated', coupon });
  } catch (error) {
    return sendError(res, error, true);
  }
};

const adminSetCouponStatusController = async (req, res) => {
  try {
    const coupon = await setCouponStatus(req.params.id, req.body?.isActive);

    return res.status(200).json({
      success: true,
      message: coupon.isActive ? 'Coupon activated' : 'Coupon deactivated',
      coupon,
    });
  } catch (error) {
    return sendError(res, error, true);
  }
};

const adminDeleteCouponController = async (req, res) => {
  try {
    await deleteCoupon(req.params.id);

    return res.status(200).json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    return sendError(res, error, true);
  }
};

module.exports = {
  previewCouponController,
  adminListCouponsController,
  adminCreateCouponController,
  adminUpdateCouponController,
  adminSetCouponStatusController,
  adminDeleteCouponController,
};
