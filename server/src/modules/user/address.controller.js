const mongoose = require('mongoose');
const User = require('./user.model');

const MAX_ADDRESSES = 10;
const MAX_AVATAR_LENGTH = 300000; // ~225 KB of base64 image data

const FIELDS = [
  'label',
  'name',
  'phone',
  'addressLine',
  'city',
  'state',
  'postalCode',
  'country',
];

const REQUIRED_FIELDS = [
  'name',
  'phone',
  'addressLine',
  'city',
  'state',
  'postalCode',
  'country',
];

const LABELS = ['Home', 'Work', 'Other'];

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

// Returns an error message string, or null when the input is valid.
// Also returns a cleaned copy of the allowed fields through `clean`.
const validateAddressInput = (body, { partial = false } = {}) => {
  const clean = {};

  for (const field of FIELDS) {
    if (body[field] === undefined) {
      continue;
    }

    if (typeof body[field] !== 'string') {
      return { error: `Invalid value for ${field}` };
    }

    clean[field] = body[field].trim();
  }

  if (!partial) {
    for (const field of REQUIRED_FIELDS) {
      if (!clean[field]) {
        return { error: 'Please complete all required address fields' };
      }
    }
  }

  if (clean.label !== undefined && !LABELS.includes(clean.label)) {
    clean.label = 'Home';
  }

  if (clean.label === undefined && !partial) {
    clean.label = 'Home';
  }

  if (clean.phone !== undefined) {
    const digits = clean.phone.replace(/[\s-]/g, '');

    if (!/^\+?\d{7,15}$/.test(digits)) {
      return { error: 'Please provide a valid phone number' };
    }

    clean.phone = digits;
  }

  if (clean.postalCode !== undefined) {
    if (!/^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/.test(clean.postalCode)) {
      return { error: 'Please provide a valid postal code' };
    }
  }

  return { clean };
};

// Keep exactly one default address. Callers pass the id that should be default.
const applyDefault = (user, defaultId) => {
  user.addresses.forEach((address) => {
    address.isDefault = String(address._id) === String(defaultId);
  });
};

// GET is handled by getProfile (addresses are included in the profile).

// POST /api/users/addresses
const addAddress = async (req, res) => {
  try {
    const { clean, error } = validateAddressInput(req.body);

    if (error) {
      return sendError(res, 400, error);
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (user.addresses.length >= MAX_ADDRESSES) {
      return sendError(
        res,
        400,
        `You can save up to ${MAX_ADDRESSES} addresses`
      );
    }

    user.addresses.push({ ...clean, isDefault: false });

    const created = user.addresses[user.addresses.length - 1];

    // The first address (or one explicitly requested) becomes the default.
    const wantsDefault = req.body.isDefault === true;

    if (user.addresses.length === 1 || wantsDefault) {
      applyDefault(user, created._id);
    }

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Address added',
      addresses: user.addresses,
    });
  } catch (error) {
    console.error('Add address error:', error);
    return sendError(res, 500, 'Failed to add address');
  }
};

// PATCH /api/users/addresses/:addressId
const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.isValidObjectId(addressId)) {
      return sendError(res, 400, 'Invalid address id');
    }

    const { clean, error } = validateAddressInput(req.body, {
      partial: true,
    });

    if (error) {
      return sendError(res, 400, error);
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return sendError(res, 404, 'Address not found');
    }

    // Validate the merged result so a partial update can't blank a required field.
    const merged = { ...address.toObject(), ...clean };

    for (const field of REQUIRED_FIELDS) {
      if (!merged[field]) {
        return sendError(
          res,
          400,
          'Please complete all required address fields'
        );
      }
    }

    Object.assign(address, clean);

    if (req.body.isDefault === true) {
      applyDefault(user, address._id);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Address updated',
      addresses: user.addresses,
    });
  } catch (error) {
    console.error('Update address error:', error);
    return sendError(res, 500, 'Failed to update address');
  }
};

// PATCH /api/users/addresses/:addressId/default
const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.isValidObjectId(addressId)) {
      return sendError(res, 400, 'Invalid address id');
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (!user.addresses.id(addressId)) {
      return sendError(res, 404, 'Address not found');
    }

    applyDefault(user, addressId);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Default address updated',
      addresses: user.addresses,
    });
  } catch (error) {
    console.error('Set default address error:', error);
    return sendError(res, 500, 'Failed to set default address');
  }
};

// DELETE /api/users/addresses/:addressId
const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.isValidObjectId(addressId)) {
      return sendError(res, 400, 'Invalid address id');
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return sendError(res, 404, 'Address not found');
    }

    const wasDefault = address.isDefault;

    user.addresses.pull(addressId);

    // If the default was removed, promote the most recently added address.
    if (wasDefault && user.addresses.length > 0) {
      applyDefault(user, user.addresses[user.addresses.length - 1]._id);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Address deleted',
      addresses: user.addresses,
    });
  } catch (error) {
    console.error('Delete address error:', error);
    return sendError(res, 500, 'Failed to delete address');
  }
};

// PATCH /api/users/avatar   body: { avatar: "data:image/...;base64,..." }
// DELETE /api/users/avatar  removes the photo
const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;

    if (
      typeof avatar !== 'string' ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)
    ) {
      return sendError(res, 400, 'Please upload a JPG, PNG or WebP image');
    }

    if (avatar.length > MAX_AVATAR_LENGTH) {
      return sendError(res, 400, 'Image is too large. Please choose a smaller one');
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { avatar } },
      { returnDocument: 'after' }
    ).select('avatar');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Profile photo updated',
      avatar: user.avatar,
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    return sendError(res, 500, 'Failed to update profile photo');
  }
};

const removeAvatar = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user.userId },
      { $set: { avatar: '' } }
    );

    return res.status(200).json({
      success: true,
      message: 'Profile photo removed',
      avatar: '',
    });
  } catch (error) {
    console.error('Remove avatar error:', error);
    return sendError(res, 500, 'Failed to remove profile photo');
  }
};

module.exports = {
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  updateAvatar,
  removeAvatar,
};
