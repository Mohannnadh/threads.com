// Labels for an offer, shared by the product page and product cards.

// "20% OFF" or "₹150 OFF".
export const offerBadge = (offer) => {
  if (!offer) return '';

  return offer.type === 'PERCENT'
    ? `${offer.value}% OFF`
    : `₹${Number(offer.value).toLocaleString('en-IN')} OFF`;
};

// Rupees saved on one unit, or 0 when there is no offer.
export const offerSaving = (price, finalPrice) => {
  const saving = Number(price) - Number(finalPrice);

  return saving > 0 ? Math.round(saving * 100) / 100 : 0;
};
