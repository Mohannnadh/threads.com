const express = require('express');
const cors = require('cors');

const authRoutes = require('./modules/auth/auth.routes');
const productRoutes = require('./modules/product/product.routes');
const orderRoutes = require('./modules/order/order.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const userRoutes = require('./modules/user/user.routes');

const authMiddleware = require('./middlewares/authMiddleware');
const roleMiddleware = require('./middlewares/roleMiddleware');

const app = express();

app.use(cors());
app.use(express.json());



app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
console.log('Orders router registered:', require.resolve('./modules/order/order.routes'));
console.log('Order routes mounted');
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Threads.com API is running',
  });
});

// Temporary protected route for testing JWT
app.get('/api/test-protected', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'You accessed a protected route',
    user: req.user,
  });
});
app.get('/api/test-admin',
  authMiddleware,
  roleMiddleware('admin'),
  (req, res) => {
    res.json({
      success: true,
      message: 'You accessed the admin route',
      user: req.user,
    });
  }
);

module.exports = app; 