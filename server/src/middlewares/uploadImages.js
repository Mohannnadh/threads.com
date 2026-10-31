const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Images are saved under server/uploads/products and served at /uploads/products.
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'products');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 6;

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  // Random names avoid clashes and hide the original file name.
  filename: (req, file, cb) =>
    cb(null, `${crypto.randomUUID()}${EXTENSIONS[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) return cb(null, true);

    return cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'));
  },
});

// Runs the upload and turns multer errors into JSON responses.
const uploadProductImages = (req, res, next) => {
  upload.array('images', MAX_FILES)(req, res, (error) => {
    if (!error) return next();

    let message = error.message;

    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'Each image must be 5 MB or smaller';
    } else if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Upload up to ${MAX_FILES} images at a time`;
    }

    return res.status(400).json({ success: false, message });
  });
};

module.exports = { uploadProductImages };
