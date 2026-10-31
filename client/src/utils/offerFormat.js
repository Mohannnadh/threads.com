// Works out the discount to show on a product from its original and offer price.
// Returns null when the product has no active discount.
export const getDiscount = (product) => {
  const price = Number(product?.price);
  const finalPrice = Number(product?.finalPrice);

  if (!product?.offer || !Number.isFinite(price) || !Number.isFinite(finalPrice) || finalPrice >= price) {
    return null;
  }

  const amountOff = Math.round((price - finalPrice) * 100) / 100;
  const percentOff =
    product.offer.type === 'PERCENT'
      ? Number(product.offer.value)
      : Math.max(1, Math.round((amountOff / price) * 100));

  return {
    amountOff,
    percentOff: Number.isInteger(percentOff) ? percentOff : Math.round(percentOff * 10) / 10,
    isPercentOffer: product.offer.type === 'PERCENT',
  };
};

export const formatRupees = (value) => `₹${Number(value).toLocaleString('en-IN')}`;
