const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const {
  adminListOffersController,
  adminCreateOfferController,
  adminUpdateOfferController,
  adminSetOfferStatusController,
  adminDeleteOfferController,
} = require('./offer.controller');

// Offers are shown inside product responses, so only admin routes live here.
const router = express.Router();
const adminOnly = [authMiddleware, roleMiddleware('admin')];

router.get('/admin', ...adminOnly, adminListOffersController);
router.post('/', ...adminOnly, adminCreateOfferController);
router.patch('/:id', ...adminOnly, adminUpdateOfferController);
router.patch('/:id/status', ...adminOnly, adminSetOfferStatusController);
router.delete('/:id', ...adminOnly, adminDeleteOfferController);

module.exports = router;
