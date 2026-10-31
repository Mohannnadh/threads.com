const Order = require('../modules/order/order.model');
const { updateOrderStatus } = require('../modules/order/order.service');

// Cancel online orders that were never paid within the payment window.
// Cancelling goes through updateOrderStatus so stock is released the same
// way as a manual cancellation.
const expireOnlineOrders = async () => {
  try {
    const expiredOrders = await Order.find({
      paymentMethod: 'ONLINE',
      paymentStatus: 'PENDING',
      orderStatus: 'PLACED',
      expiresAt: { $ne: null, $lte: new Date() },
      inventoryReleased: false,
    }).select('_id');

    for (const order of expiredOrders) {
      try {
        await updateOrderStatus(order._id, 'CANCELLED');

        console.log(`Expired online order cancelled: ${order._id}`);
      } catch (error) {
        console.error(
          `Could not expire online order ${order._id}:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error('Failed to process expired online orders:', error);
  }
};

module.exports = expireOnlineOrders;
