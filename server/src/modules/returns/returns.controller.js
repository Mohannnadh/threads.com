const {
  requestReturn,
  listMyReturns,
  listReturns,
  updateReturnStatus,
} = require('./returns.service');

const sendError = (res, error) => {
  const status = error.message === 'Order not found' ||
    error.message === 'Return request not found'
    ? 404
    : 400;

  return res.status(status).json({
    success: false,
    message: error.message || 'Something went wrong',
  });
};

const requestReturnController = async (req, res) => {
  try {
    const request = await requestReturn(req.user.userId, req.body || {});

    return res.status(201).json({
      success: true,
      message: 'Your request has been received',
      request,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const myReturnsController = async (req, res) => {
  try {
    const requests = await listMyReturns(req.user.userId);

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('List my returns error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load your requests',
    });
  }
};

const adminListReturnsController = async (req, res) => {
  try {
    const data = await listReturns(req.query);

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error('Admin list returns error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load return requests',
    });
  }
};

const adminUpdateReturnController = async (req, res) => {
  try {
    const { status, note } = req.body || {};
    const request = await updateReturnStatus(req.params.id, status, note);

    return res.status(200).json({
      success: true,
      message: 'Request updated',
      request,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  requestReturnController,
  myReturnsController,
  adminListReturnsController,
  adminUpdateReturnController,
};
