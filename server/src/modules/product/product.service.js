const mongoose = require('mongoose');
const Product = require('./product.model');
const Category = require('./category.model');
const { applyOffers } = require('../offer/offer.service');
const { applyVariants } = require('./stock.service');

// Products in inactive categories are hidden from the shop.
const inactiveCategoryFilter = async () => {
  const inactive = await Category.find({ isActive: false }).select('name').lean();

  if (inactive.length === 0) return {};

  return {
    $nor: inactive.map((category) => ({
      category: new RegExp(`^${escapeRegex(category.name)}$`, 'i'),
    })),
  };
};

// Stored trimmed and lowercase so "T-Shirts" and "t-shirts" are the same category.
const normalizeCategory = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const createProduct = async (productData) => {
  const product = await Product.create({
    ...applyVariants(productData),
    category: normalizeCategory(productData.category),
  });

  return product;
};

const { escapeRegex } = require('../../utils/pagination');

const GENDERS = ['men', 'women', 'unisex'];

const SORT_OPTIONS = {
  recent: { createdAt: -1, _id: -1 },
  'low-high': { price: 1, _id: 1 },
  'high-low': { price: -1, _id: -1 },
};

// One page of products with optional search, gender, category and sort.
const getProductsPage = async ({
  skip,
  limit,
  search,
  gender,
  category,
  sort,
  minPrice,
  maxPrice,
  featured,
}) => {
  const filter = {};

  if (featured) {
    filter.isFeatured = true;
  }

  Object.assign(filter, await inactiveCategoryFilter());

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');

    filter.$or = [
      { name: pattern },
      { description: pattern },
      { category: pattern },
    ];
  }

  if (GENDERS.includes(gender)) {
    filter.gender = gender;
  }

  // Price range in rupees. A reversed range is swapped rather than returning nothing.
  let low = minPrice ?? null;
  let high = maxPrice ?? null;

  if (low !== null && high !== null && low > high) {
    [low, high] = [high, low];
  }

  if (low !== null || high !== null) {
    filter.price = {};

    if (low !== null) filter.price.$gte = low;
    if (high !== null) filter.price.$lte = high;
  }

  if (category) {
    filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(SORT_OPTIONS[sort] || SORT_OPTIONS.recent)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  // Adds finalPrice and offer so the shop shows the discounted price.
  return { products: await applyOffers(products), total };
};

// Distinct category names, used to fill the category filter.
const getProductCategories = async () => {
  const categories = await Product.distinct('category', await inactiveCategoryFilter());

  return categories
    .map((category) => String(category).trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
};

const getProductById = async (productId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error('Product not found');
  }

  const [priced] = await applyOffers([product]);

  return priced;
};

const updateProduct = async (productId, rawData) => {
  const productData = applyVariants(rawData);

  const product = await Product.findByIdAndUpdate(
    productId,
    productData.category !== undefined
      ? { ...productData, category: normalizeCategory(productData.category) }
      : productData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!product) {
    throw new Error('Product not found');
  }

  return product;
};

const deleteProduct = async (productId) => {
  const product = await Product.findByIdAndDelete(productId);

  if (!product) {
    throw new Error('Product not found');
  }

  return product;
};

// Deletes a category. Its products move to another category first, so a category
// with no products needs no target. Matching ignores case.
const moveCategoryProducts = async (fromName, toName) => {
  const from = normalizeCategory(fromName);
  const to = normalizeCategory(toName);

  if (!from) {
    throw new Error('Choose the category to delete');
  }

  const filter = { category: new RegExp(`^${escapeRegex(from)}$`, 'i') };
  const hasProducts = await Product.exists(filter);
  let moved = 0;

  if (hasProducts) {
    if (!to) {
      throw new Error('Choose a category to move its products to');
    }

    if (from === to) {
      throw new Error('Choose a different category to move the products to');
    }

    const result = await Product.updateMany(filter, { $set: { category: to } });
    moved = result.modifiedCount;
  }

  // The category record is removed; the products are already moved.
  await Category.deleteOne({ name: from });

  return moved;
};

// Admin: create a category that can be chosen before any product uses it.
const createCategory = async (rawName) => {
  const name = normalizeCategory(rawName);

  if (!name) {
    throw new Error('Enter a category name');
  }

  if (name.length > 40) {
    throw new Error('Category names can be at most 40 characters');
  }

  const inUse = await Product.exists({ category: new RegExp(`^${escapeRegex(name)}$`, 'i') });

  if (inUse) {
    throw new Error('That category already exists');
  }

  try {
    return await Category.create({ name });
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('That category already exists');
    }

    throw error;
  }
};


// Admin: rename a category. Its products take the new name and it keeps its active setting.
const renameCategory = async (rawName, rawNewName) => {
  const from = normalizeCategory(rawName);
  const to = normalizeCategory(rawNewName);

  if (!from) {
    throw new Error('Choose the category to rename');
  }

  if (!to) {
    throw new Error('Enter a new name');
  }

  if (to.length > 40) {
    throw new Error('Category names can be at most 40 characters');
  }

  if (from === to) {
    throw new Error('Enter a different name');
  }

  const fromFilter = { category: new RegExp(`^${escapeRegex(from)}$`, 'i') };
  const toFilter = { category: new RegExp(`^${escapeRegex(to)}$`, 'i') };

  const [record, hasProducts, targetInUse, targetRecord] = await Promise.all([
    Category.findOne({ name: from }).lean(),
    Product.exists(fromFilter),
    Product.exists(toFilter),
    Category.exists({ name: to }),
  ]);

  if (!record && !hasProducts) {
    throw new Error('Category not found');
  }

  if (targetInUse || targetRecord) {
    throw new Error('That category already exists');
  }

  let moved = 0;

  if (hasProducts) {
    const result = await Product.updateMany(fromFilter, { $set: { category: to } });
    moved = result.modifiedCount;
  }

  await Category.deleteOne({ name: from });
  await Category.updateOne(
    { name: to },
    { $set: { name: to, isActive: record ? record.isActive !== false : true } },
    { upsert: true }
  );

  return { name: to, moved };
};

// Admin: show or hide a category in the shop. Products are not changed.
const setCategoryStatus = async (rawName, isActive) => {
  const name = normalizeCategory(rawName);

  if (!name) {
    throw new Error('Choose a category');
  }

  if (typeof isActive !== 'boolean') {
    throw new Error('Set the category to active or inactive');
  }

  await Category.updateOne({ name }, { $set: { name, isActive } }, { upsert: true });

  return { name, isActive };
};

// Each category with its product count and a picture from one of its products.
const getCategorySummary = async () => {
  const rows = await Product.aggregate([
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $group: {
        _id: { $toLower: { $trim: { input: '$category' } } },
        count: { $sum: 1 },
        image: { $first: { $arrayElemAt: ['$images', 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Category records hold the active flag. Categories without a record are active.
  const records = await Category.find().select('name isActive').lean();
  const flags = new Map(
    records.map((record) => [normalizeCategory(record.name), record.isActive !== false])
  );

  const byName = new Map(
    rows
      .filter((row) => row._id)
      .map((row) => [
        row._id,
        { name: row._id, count: row.count, image: row.image || null, isActive: flags.get(row._id) ?? true },
      ])
  );

  // Add categories that were created but have no products yet.
  for (const record of records) {
    const key = normalizeCategory(record.name);

    if (key && !byName.has(key)) {
      byName.set(key, { name: key, count: 0, image: null, isActive: record.isActive !== false });
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
};

// Current details for products already in a cart or wishlist. Products that were
// deleted, or are in a hidden category, are not returned.
const lookupProducts = async (ids) => {
  const valid = [...new Set((Array.isArray(ids) ? ids : []).map(String))]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .slice(0, 100);

  if (valid.length === 0) return [];

  const products = await Product.find({
    _id: { $in: valid },
    ...(await inactiveCategoryFilter()),
  }).lean();

  return applyOffers(products);
};

module.exports = {
  lookupProducts,
  createProduct,
  getCategorySummary,
  moveCategoryProducts,
  createCategory,
  setCategoryStatus,
  renameCategory,
  getProductsPage,
  getProductCategories,
  getProductById,
  updateProduct,
  deleteProduct,
};