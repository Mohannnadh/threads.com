  const { validateRegisterInput,validatePassword} = require('./auth.validation');
  const {
  registerUser,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
} = require('./auth.service');

  const register = async (req, res) => {
    try {
      const errors = validateRegisterInput(req.body);

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          errors,
        });
      }

      const user = await registerUser(req.body);

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        user,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };
  const login = async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      const result = await loginUser({ email, password });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        ...result,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  };
  const forgotPasswordController = async (req, res) => {
  try {
    console.log('FORGOT PASSWORD REQUEST:', req.body);

    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    


    await forgotPassword(email.trim().toLowerCase());

    // console.log('11112345678')

    return res.status(200).json({
      success: true,
      message: 'If the email is registered, a password reset OTP has been sent',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Unable to process password reset request',
    });
  }
};
const verifyOtpController = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    await verifyOtp(email.trim().toLowerCase(), otp.trim());

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const resetPasswordController = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required',
      });
    }

    const passwordError = validatePassword(newPassword);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    await resetPassword(
      email.trim().toLowerCase(),
      newPassword
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const changePasswordController = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // 1. Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required',
      });
    }

    // 2. Check the new password format
    const passwordError = validatePassword(newPassword);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    // 3. Check password confirmation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match',
      });
    }

    // 4. Change password for the authenticated user
    await changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Change password error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
};

module.exports = {
  register,
  login,
  forgotPasswordController,
  verifyOtpController,
  resetPasswordController,
  changePasswordController,
  
};
