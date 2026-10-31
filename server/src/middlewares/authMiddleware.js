const jwt = require('jsonwebtoken');
const User = require('../modules/user/user.model');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authHeader.split(' ')[1];

    req.user = jwt.verify(token, process.env.JWT_SECRET);

    // A blocked or deleted account loses access straight away, even with a valid token.
    const account = await User.findById(req.user.userId).select('isBlocked').lean();

    if (!account) {
      return res.status(401).json({ success: false, message: 'Account not found' });
    }

    if (account.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'This account has been blocked. Please contact the store.',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

module.exports = authMiddleware;
