const mongoose = require('mongoose');
const Review = require('./review.model');
const Order = require('../order/order.model');
const Product = require('../product/product.model');
const User = require('../user/user.model');
const {
  parsePagination,
  buildPagination,
  escapeRegex,
} = require('../../utils/pagination');

const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);

// Keeps the average and count on the product in step with its reviews.
const refreshProductRating = async (productId) => {
  const [stats] = await Review.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(String(productId)),
        isHidden: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        ratingAverage: stats ? Math.round(stats.average * 10) / 10 : 0,
        ratingCount: stats ? stats.count : 0,
      },
    }
  );
};

const createReview = async (userId, data) => {
  const { orderId, productId, rating, title, comment } = data;

  if (!isValidId(orderId) || !isValidId(productId)) {
    throw new Error('Invalid order or product');
  }

  const stars = Number(rating);

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new Error('Choose a rating from 1 to 5 stars');
  }

  const order = await Order.findOne({ _id: orderId, user: userId });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.orderStatus !== 'DELIVERED') {
    throw new Error('You can review products once the order is delivered');
  }

  const ordered = order.items.some(
    (item) => String(item.product) === String(productId)
  );

  if (!ordered) {
    throw new Error('This product is not part of the order');
  }

  try {
    const review = await Review.create({
      user: userId,
      product: productId,
      order: orderId,
      rating: stars,
      title: typeof title === 'string' ? title.trim().slice(0, 120) : '',
      comment:
        typeof comment === 'string' ? comment.trim().slice(0, 2000) : '',
    });

    await refreshProductRating(productId);

    return review;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(
        'You have already reviewed this product for this order'
      );
    }

    throw error;
  }
};

// Customers can change the rating, title and comment of their own review.
const updateReview = async (userId, reviewId, data) => {
  if (!isValidId(reviewId)) {
    throw new Error('Invalid review ID');
  }

  const review = await Review.findOne({ _id: reviewId, user: userId });

  if (!review) {
    throw new Error('Review not found');
  }

  const { rating, title, comment } = data || {};

  if (rating !== undefined) {
    const stars = Number(rating);

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      throw new Error('Choose a rating from 1 to 5 stars');
    }

    review.rating = stars;
  }

  if (title !== undefined) {
    review.title = typeof title === 'string' ? title.trim().slice(0, 120) : '';
  }

  if (comment !== undefined) {
    review.comment = typeof comment === 'string' ? comment.trim().slice(0, 2000) : '';
  }

  await review.save();
  await refreshProductRating(review.product);

  return review;
};

const deleteReview = async (userId, reviewId) => {
  if (!isValidId(reviewId)) {
    throw new Error('Invalid review ID');
  }

  const review = await Review.findOneAndDelete({ _id: reviewId, user: userId });

  if (!review) {
    throw new Error('Review not found');
  }

  await refreshProductRating(review.product);

  return review;
};

const listMyReviews = async (userId) =>
  Review.find({ user: userId })
    .sort({ createdAt: -1 })
    .select('order product rating title comment createdAt')
    .lean();

// "Priya Sharma" -> "Priya S." so full names are not shown publicly.
const publicName = (user) => {
  const parts = String(user?.name || '').trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return 'Customer';
  if (parts.length === 1) return parts[0];

  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

const listProductReviews = async (productId, query) => {
  if (!isValidId(productId)) {
    throw new Error('Invalid product ID');
  }

  const { page, limit, skip } = parsePagination(query, {
    defaultLimit: 10,
    maxLimit: 50,
  });

  const filter = { product: productId, isHidden: { $ne: true } };

  const [reviews, total, breakdownRows] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name')
      .select('rating title comment createdAt updatedAt user')
      .lean(),
    Review.countDocuments(filter),
    Review.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(String(productId)),
          isHidden: { $ne: true },
        },
      },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;

  for (const row of breakdownRows) {
    breakdown[row._id] = row.count;
    ratingSum += row._id * row.count;
  }

  return {
    reviews: reviews.map((review) => ({
      _id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt,
      reviewer: publicName(review.user),
    })),
    summary: {
      average: total ? Math.round((ratingSum / total) * 10) / 10 : 0,
      count: total,
      breakdown,
    },
    pagination: buildPagination(total, { page, limit }),
  };
};

// What the logged-in customer can do on a product page: write a review for a
// delivered order that has none yet, and/or edit the reviews they already wrote.
const getMyProductReviewStatus = async (userId, productId) => {
  if (!isValidId(productId)) {
    throw new Error('Invalid product ID');
  }

  const [deliveredOrders, myReviews] = await Promise.all([
    Order.find({
      user: userId,
      orderStatus: 'DELIVERED',
      'items.product': productId,
    })
      .sort({ deliveredAt: -1 })
      .select('_id')
      .lean(),
    Review.find({ user: userId, product: productId })
      .select('order rating title comment isHidden createdAt')
      .lean(),
  ]);

  const reviewedOrders = new Set(myReviews.map((review) => String(review.order)));
  const reviewable = deliveredOrders.find(
    (order) => !reviewedOrders.has(String(order._id))
  );

  return {
    hasPurchased: deliveredOrders.length > 0,
    reviewableOrderId: reviewable ? reviewable._id : null,
    myReviews,
  };
};

// ---------- Admin moderation ----------

const listReviewsForAdmin = async (query) => {
  const { page, limit, skip } = parsePagination(query, {
    defaultLimit: 15,
    maxLimit: 50,
  });

  const filter = {};

  const rating = Number(query.rating);

  if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
    filter.rating = rating;
  }

  if (query.status === 'HIDDEN') filter.isHidden = true;
  if (query.status === 'VISIBLE') filter.isHidden = { $ne: true };

  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '';

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');

    const [userIds, productIds] = await Promise.all([
      User.find({ $or: [{ name: pattern }, { email: pattern }] }).distinct('_id'),
      Product.find({ name: pattern }).distinct('_id'),
    ]);

    filter.$or = [
      { title: pattern },
      { comment: pattern },
      { user: { $in: userIds } },
      { product: { $in: productIds } },
    ];
  }

  const [reviews, total, counts] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .populate('product', 'name')
      .lean(),
    Review.countDocuments(filter),
    Review.aggregate([
      {
        $group: {
          _id: { $cond: [{ $eq: ['$isHidden', true] }, 'HIDDEN', 'VISIBLE'] },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const tally = { ALL: 0, VISIBLE: 0, HIDDEN: 0 };

  for (const row of counts) {
    tally[row._id] = row.count;
    tally.ALL += row.count;
  }

  return {
    reviews,
    counts: tally,
    pagination: buildPagination(total, { page, limit }),
  };
};

const setReviewHidden = async (reviewId, isHidden) => {
  if (!isValidId(reviewId)) {
    throw new Error('Invalid review ID');
  }

  if (typeof isHidden !== 'boolean') {
    throw new Error('Choose whether the review should be hidden or visible');
  }

  const review = await Review.findByIdAndUpdate(
    reviewId,
    { $set: { isHidden } },
    { new: true }
  );

  if (!review) {
    throw new Error('Review not found');
  }

  await refreshProductRating(review.product);

  return review;
};

const deleteReviewAsAdmin = async (reviewId) => {
  if (!isValidId(reviewId)) {
    throw new Error('Invalid review ID');
  }

  const review = await Review.findByIdAndDelete(reviewId);

  if (!review) {
    throw new Error('Review not found');
  }

  await refreshProductRating(review.product);

  return review;
};

module.exports = {
  updateReview,
  deleteReview,
  createReview,
  listMyReviews,
  listProductReviews,
  getMyProductReviewStatus,
  listReviewsForAdmin,
  setReviewHidden,
  deleteReviewAsAdmin,
};
