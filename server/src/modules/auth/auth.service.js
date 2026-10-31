const bcrypt = require('bcrypt');
const User = require('../user/user.model');
const { generateToken } = require('../../utils/jwt');
const { generateOtp, getOtpExpiry } = require('../../utils/otp');
const { sendOtpEmail } = require('../../utils/email');


const MAX_OTP_ATTEMPTS = 5;

const registerUser = async ({ name, email, password }) => {
  // 1. Check if email already exists
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error('Email is already registered');
  }

  // 2. Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Create the user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  // 4. Never return the password
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};
const loginUser = async ({ email, password }) => {
  // 1. Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // 2. Compare password with stored hash
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Checked after the password, so a blocked account is not revealed to anyone else.
  if (user.isBlocked) {
    throw new Error('This account has been blocked. Please contact the store.');
  }

  // 3. Generate JWTF
  const token = generateToken(user);

  // 4. Return safe user data
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};
const forgotPassword = async (email) => {

  try {
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error('Unable to process password reset request');
    }

    const otp = generateOtp();
    const otpExpiresAt = getOtpExpiry();

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    user.otpVerified = false;
    user.otpAttempts = 0;

    await user.save();


    await sendOtpEmail(user.email, otp);

    return {
      email: user.email,
    };
  }  catch (error) {
  console.error('Forgot password error:', error);
  throw error;
  }

};
const verifyOtp = async (email, otp) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('Invalid OTP');
  }

  if (!user.otp || !user.otpExpiresAt) {
    throw new Error('Invalid OTP');
  }

  if (user.otpExpiresAt < new Date()) {
    throw new Error('OTP has expired');
  }

  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    throw new Error('Too many incorrect attempts. Please request a new OTP.');
  }

  if (user.otp !== otp) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();
    throw new Error('Invalid OTP');
  }

  user.otpVerified = true;
  user.otpAttempts = 0;

  await user.save();

  return {
    email: user.email,
  };
};
const resetPassword = async (email, newPassword) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('Unable to reset password');
  }

  if (!user.otpVerified) {
    throw new Error('OTP verification required');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;

  user.otp = null;
  user.otpExpiresAt = null;
  user.otpVerified = false;

  await user.save();

  return {
    email: user.email,
  };
};

// Same credential check as loginUser, but only accounts with the admin role
// receive a token.
const loginAdmin = async ({ email, password }) => {
  const result = await loginUser({ email, password });

  if (result.user.role !== 'admin') {
    throw new Error('This account does not have admin access');
  }

  return result;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  // 1. Find the logged-in user
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // 2. Verify the current password
  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    user.password
  );

  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // 3. Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 4. Save the new password
  user.password = hashedPassword;
  await user.save();

  return {
    message: 'Password changed successfully',
  };
};


module.exports = {
  registerUser,
  loginUser,
  loginAdmin,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
};




