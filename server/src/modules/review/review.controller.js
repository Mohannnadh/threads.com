const {
  createReview,
  listMyReviews,
  listProductReviews,
  updateReview,
  deleteReview,
  getMyProductReviewStatus,
  listReviewsForAdmin,
  setReviewHidden,
  deleteReviewAsAdmin,
} = require('./review.service');

const sendError = (res, error) => {
  const status = ['Order not found', 'Review not found'].includes(error.message) ? 404 : 400;

  return res.status(status).json({
    success: false,
    message: error.message || 'Something went wrong',
  });
};

const createReviewController = async (req, res) => {
  try {
    const review = await createReview(req.user.userId, req.body || {});

    return res.status(201).json({
      success: true,
      message: 'Thanks for your review',
      review,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const myReviewsController = async (req, res) => {
  try {
    const reviews = await listMyReviews(req.user.userId);

    return res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error('List my reviews error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load your reviews',
    });
  }
};

const productReviewsController = async (req, res) => {
  try {
    const data = await listProductReviews(req.params.productId, req.query);

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateReviewController = async (req, res) => {
  try {
    const review = await updateReview(req.user.userId, req.params.id, req.body || {});

    return res.status(200).json({ success: true, message: 'Review updated', review });
  } catch (error) {
    return sendError(res, error);
  }
};

const deleteReviewController = async (req, res) => {
  try {
    await deleteReview(req.user.userId, req.params.id);

    return res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (error) {
    return sendError(res, error);
  }
};

const myProductReviewStatusController = async (req, res) => {
  try {
    const data = await getMyProductReviewStatus(req.user.userId, req.params.productId);

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return sendError(res, error);
  }
};

// Admin: every review, with filters.
const adminListReviewsController = async (req, res) => {
  try {
    const data = await listReviewsForAdmin(req.query);

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error('Admin list reviews error:', error);

    return res.status(500).json({ success: false, message: 'Failed to load reviews' });
  }
};

// Admin: hide a review from the shop or show it again.
const adminSetReviewHiddenController = async (req, res) => {
  try {
    const review = await setReviewHidden(req.params.id, req.body?.isHidden);

    return res.status(200).json({
      success: true,
      message: review.isHidden ? 'Review hidden from the shop' : 'Review is visible again',
      review,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

// Admin: permanently delete a review.
const adminDeleteReviewController = async (req, res) => {
  try {
    await deleteReviewAsAdmin(req.params.id);

    return res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  myProductReviewStatusController,
  adminListReviewsController,
  adminSetReviewHiddenController,
  adminDeleteReviewController,
  updateReviewController,
  deleteReviewController,
  createReviewController,
  myReviewsController,
  productReviewsController,
};
