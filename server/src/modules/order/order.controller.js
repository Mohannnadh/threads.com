
const {
  createOrder,
  createOnlinePaymentOrder,
  verifyRazorpayPayment,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} = require('./order.service');


// Customer: place an order
const createOrderController = async (req, res) => {
  try {
    const userId = req.user.userId;

    const order = await createOrder(userId, req.body);

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
// Create a Razorpay order using server-calculated prices.
const createRazorpayOrderController = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await createOnlinePaymentOrder(userId, req.body);

    return res.status(201).json({
      success: true,
      message: 'Online payment order created successfully',
      order: result.order,
      razorpayOrder: result.razorpayOrder,
      keyId: result.keyId,
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error.message);

    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create payment order',
    });
  }
};

// Verify Razorpay payment.
const verifyRazorpayPaymentController = async (req, res) => {
  try {
    const userId = req.user.userId;

    const order = await verifyRazorpayPayment(userId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      order,
    });
  } catch (error) {
    console.error('Payment verification error:', error.message);

    return res.status(400).json({
      success: false,
      message: error.message || 'Payment verification failed',
    });
  }
};

// Customer: get their own orders
const getMyOrdersController = async (req, res) => {
  try {
    const userId = req.user.userId;

    const orders = await getMyOrders(userId);

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin: get all customer orders
const getAllOrdersController = async (req, res) => {
  try {
    const orders = await getAllOrders();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin: update an order's status

const updateOrderStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    const order = await updateOrderStatus(id, orderStatus);

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order,
    });
  } catch (error) {
    const clientErrors = [
      'Invalid order ID',
      'Invalid order status',
      'Order not found',
    ];

    if (
      clientErrors.includes(error.message) ||
      error.message.startsWith('Cannot change order status') ||
      error.message.startsWith('Order status changed by another request')
    ) {
      return res.status(
        error.message === 'Order not found' ? 404 : 400
      ).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Update order status error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update order status',
    });
  }
};


module.exports = {
  createOrderController,
  createRazorpayOrderController,
  verifyRazorpayPaymentController,
  getMyOrdersController,
  getAllOrdersController,
  updateOrderStatusController,
};
