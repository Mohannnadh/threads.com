import { confirmDialog, notifyDialog } from '../components/Dialog.jsx';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  adminListCoupons,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminSetCouponStatus,
  adminDeleteCoupon,
} from '../services/couponService.js';
import Pagination from '../components/Pagination.jsx';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import AdminLayout, { Notice } from '../components/AdminLayout.jsx';
import '../styles/admin.css';

const PAGE_SIZE = 15;

const emptyForm = {
  code: '',
  description: '',
  type: 'PERCENT',
  value: '',
  maxDiscount: '',
  minSubtotal: '',
  usageLimit: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
};

// Date -> value for <input type="datetime-local"> in the local time zone.
const toLocalInput = (value) => {
  if (!value) return '';

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const describeDiscount = (coupon) => {
  if (coupon.type === 'PERCENT') {
    const cap = coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : '';
    return `${coupon.value}% off${cap}`;
  }

  return `₹${coupon.value} off`;
};

// Turns the form into the request body. Empty optional fields become null.
const toPayload = (form) => ({
  code: form.code,
  description: form.description,
  type: form.type,
  value: form.value,
  maxDiscount: form.type === 'PERCENT' && form.maxDiscount !== '' ? form.maxDiscount : null,
  minSubtotal: form.minSubtotal || 0,
  usageLimit: form.usageLimit !== '' ? form.usageLimit : null,
  startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
  expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
  isActive: form.isActive,
});

const AdminCoupons = () => {
  const { token } = useAuth();

  const [coupons, setCoupons] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch]);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    adminListCoupons(token, { status, search: debouncedSearch, page, limit: PAGE_SIZE })
      .then((data) => {
        if (!active) return;

        setCoupons(data.coupons);
        setPagination(data.pagination);
        setError('');
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load coupons.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, status, debouncedSearch, page, refreshKey]);

  const refresh = () => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  const setField = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (coupon) => {
    setEditingId(coupon._id);
    setError('');
    setNotice('');
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      type: coupon.type,
      value: String(coupon.value),
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
      minSubtotal: coupon.minSubtotal ? String(coupon.minSubtotal) : '',
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      startsAt: toLocalInput(coupon.startsAt),
      expiresAt: toLocalInput(coupon.expiresAt),
      isActive: coupon.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);

    try {
      const payload = toPayload(form);

      if (editingId) {
        const data = await adminUpdateCoupon(token, editingId, payload);
        setNotice(`Coupon ${data.coupon.code} updated.`);
      } else {
        const data = await adminCreateCoupon(token, payload);
        setNotice(`Coupon ${data.coupon.code} created.`);
      }

      resetForm();
      refresh();
    } catch (err) {
      setError(err.message || 'Could not save this coupon.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon) => {
    setBusyId(coupon._id);
    setError('');
    setNotice('');

    try {
      const data = await adminSetCouponStatus(token, coupon._id, !coupon.isActive);
      setNotice(data.message);
      refresh();
    } catch (err) {
      setError(err.message || 'Could not change this coupon.');
    } finally {
      setBusyId('');
    }
  };

  const removeCoupon = async (coupon) => {
    const warning = coupon.usedCount > 0
      ? ` It has been used ${coupon.usedCount} time(s); past orders keep their discount.`
      : '';

    if (!(await confirmDialog({ message: `Delete coupon ${coupon.code}?${warning}`, confirmLabel: 'Delete', danger: true }))) return;

    setBusyId(coupon._id);
    setError('');
    setNotice('');

    try {
      await adminDeleteCoupon(token, coupon._id);
      setNotice(`Coupon ${coupon.code} deleted.`);

      if (editingId === coupon._id) resetForm();

      refresh();
    } catch (err) {
      setError(err.message || 'Could not delete this coupon.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <AdminLayout title="Coupons" subtitle="Codes customers enter at checkout">
      {error && (
        <Notice tone="error" onClose={() => setError('')}>
          {error}
        </Notice>
      )}
      {notice && <Notice onClose={() => setNotice('')}>{notice}</Notice>}

      <section className="admin-panel" style={{ marginBottom: 20 }}>
        <h3 className="admin-panel-title">
          {editingId ? `Edit ${form.code}` : 'Create an coupon'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Coupon code</span>
              <input
                type="text"
                value={form.code}
                onChange={setField('code')}
                placeholder="e.g. DIWALI20"
                maxLength={30}
                required
              />
            </label>

            <label className="admin-field">
              <span>Discount type</span>
              <select value={form.type} onChange={setField('type')}>
                <option value="PERCENT">Percentage off</option>
                <option value="FIXED">Fixed amount off (₹)</option>
              </select>
            </label>

            <label className="admin-field">
              <span>{form.type === 'PERCENT' ? 'Percent off' : 'Amount off (₹)'}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                max={form.type === 'PERCENT' ? 100 : undefined}
                value={form.value}
                onChange={setField('value')}
                required
              />
            </label>

            {form.type === 'PERCENT' && (
              <label className="admin-field">
                <span>Maximum discount (₹, optional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.maxDiscount}
                  onChange={setField('maxDiscount')}
                  placeholder="No cap"
                />
              </label>
            )}

            <label className="admin-field">
              <span>Minimum order (₹)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minSubtotal}
                onChange={setField('minSubtotal')}
                placeholder="0"
              />
            </label>

            <label className="admin-field">
              <span>Uses per customer (optional)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.usageLimit}
                onChange={setField('usageLimit')}
                placeholder="Unlimited"
              />
            </label>

            <label className="admin-field">
              <span>Starts (optional)</span>
              <input type="datetime-local" value={form.startsAt} onChange={setField('startsAt')} />
            </label>

            <label className="admin-field">
              <span>Ends (optional)</span>
              <input type="datetime-local" value={form.expiresAt} onChange={setField('expiresAt')} />
            </label>

            <label className="admin-field admin-field-full">
              <span>Description shown to admins (optional)</span>
              <input
                type="text"
                maxLength={120}
                value={form.description}
                onChange={setField('description')}
              />
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
            <input type="checkbox" checked={form.isActive} onChange={setField('isActive')} />
            Active (customers can use it)
          </label>

          <div className="admin-form-actions">
            <button type="submit" className="admin-button admin-button-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create coupon'}
            </button>
            {editingId && (
              <button type="button" className="admin-button" onClick={resetForm} disabled={saving}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-toolbar">
          <div className="admin-tabs" role="tablist">
            {[
              { key: '', label: 'All' },
              { key: 'ACTIVE', label: 'Active' },
              { key: 'INACTIVE', label: 'Inactive' },
            ].map((tab) => (
              <button
                key={tab.key || 'ALL'}
                type="button"
                role="tab"
                aria-selected={status === tab.key}
                className={`admin-tab${status === tab.key ? ' is-active' : ''}`}
                onClick={() => {
                  setLoading(true);
                  setStatus(tab.key);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            className="admin-search"
            placeholder="Search code or description"
            aria-label="Search coupons"
            value={search}
            onChange={(event) => {
              setLoading(true);
              setSearch(event.target.value);
            }}
          />
        </div>

        {loading ? (
          <p className="admin-empty">Loading coupons…</p>
        ) : coupons.length === 0 ? (
          <p className="admin-empty">No coupons yet. Create one above.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Minimum</th>
                  <th className="num">Used</th>
                  <th>Valid</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {coupons.map((coupon) => {
                  return (
                    <tr key={coupon._id}>
                      <td>
                        <span className="admin-product-name">{coupon.code}</span>
                        {coupon.description && (
                          <div className="admin-muted">{coupon.description}</div>
                        )}
                      </td>
                      <td>{describeDiscount(coupon)}</td>
                      <td>{coupon.minSubtotal ? `₹${coupon.minSubtotal}` : '—'}</td>
                      <td className="num">
                        {coupon.usedCount} total
                        <div className="admin-muted">
                          {coupon.usageLimit
                            ? `up to ${coupon.usageLimit} per customer`
                            : 'unlimited per customer'}
                        </div>
                      </td>
                      <td>
                        {formatDate(coupon.startsAt)}
                        <br />
                        <small className="admin-muted">to {formatDate(coupon.expiresAt)}</small>
                      </td>
                      <td>
                        <span className={`admin-pill admin-pill-${coupon.isActive ? 'success' : 'neutral'}`}>
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-button"
                          disabled={busyId === coupon._id}
                          onClick={() => toggleActive(coupon)}
                        >
                          {coupon.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="admin-button"
                          disabled={busyId === coupon._id}
                          onClick={() => startEdit(coupon)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-button admin-button-danger"
                          disabled={busyId === coupon._id}
                          onClick={() => removeCoupon(coupon)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (
          <Pagination
            pagination={pagination}
            onPageChange={(next) => {
              setLoading(true);
              setPage(next);
            }}
            itemLabel="coupons"
            disabled={loading}
          />
        )}
      </section>
    </AdminLayout>
  );
};

export default AdminCoupons;
