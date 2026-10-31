const Product = require('./product.model');

const clean = (value) => String(value || '').trim();
const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();

// Products with a colour/size list keep stock per colour and size.
// Older products keep one stock figure for the whole product.
const hasVariants = (product) => Array.isArray(product?.variants) && product.variants.length > 0;

const findVariant = (product, color, size) =>
  (product?.variants || []).find((variant) => same(variant.color, color) && same(variant.size, size)) || null;

// How many units a customer can buy for this colour and size.
const availableFor = (product, color, size) => {
  if (!hasVariants(product)) return Number(product?.stock) || 0;

  const variant = findVariant(product, color, size);

  return variant ? Number(variant.stock) || 0 : 0;
};

// Takes stock for one line. Returns true only when the stock was taken.
const reserveStock = async ({ productId, color, size, quantity }) => {
  const product = await Product.findById(productId).select('variants stock').lean();

  if (!product) return false;

  if (!hasVariants(product)) {
    const result = await Product.updateOne(
      { _id: productId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } }
    );

    return result.modifiedCount === 1;
  }

  const variant = findVariant(product, color, size);

  if (!variant) return false;

  const result = await Product.updateOne(
    {
      _id: productId,
      variants: { $elemMatch: { color: variant.color, size: variant.size, stock: { $gte: quantity } } },
    },
    { $inc: { 'variants.$.stock': -quantity, stock: -quantity } }
  );

  return result.modifiedCount === 1;
};

// Puts stock back for one line (cancelled order, returned item, failed order).
const restoreStock = async ({ productId, color, size, quantity }) => {
  const product = await Product.findById(productId).select('variants').lean();

  if (!product) return false;

  if (!hasVariants(product)) {
    await Product.updateOne({ _id: productId }, { $inc: { stock: quantity } });
    return true;
  }

  const variant = findVariant(product, color, size);

  if (!variant) return false;

  await Product.updateOne(
    { _id: productId, variants: { $elemMatch: { color: variant.color, size: variant.size } } },
    { $inc: { 'variants.$.stock': quantity, stock: quantity } }
  );

  return true;
};

// Checks and normalises the colour/size list sent by the admin form. Returns the
// product fields derived from it: colours, sizes, the lowest price and total stock.
const applyVariants = (data) => {
  if (!Array.isArray(data.variants) || data.variants.length === 0) return data;

  const seen = new Set();
  const variants = [];

  for (const raw of data.variants) {
    const color = clean(raw?.color);
    const size = clean(raw?.size);
    const price = Number(raw?.price);
    const stock = Number(raw?.stock);

    if (!color) throw new Error('Every colour option needs a name');
    if (!size) throw new Error(`Give every size under ${color} a name`);
    if (!Number.isFinite(price) || price < 0) throw new Error(`Enter a valid price for ${color} / ${size}`);
    if (!Number.isInteger(stock) || stock < 0) throw new Error(`Enter a whole-number quantity for ${color} / ${size}`);

    const key = `${color.toLowerCase()}|${size.toLowerCase()}`;

    if (seen.has(key)) throw new Error(`${color} / ${size} is listed more than once`);

    seen.add(key);
    variants.push({ color, size, price: Math.round(price * 100) / 100, stock });
  }

  return {
    ...data,
    variants,
    colors: [...new Set(variants.map((variant) => variant.color))],
    sizes: [...new Set(variants.map((variant) => variant.size))],
    price: Math.min(...variants.map((variant) => variant.price)),
    stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
  };
};

module.exports = {
  hasVariants,
  findVariant,
  availableFor,
  reserveStock,
  restoreStock,
  applyVariants,
};
