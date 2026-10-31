const {
  getWallet,
  createTopUpOrder,
  verifyTopUp,
} = require('./wallet.service');

const getWalletController = async (req, res) => {
  try {
    const data = await getWallet(req.user.userId, req.query);

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error('Get wallet error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load your wallet',
    });
  }
};

const createTopUpController = async (req, res) => {
  try {
    const data = await createTopUpOrder(req.user.userId, req.body?.amount);

    return res.status(201).json({ success: true, ...data });
  } catch (error) {
    console.error('Create top-up error:', error.message);

    return res.status(400).json({
      success: false,
      message: error.message || 'Could not start the top-up',
    });
  }
};

const verifyTopUpController = async (req, res) => {
  try {
    const data = await verifyTopUp(req.user.userId, req.body || {});

    return res.status(200).json({
      success: true,
      message: data.duplicate
        ? 'This payment was already added to your wallet'
        : 'Money added to your wallet',
      ...data,
    });
  } catch (error) {
    console.error('Verify top-up error:', error.message);

    return res.status(400).json({
      success: false,
      message: error.message || 'Payment verification failed',
    });
  }
};

module.exports = {
  getWalletController,
  createTopUpController,
  verifyTopUpController,
};
