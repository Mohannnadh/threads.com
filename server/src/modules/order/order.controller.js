
const {
  parsePagination,
  buildPagination,
  cleanSearch,
} = require('../../utils/pagination');

const {
  createOrder,
  createOnlinePaymentOrder,
  verifyRazorpayPayment,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getInvoiceOrder,
  setShipping,
} = require('./order.service');
const { buildInvoiceHtml } = require('./invoice');


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

// Customer: get their own orders (paginated)
const getMyOrdersController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const pagination = parsePagination(req.query, {
      defaultLimit: 10,
      maxLimit: 50,
    });

    const { orders, total } = await getMyOrders(userId, pagination);

    return res.status(200).json({
      success: true,
      orders,
      pagination: buildPagination(total, pagination),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin: get customer orders (paginated, filterable by status and search)
const getAllOrdersController = async (req, res) => {
  try {
    const pagination = parsePagination(req.query, {
      defaultLimit: 15,
      maxLimit: 50,
    });

    const { orders, total, counts } = await getAllOrders({
      ...pagination,
      status: typeof req.query.status === 'string' ? req.query.status : '',
      search: cleanSearch(req.query.search),
    });

    return res.status(200).json({
      success: true,
      orders,
      counts,
      pagination: buildPagination(total, pagination),
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


// Customer or admin: download an order's invoice as an HTML file.
const getInvoiceController = async (req, res) => {
  try {
    const order = await getInvoiceOrder(
      req.params.id,
      req.user.userId,
      req.user.role
    );

    const fileNo = String(order._id).slice(-6).toUpperCase();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `${req.query.view === '1' ? 'inline' : 'attachment'}; filename="invoice-${fileNo}.html"`
    );

    return res.status(200).send(buildInvoiceHtml(order));
  } catch (error) {
    return res.status(error.message === 'Order not found' ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin: save courier and tracking number.
const setShippingController = async (req, res) => {
  try {
    const order = await setShipping(req.params.id, req.body || {});

    return res.status(200).json({
      success: true,
      message: 'Shipping details saved',
      order,
    });
  } catch (error) {
    return res.status(error.message === 'Order not found' ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getInvoiceController,
  setShippingController,
  createOrderController,
  createRazorpayOrderController,
  verifyRazorpayPaymentController,
  getMyOrdersController,
  getAllOrdersController,
  updateOrderStatusController,
};
