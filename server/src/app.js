const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./modules/auth/auth.routes');
const productRoutes = require('./modules/product/product.routes');
const orderRoutes = require('./modules/order/order.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const userRoutes = require('./modules/user/user.routes');
const walletRoutes = require('./modules/wallet/wallet.routes');
const reviewRoutes = require('./modules/review/review.routes');
const returnRoutes = require('./modules/returns/returns.routes');
const couponRoutes = require('./modules/coupon/coupon.routes');
const offerRoutes = require('./modules/offer/offer.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/offers', offerRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Threads.com API is running',
  });
});

// Unknown API routes get a JSON 404 instead of Express's HTML page.
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Last-resort error handler, e.g. malformed JSON in a request body.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    console.error('Unhandled error:', err);
  }

  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Something went wrong' : err.message,
  });
});

module.exports = app;
