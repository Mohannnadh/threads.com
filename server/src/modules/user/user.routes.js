const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const {
  getProfile,
  updateProfile,
  deleteProfile,
} = require('./user.controller');
const {
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  updateAvatar,
  removeAvatar,
} = require('./address.controller');

const router = express.Router();

router.get('/profile', authMiddleware, getProfile);
router.patch('/profile', authMiddleware, updateProfile);
router.delete('/profile', authMiddleware, deleteProfile);

router.post('/addresses', authMiddleware, addAddress);
router.patch('/addresses/:addressId', authMiddleware, updateAddress);
router.patch(
  '/addresses/:addressId/default',
  authMiddleware,
  setDefaultAddress
);
router.delete('/addresses/:addressId', authMiddleware, deleteAddress);

router.patch('/avatar', authMiddleware, updateAvatar);
router.delete('/avatar', authMiddleware, removeAvatar);

module.exports = router;
