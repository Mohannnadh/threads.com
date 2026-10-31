// Stock and price for one colour and size of a product, from the server's data.
// A product without a colour and size list uses its single stock and price.

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

const hasList = (product) => Array.isArray(product?.variants) && product.variants.length > 0;

// Units left for this colour and size. Products without a list use their total.
export const stockFor = (product, color, size) => {
  if (!hasList(product)) return Number(product?.stock) || 0;

  const variant = product.variants.find((item) => same(item.color, color) && same(item.size, size));

  return variant ? Number(variant.stock) || 0 : 0;
};

// Units left in total, for the wishlist, which has no colour or size.
export const totalStock = (product) =>
  hasList(product)
    ? product.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)
    : Number(product?.stock) || 0;

// Price the customer pays for this colour and size, after offers.
export const priceFor = (product, color, size) => {
  if (hasList(product)) {
    const variant = product.variants.find((item) => same(item.color, color) && same(item.size, size));

    if (variant) return Number(variant.finalPrice ?? variant.price);
  }

  return Number(product?.finalPrice ?? product?.price) || 0;
};

// Sizes that are running low (1 to 5 units). Products without a list have none.
export const lowStockSizes = (product) =>
  hasList(product)
    ? product.variants.filter((variant) => Number(variant.stock) > 0 && Number(variant.stock) <= 5)
    : [];
