
const Product = require('../product/product.model');
const Order = require('../order/order.model');

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalProducts,
      inStockProducts,
      lowStockProducts,
      outOfStockProducts,
      totalOrders,
      orderStatusCounts,
      orderValueResult,
      paidRevenueResult,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ stock: { $gt: 0 } }),
      Product.countDocuments({ stock: { $gt: 0, $lte: 5 } }),
      Product.countDocuments({ stock: 0 }),
      Order.countDocuments(),
      Order.aggregate([
        {
          $group: {
            _id: '$orderStatus',
            count: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'CANCELLED' } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
          },
        },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'PAID' } },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

    const ordersByStatus = {};

    for (const item of orderStatusCounts) {
      ordersByStatus[item._id] = item.count;
    }

    return res.status(200).json({
      success: true,
      stats: {
        products: {
          total: totalProducts,
          inStock: inStockProducts,
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts,
        },
        orders: {
          total: totalOrders,
          byStatus: ordersByStatus,
        },
        totalOrderValue: orderValueResult[0]?.total || 0,
        paidRevenue: paidRevenueResult[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load dashboard statistics',
    });
  }
};

module.exports = { getDashboardStats };

