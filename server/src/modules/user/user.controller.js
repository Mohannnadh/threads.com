
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
    const { firstName, lastName, gender, dateOfBirth, email } = req.body;

    // The admin display name is fixed as ThreadsAdmin.
    if (req.user.role === 'admin' && (firstName !== undefined || lastName !== undefined)) {
      return res.status(400).json({
        success: false,
        message: 'The admin name is fixed and cannot be changed',
      });
    }
    
    const updates = {};

    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || !firstName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'First name cannot be empty',
        });
      }

      updates.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (typeof lastName !== 'string' || !lastName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Last name cannot be empty',
        });
      }

      updates.lastName = lastName.trim();
    }

    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      const currentUser = await User.findById(req.user.userId).select(
        'firstName lastName name'
      );

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const finalFirstName =
        updates.firstName ?? currentUser.firstName ?? '';
      const finalLastName =
        updates.lastName ?? currentUser.lastName ?? '';

      updates.name = `${finalFirstName} ${finalLastName}`.trim();
    }

   if (gender !== undefined) {
  if (
    typeof gender !== 'string' ||
    !['male', 'female', 'other', ''].includes(gender)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid gender value',
    });
  }

  updates.gender = gender;
}

    if (dateOfBirth !== undefined) {
      if (dateOfBirth === null || dateOfBirth === '') {
        updates.dateOfBirth = null;
      } else {
        const parsedDate = new Date(dateOfBirth);

        if (
          Number.isNaN(parsedDate.getTime()) ||
          parsedDate > new Date()
        ) {
          return res.status(400).json({
            success: false,
            message: 'Please provide a valid date of birth',
          });
        }

        updates.dateOfBirth = parsedDate;
      }
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Email cannot be empty',
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address',
        });
      }

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
        message: 'Provide profile fields to update',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true }
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

const deleteProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    console.error('Delete profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete profile',
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  deleteProfile,
};
