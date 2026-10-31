import { useState } from 'react';
import { Icon } from './Icon.jsx';
import {
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from '../services/userService.js';

export const MAX_ADDRESSES = 10;

const LABEL_OPTIONS = ['Home', 'Work', 'Other'];

const EMPTY_ADDRESS = {
  label: 'Home',
  name: '',
  phone: '',
  addressLine: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: false,
};

const FIELDS = [
  { name: 'name', label: 'Full name', autoComplete: 'name', maxLength: 80 },
  { name: 'phone', label: 'Phone number', autoComplete: 'tel', maxLength: 20 },
  { name: 'addressLine', label: 'Street address', autoComplete: 'street-address', maxLength: 200, wide: true },
  { name: 'city', label: 'City', autoComplete: 'address-level2', maxLength: 80 },
  { name: 'state', label: 'State', autoComplete: 'address-level1', maxLength: 80 },
  { name: 'postalCode', label: 'Postal code', autoComplete: 'postal-code', maxLength: 10 },
  { name: 'country', label: 'Country', autoComplete: 'country-name', maxLength: 80 },
];

// Mirrors the server rules so most mistakes are caught before a request.
const validate = (address) => {
  const required = FIELDS.map((field) => field.name);

  for (const field of required) {
    if (!address[field] || !address[field].trim()) {
      return 'Please fill in all the required fields.';
    }
  }

  const digits = address.phone.trim().replace(/[\s-]/g, '');
  if (!/^\+?\d{7,15}$/.test(digits)) {
    return 'Please enter a valid phone number.';
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/.test(address.postalCode.trim())) {
    return 'Please enter a valid postal code.';
  }

  return '';
};

const pickAddressFields = (address) => ({
  label: address.label,
  name: address.name,
  phone: address.phone,
  addressLine: address.addressLine,
  city: address.city,
  state: address.state,
  postalCode: address.postalCode,
  country: address.country,
  isDefault: Boolean(address.isDefault),
});

const AddressBook = ({ addresses, onChange }) => {
  // null = closed, 'new' = adding, otherwise the id of the address being edited.
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [busyId, setBusyId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const atLimit = addresses.length >= MAX_ADDRESSES;
  const formOpen = editingId !== null;
  const editingDefault =
    editingId !== null &&
    editingId !== 'new' &&
    addresses.find((a) => a._id === editingId)?.isDefault;

  // The first address is always the default, so the checkbox is locked on.
  const defaultLocked = editingId === 'new'
    ? addresses.length === 0
    : Boolean(editingDefault);

  const openNew = () => {
    setMessage({ type: '', text: '' });
    setFormError('');
    setConfirmDeleteId(null);
    setForm({ ...EMPTY_ADDRESS, isDefault: addresses.length === 0 });
    setEditingId('new');
  };

  const openEdit = (address) => {
    setMessage({ type: '', text: '' });
    setFormError('');
    setConfirmDeleteId(null);
    setForm(pickAddressFields(address));
    setEditingId(address._id);
  };

  const closeForm = () => {
    setEditingId(null);
    setFormError('');
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const validationError = validate(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      postalCode: form.postalCode.trim(),
      country: form.country.trim(),
    };

    setSaving(true);
    setFormError('');

    try {
      const response =
        editingId === 'new'
          ? await addAddress(payload)
          : await updateAddress(editingId, payload);

      onChange(response.addresses);
      setEditingId(null);
      setMessage({
        type: 'success',
        text: editingId === 'new' ? 'Address added.' : 'Address updated.',
      });
    } catch (err) {
      setFormError(err.message || 'Unable to save this address.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (address) => {
    setBusyId(address._id);
    setMessage({ type: '', text: '' });

    try {
      const response = await setDefaultAddress(address._id);
      onChange(response.addresses);
      setMessage({ type: 'success', text: 'Default address updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (address) => {
    setBusyId(address._id);
    setMessage({ type: '', text: '' });

    try {
      const response = await deleteAddress(address._id);
      onChange(response.addresses);
      setConfirmDeleteId(null);
      setMessage({ type: 'success', text: 'Address removed.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ab-wrap">
      <div className="pf-panel-head">
        <div>
          <h2>Saved addresses</h2>
          <p>
            {addresses.length === 0
              ? 'Save your delivery addresses for faster checkout.'
              : `${addresses.length} of ${MAX_ADDRESSES} saved. Your default is used at checkout.`}
          </p>
        </div>

        {!formOpen && (
          <button
            type="button"
            className="pf-btn pf-btn-primary"
            onClick={openNew}
            disabled={atLimit}
            title={atLimit ? `You can save up to ${MAX_ADDRESSES} addresses` : undefined}
          >
            <Icon name="plus" size={16} /> Add address
          </button>
        )}
      </div>

      {message.text && (
        <p
          role={message.type === 'error' ? 'alert' : 'status'}
          className={message.type === 'error' ? 'pf-msg pf-msg-error' : 'pf-msg pf-msg-success'}
        >
          {message.text}
        </p>
      )}

      {formOpen && (
        <form className="ab-form" onSubmit={handleSave} noValidate>
          <h3 className="ab-form-title">
            {editingId === 'new' ? 'New address' : 'Edit address'}
          </h3>

          <fieldset className="ab-fieldset">
            <legend>Label</legend>
            <div className="ab-segment">
              {LABEL_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`ab-segment-option ${form.label === option ? 'is-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="label"
                    value={option}
                    checked={form.label === option}
                    onChange={handleFieldChange}
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="pf-grid">
            {FIELDS.map((field) => (
              <div
                key={field.name}
                className={`pf-field ${field.wide ? 'pf-span-2' : ''}`}
              >
                <label htmlFor={`ab-${field.name}`}>{field.label}</label>
                <input
                  id={`ab-${field.name}`}
                  name={field.name}
                  type="text"
                  value={form[field.name]}
                  onChange={handleFieldChange}
                  autoComplete={field.autoComplete}
                  maxLength={field.maxLength}
                  required
                />
              </div>
            ))}
          </div>

          <label className={`ab-check ${defaultLocked ? 'is-locked' : ''}`}>
            <input
              type="checkbox"
              name="isDefault"
              checked={form.isDefault || defaultLocked}
              disabled={defaultLocked}
              onChange={handleFieldChange}
            />
            <span>
              Use as my default address
              {defaultLocked && (
                <small>
                  {editingDefault
                    ? ' This is your default. Set another address as default to change it.'
                    : ' Your first address is set as default automatically.'}
                </small>
              )}
            </span>
          </label>

          {formError && (
            <p role="alert" className="pf-msg pf-msg-error">
              {formError}
            </p>
          )}

          <div className="pf-actions">
            <button
              type="button"
              className="pf-btn pf-btn-ghost"
              onClick={closeForm}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="pf-btn pf-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save address'}
            </button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !formOpen ? (
        <div className="ab-empty">
          <span className="ab-empty-icon">
            <Icon name="mapPin" size={22} />
          </span>
          <p className="ab-empty-title">No saved addresses yet</p>
          <p className="ab-empty-text">
            Add your home or office address once and it will be ready at checkout.
          </p>
        </div>
      ) : (
        <div className="ab-grid">
          {addresses.map((address) => {
            const busy = busyId === address._id;

            return (
              <article
                key={address._id}
                className={`ab-card ${address.isDefault ? 'is-default' : ''}`}
              >
                <div className="ab-card-top">
                  <span className="ab-chip">
                    <Icon name="mapPin" size={13} /> {address.label}
                  </span>

                  {address.isDefault && (
                    <span className="ab-default-badge">
                      <Icon name="star" size={12} filled /> Default
                    </span>
                  )}
                </div>

                <p className="ab-card-name">{address.name}</p>

                <p className="ab-card-text">
                  {address.addressLine}
                  <br />
                  {address.city}, {address.state} {address.postalCode}
                  <br />
                  {address.country}
                </p>

                <p className="ab-card-phone">
                  <Icon name="phone" size={13} /> {address.phone}
                </p>

                {confirmDeleteId === address._id ? (
                  <div className="ab-confirm">
                    <span>Remove this address?</span>
                    <div className="ab-confirm-actions">
                      <button
                        type="button"
                        className="pf-btn pf-btn-danger"
                        onClick={() => handleDelete(address)}
                        disabled={busy}
                      >
                        {busy ? 'Removing…' : 'Yes, remove'}
                      </button>
                      <button
                        type="button"
                        className="pf-btn pf-btn-ghost"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={busy}
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ab-card-actions">
                    <button
                      type="button"
                      className="ab-link"
                      onClick={() => openEdit(address)}
                      disabled={busy || formOpen}
                    >
                      <Icon name="pencil" size={14} /> Edit
                    </button>

                    {!address.isDefault && (
                      <button
                        type="button"
                        className="ab-link"
                        onClick={() => handleSetDefault(address)}
                        disabled={busy}
                      >
                        <Icon name="star" size={14} /> Set as default
                      </button>
                    )}

                    <button
                      type="button"
                      className="ab-link ab-link-danger"
                      onClick={() => {
                        setMessage({ type: '', text: '' });
                        setConfirmDeleteId(address._id);
                      }}
                      disabled={busy || formOpen}
                    >
                      <Icon name="trash" size={14} /> Remove
                    </button>
                  </div>
                )}
              </article>
            );
          })}

          {!formOpen && addresses.length > 0 && (
            <button
              type="button"
              className="ab-add-card"
              onClick={openNew}
              disabled={atLimit}
            >
              <Icon name="plus" size={20} />
              <span>{atLimit ? 'Address limit reached' : 'Add another address'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressBook;
