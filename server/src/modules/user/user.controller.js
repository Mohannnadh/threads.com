
const User = require('./user.model');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      '-password -otp -otpExpiresAt -otpVerified'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load profile',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty',
        });
      }

      updates.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Email cannot be empty',
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: req.user.userId },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email is already registered',
        });
      }

      updates.email = normalizedEmail;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provide a name or email to update',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    ).select('-password -otp -otpExpiresAt -otpVerified');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('Update profile error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
