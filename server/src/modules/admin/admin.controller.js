
const Product = require('../product/product.model');
const Order = require('../order/order.model');
const Category = require('../product/category.model');
const ReturnRequest = require('../returns/returnRequest.model');
const User = require('../user/user.model');
const {
  escapeRegex,
  parsePagination,
  buildPagination,
  cleanSearch,
} = require('../../utils/pagination');

// Products the shop and product list can show: not in a hidden category.
// The admin totals use the same rule so they match what the lists show.
const visibleProductFilter = async () => {
  const inactive = await Category.find({ isActive: false }).select('name').lean();

  if (inactive.length === 0) return {};

  return {
    $nor: inactive.map((category) => ({
      category: new RegExp(`^${escapeRegex(category.name)}$`, 'i'),
    })),
  };
};

const LOW_STOCK_LIMIT = 5;

// Low stock is checked per colour and size, so one size running low is shown
// even when the product's total is still high. Counts products with at least one.
const getLowStock = async () => {
  const range = { $gt: 0, $lte: LOW_STOCK_LIMIT };

  const products = await Product.find({
    ...(await visibleProductFilter()),
    $or: [{ stock: range }, { variants: { $elemMatch: { stock: range } } }],
  })
    .select('name images stock variants')
    .lean();

  const items = [];

  for (const product of products) {
    const image = product.images?.[0] || '';

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      for (const variant of product.variants) {
        if (variant.stock > 0 && variant.stock <= LOW_STOCK_LIMIT) {
          items.push({
            productId: product._id,
            name: product.name,
            color: variant.color,
            size: variant.size,
            stock: variant.stock,
            image,
          });
        }
      }
    } else if (product.stock > 0 && product.stock <= LOW_STOCK_LIMIT) {
      items.push({ productId: product._id, name: product.name, color: '', size: '', stock: product.stock, image });
    }
  }

  const productsLow = new Set(items.map((item) => String(item.productId)));

  return {
    count: productsLow.size,
    items: items.sort((a, b) => a.stock - b.stock).slice(0, 20),
  };
};

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
      Product.countDocuments(await visibleProductFilter()),
      Product.countDocuments({ ...(await visibleProductFilter()), stock: { $gt: 0 } }),
      getLowStock(),
      Product.countDocuments({ ...(await visibleProductFilter()), stock: 0 }),
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
          lowStock: lowStockProducts.count,
          lowStockItems: lowStockProducts.items,
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

const SALES_RANGES = [7, 30, 90, 365];

// Calendar day in India (YYYY-MM-DD), so days match how the store counts them.
const dayKey = (date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// Revenue and order count per day for the last N days, excluding cancelled orders.
const getSalesSeries = async (req, res) => {
  try {
    const requested = Number(req.query.days);
    const days = SALES_RANGES.includes(requested) ? requested : 30;

    // Midnight in India, (days - 1) days ago, so today is the last bucket.
    const startKey = dayKey(new Date(Date.now() - (days - 1) * 86400000));
    const since = new Date(`${startKey}T00:00:00+05:30`);

    const rows = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, orderStatus: { $ne: 'CANCELLED' } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' },
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
    ]);

    const byDay = new Map(rows.map((row) => [row._id, row]));
    const series = [];

    for (let i = 0; i < days; i += 1) {
      const key = dayKey(new Date(since.getTime() + i * 86400000));
      const row = byDay.get(key);

      series.push({
        date: key,
        revenue: row ? Math.round(row.revenue) : 0,
        orders: row ? row.orders : 0,
      });
    }

    return res.status(200).json({
      success: true,
      days,
      series,
      totalRevenue: series.reduce((sum, day) => sum + day.revenue, 0),
      totalOrders: series.reduce((sum, day) => sum + day.orders, 0),
    });
  } catch (error) {
    console.error('Sales series error:', error);

    return res.status(500).json({ success: false, message: 'Failed to load sales' });
  }
};

// Top products by units sold. Cancelled orders are left out.
const getTopProducts = async (req, res) => {
  try {
    const rows = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'CANCELLED' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $last: '$items.name' },
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { unitsSold: -1, revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    ]);

    const products = rows.map((row) => ({
      _id: row._id,
      name: row.product?.name || row.name || 'Deleted product',
      image: row.product?.images?.[0] || '',
      unitsSold: row.unitsSold,
      revenue: Math.round(row.revenue * 100) / 100,
    }));

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error('Top products error:', error);

    return res.status(500).json({ success: false, message: 'Failed to load top products' });
  }
};

// Dates from the report form: YYYY-MM-DD in India time.
const isDayKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

// Sales report for any date range (inclusive, India time). Cancelled orders are
// left out of sales; refunds are the returns raised in the period.
const getSalesReport = async (req, res) => {
  try {
    const today = dayKey(new Date());
    const to = isDayKey(req.query.to) ? req.query.to : today;
    const from = isDayKey(req.query.from)
      ? req.query.from
      : dayKey(new Date(Date.now() - 29 * 86400000));

    const start = new Date(`${from}T00:00:00+05:30`);
    const end = new Date(`${to}T00:00:00+05:30`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ success: false, message: 'Choose a valid date range' });
    }

    const days = Math.round((end - start) / 86400000) + 1;

    if (days > 366) {
      return res.status(400).json({ success: false, message: 'Choose a range of one year or less' });
    }

    const exclusiveEnd = new Date(end.getTime() + 86400000);
    const inRange = { createdAt: { $gte: start, $lt: exclusiveEnd } };
    const sold = { ...inRange, orderStatus: { $ne: 'CANCELLED' } };

    const [dailyRows, productRows, paymentRows, statusRows, refundRows] = await Promise.all([
      Order.aggregate([
        { $match: sold },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
            orders: { $sum: 1 },
            gross: { $sum: '$totalAmount' },
            discounts: { $sum: { $ifNull: ['$discountAmount', 0] } },
            units: { $sum: { $sum: '$items.quantity' } },
          },
        },
      ]),
      Order.aggregate([
        { $match: sold },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $last: '$items.name' },
            units: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        // Best sellers by units; revenue breaks ties.
        { $sort: { units: -1, revenue: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: sold },
        {
          $group: {
            _id: '$paymentMethod',
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
      ]),
      Order.aggregate([
        { $match: inRange },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      ]),
      ReturnRequest.aggregate([
        { $match: { ...inRange, refundAmountPaise: { $gt: 0 } } },
        { $group: { _id: null, refunds: { $sum: '$refundAmountPaise' }, count: { $sum: 1 } } },
      ]),
    ]);

    const money = (value) => Math.round(Number(value || 0) * 100) / 100;

    // One row per day, including days with no sales.
    const byDay = new Map(dailyRows.map((row) => [row._id, row]));
    const daily = [];

    for (let i = 0; i < days; i += 1) {
      const key = dayKey(new Date(start.getTime() + i * 86400000));
      const row = byDay.get(key);

      daily.push({
        date: key,
        orders: row ? row.orders : 0,
        units: row ? row.units : 0,
        gross: money(row?.gross),
        discounts: money(row?.discounts),
        net: money((row?.gross || 0) - (row?.discounts || 0)),
      });
    }

    const totals = dailyRows.reduce(
      (sum, row) => ({
        orders: sum.orders + row.orders,
        units: sum.units + row.units,
        gross: sum.gross + row.gross,
        discounts: sum.discounts + (row.discounts || 0),
      }),
      { orders: 0, units: 0, gross: 0, discounts: 0 }
    );

    const refunds = money((refundRows[0]?.refunds || 0) / 100);
    const statusCounts = Object.fromEntries(statusRows.map((row) => [row._id, row.count]));

    return res.status(200).json({
      success: true,
      from,
      to,
      summary: {
        orders: totals.orders,
        units: totals.units,
        grossSales: money(totals.gross),
        discounts: money(totals.discounts),
        refunds,
        refundCount: refundRows[0]?.count || 0,
        netSales: money(totals.gross - totals.discounts - refunds),
        averageOrder: totals.orders ? money((totals.gross - totals.discounts) / totals.orders) : 0,
        cancelled: statusCounts.CANCELLED || 0,
      },
      daily,
      topProducts: productRows.map((row) => ({
        _id: row._id,
        name: row.name || 'Deleted product',
        units: row.units,
        revenue: money(row.revenue),
      })),
      byPayment: paymentRows.map((row) => ({
        method: row._id || 'COD',
        orders: row.orders,
        revenue: money(row.revenue),
      })),
      byStatus: statusCounts,
    });
  } catch (error) {
    console.error('Sales report error:', error);

    return res.status(500).json({ success: false, message: 'Failed to build the sales report' });
  }
};

const displayName = (user) =>
  String(user.name || `${user.firstName || ''} ${user.lastName || ''}`).trim() || 'Customer';

// Customers (not admins), newest first, with each customer's order totals.
const listCustomers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 15, maxLimit: 50 });
    const search = cleanSearch(req.query.search);

    const filter = { role: { $ne: 'admin' } };

    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');

      filter.$or = [{ name: pattern }, { firstName: pattern }, { lastName: pattern }, { email: pattern }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .select('name firstName lastName email createdAt addresses isBlocked')
        .lean(),
      User.countDocuments(filter),
    ]);

    const totals = await Order.aggregate([
      { $match: { user: { $in: users.map((user) => user._id) } } },
      {
        $group: {
          _id: '$user',
          orders: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, 1, 0] } },
          spent: { $sum: { $cond: [{ $ne: ['$orderStatus', 'CANCELLED'] }, '$totalAmount', 0] } },
          lastOrder: { $max: '$createdAt' },
        },
      },
    ]);

    const byUser = new Map(totals.map((row) => [String(row._id), row]));

    const customers = users.map((user) => {
      const row = byUser.get(String(user._id));

      return {
        _id: user._id,
        name: displayName(user),
        email: user.email,
        joinedAt: user.createdAt,
        addresses: (user.addresses || []).length,
        isBlocked: Boolean(user.isBlocked),
        orders: row ? row.orders : 0,
        delivered: row ? row.delivered : 0,
        spent: Math.round((row ? row.spent : 0) * 100) / 100,
        lastOrder: row ? row.lastOrder : null,
      };
    });

    return res.status(200).json({
      success: true,
      customers,
      pagination: buildPagination(total, { page, limit }),
    });
  } catch (error) {
    console.error('List customers error:', error);

    return res.status(500).json({ success: false, message: 'Failed to load customers' });
  }
};

// One customer: their details, addresses, order totals and recent orders.
const getCustomer = async (req, res) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: { $ne: 'admin' } })
      .select('name firstName lastName email phone gender dateOfBirth createdAt addresses isBlocked')
      .lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const [orders, totals] = await Promise.all([
      Order.find({ user: customer._id })
        .sort({ createdAt: -1 })
        .limit(25)
        .select('orderStatus paymentMethod paymentStatus totalAmount discountAmount couponCode items createdAt')
        .lean(),
      Order.aggregate([
        { $match: { user: customer._id } },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            delivered: { $sum: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus', 'CANCELLED'] }, 1, 0] } },
            spent: { $sum: { $cond: [{ $ne: ['$orderStatus', 'CANCELLED'] }, '$totalAmount', 0] } },
          },
        },
      ]),
    ]);

    const stats = totals[0] || { orders: 0, delivered: 0, cancelled: 0, spent: 0 };

    return res.status(200).json({
      success: true,
      customer: {
        _id: customer._id,
        name: displayName(customer),
        email: customer.email,
        phone: customer.phone || '',
        gender: customer.gender || '',
        dateOfBirth: customer.dateOfBirth || null,
        joinedAt: customer.createdAt,
        isBlocked: Boolean(customer.isBlocked),
        addresses: customer.addresses || [],
      },
      stats: {
        orders: stats.orders,
        delivered: stats.delivered,
        cancelled: stats.cancelled,
        spent: Math.round(stats.spent * 100) / 100,
      },
      orders,
    });
  } catch (error) {
    console.error('Get customer error:', error);

    return res.status(500).json({ success: false, message: 'Failed to load the customer' });
  }
};

// Blocks or unblocks a customer. Admin accounts cannot be blocked.
const setCustomerBlocked = async (req, res) => {
  try {
    const { blocked } = req.body || {};

    if (typeof blocked !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Say whether the customer is blocked' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $ne: 'admin' } },
      { $set: { isBlocked: blocked } },
      { new: true }
    )
      .select('name email isBlocked')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    return res.status(200).json({
      success: true,
      message: blocked ? 'Customer blocked' : 'Customer unblocked',
      customer: { _id: user._id, isBlocked: user.isBlocked },
    });
  } catch (error) {
    console.error('Block customer error:', error);

    return res.status(500).json({ success: false, message: 'Could not update the customer' });
  }
};

// Admin product list. Searches name, description, category, gender, colour and size,
// and includes products in hidden categories, so the admin can find everything.
const listProductsForAdmin = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const search = cleanSearch(req.query.search);

    const filter = {};

    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');

      filter.$or = [
        { name: pattern },
        { description: pattern },
        { category: pattern },
        { gender: pattern },
        { colors: pattern },
        { sizes: pattern },
        { 'variants.color': pattern },
        { 'variants.size': pattern },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      products,
      pagination: buildPagination(total, { page, limit }),
    });
  } catch (error) {
    console.error('Admin product list error:', error);

    return res.status(500).json({ success: false, message: 'Failed to load products' });
  }
};

module.exports = {
  listProductsForAdmin,
  getDashboardStats,
  getSalesSeries,
  getTopProducts,
  getSalesReport,
  listCustomers,
  getCustomer,
  setCustomerBlocked,
};

