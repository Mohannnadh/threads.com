
const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const { getProfile, updateProfile } = require('./user.controller');

const router = express.Router();

router.get('/profile', authMiddleware, getProfile);
router.patch('/profile', authMiddleware, updateProfile);

module.exports = router;
