const {
  listOffers,
  createOffer,
  updateOffer,
  setOfferStatus,
  deleteOffer,
} = require('./offer.service');

const sendError = (res, error) => {
  const status = error.message === 'Offer not found' ? 404 : 400;

  return res.status(status).json({ success: false, message: error.message });
};

const adminListOffersController = async (req, res) => {
  try {
    const data = await listOffers(req.query);

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error('List offers error:', error);

    return res.status(500).json({ success: false, message: 'Failed to load offers' });
  }
};

const adminCreateOfferController = async (req, res) => {
  try {
    const offer = await createOffer(req.body || {});

    return res.status(201).json({ success: true, message: 'Offer created', offer });
  } catch (error) {
    return sendError(res, error);
  }
};

const adminUpdateOfferController = async (req, res) => {
  try {
    const offer = await updateOffer(req.params.id, req.body || {});

    return res.status(200).json({ success: true, message: 'Offer updated', offer });
  } catch (error) {
    return sendError(res, error);
  }
};

const adminSetOfferStatusController = async (req, res) => {
  try {
    const offer = await setOfferStatus(req.params.id, req.body?.isActive);

    return res.status(200).json({
      success: true,
      message: offer.isActive ? 'Offer activated' : 'Offer deactivated',
      offer,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const adminDeleteOfferController = async (req, res) => {
  try {
    await deleteOffer(req.params.id);

    return res.status(200).json({ success: true, message: 'Offer deleted' });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  adminListOffersController,
  adminCreateOfferController,
  adminUpdateOfferController,
  adminSetOfferStatusController,
  adminDeleteOfferController,
};
