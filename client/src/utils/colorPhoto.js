// The photo the admin set for a colour, or '' when there is none.
export const colorPhotoFor = (product, color) => {
  const wanted = String(color || '').trim().toLowerCase();

  if (!wanted || !Array.isArray(product?.colorImages)) return '';

  const entry = product.colorImages.find(
    (item) => item?.color && String(item.color).trim().toLowerCase() === wanted
  );

  return typeof entry?.image === 'string' ? entry.image.trim() : '';
};
