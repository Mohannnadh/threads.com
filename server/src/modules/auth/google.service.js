
const { OAuth2Client } = require('google-auth-library');
const User = require('../user/user.model');
const { generateToken } = require('../../utils/jwt');

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// Verify Google's ID token
const verifyGoogleCredential = async (credential) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Google sign-in is not configured');
  }

  if (!credential) {
    throw new Error('Google credential is required');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload || !payload.email || !payload.sub) {
    throw new Error('Invalid Google account information');
  }

  if (payload.email_verified !== true) {
    throw new Error('Google email is not verified');
  }

  return {
    googleId: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
  };
};

// Login or register using Google
const googleLogin = async (credential) => {
  const profile = await verifyGoogleCredential(credential);

  let user = await User.findOne({
    $or: [
      { googleId: profile.googleId },
      { email: profile.email },
    ],
  });

  if (user) {
    const normalizedRole =
      typeof user.role === 'string' ? user.role.trim() : user.role;
    const roleNeedsSave = normalizedRole !== user.role;
    user.role = normalizedRole;

    if (user.role === 'admin') {
      throw new Error('Admins must use email and password');
    }

    if (user.isBlocked) {
      throw new Error(
        'This account has been blocked. Please contact the store.'
      );
    }

    if (user.googleId && user.googleId !== profile.googleId) {
      throw new Error(
        'This email is linked to a different Google account'
      );
    }

    if (!user.googleId || roleNeedsSave) {
      if (!user.googleId) {
        user.googleId = profile.googleId;
      }

      await user.save();
    }
  } else {
    user = await User.create({
      name: profile.name,
      email: profile.email,
      googleId: profile.googleId,
      role: 'customer',
    });
  }

  return {
    token: generateToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

module.exports = {
  googleLogin,
};
