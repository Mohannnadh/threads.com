
const express = require('express');

const {
  register,
  login,
  forgotPasswordController,
  verifyOtpController,
  resetPasswordController,
  changePasswordController,
} = require('./auth.controller');

const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPasswordController);
router.post('/reset-password', resetPasswordController);
router.post('/verify-otp', verifyOtpController);


// Change password — requires a valid JWT
router.patch('/change-password', authMiddleware, changePasswordController);

module.exports = router;
