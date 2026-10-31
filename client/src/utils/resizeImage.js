// Crops an image to a centred square and scales it down, returning a JPEG
// data URL. Keeps profile photos small enough to store with the user.
const MAX_OUTPUT_LENGTH = 300000;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read this image.'));
    img.src = src;
  });

export const resizeImageToDataUrl = async (file, size = 256) => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(objectUrl);

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');

    // White backdrop so transparent PNGs don't turn black as JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    let dataUrl = canvas.toDataURL('image/jpeg', 0.86);

    if (dataUrl.length > MAX_OUTPUT_LENGTH) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    }

    if (dataUrl.length > MAX_OUTPUT_LENGTH) {
      throw new Error('This image is too detailed. Please choose a simpler one.');
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
