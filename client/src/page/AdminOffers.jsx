import { confirmDialog, notifyDialog } from '../components/Dialog.jsx';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getProducts, getProductCategories } from '../services/productService.js';
import {
  adminListOffers,
  adminCreateOffer,
  adminUpdateOffer,
  adminSetOfferStatus,
  adminDeleteOffer,
} from '../services/offerService.js';
import Pagination from '../components/Pagination.jsx';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import AdminLayout, { Notice } from '../components/AdminLayout.jsx';
import '../styles/admin.css';

const PAGE_SIZE = 15;

const emptyForm = {
  title: '',
  type: 'PERCENT',
  value: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
};

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

const describeDiscount = (offer) =>
  offer.type === 'PERCENT' ? `${offer.value}% off` : `₹${offer.value} off each`;

const AdminOffers = () => {
  const { token } = useAuth();

  // List state
  const [offers, setOffers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Feedback
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

  // Form state
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState([]); // [{ _id, name, price }]
  const [selectedCategories, setSelectedCategories] = useState([]); // ['hoodies', ...]
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Product picker state
  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebouncedValue(productSearch.trim(), 300);
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  useEffect(() => {
    getProductCategories()
      .then((names) => setCategoryOptions(names))
      .catch(() => setCategoryOptions([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch]);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    adminListOffers(token, { status, search: debouncedSearch, page, limit: PAGE_SIZE })
      .then((data) => {
        if (!active) return;

        setOffers(data.offers);
        setPagination(data.pagination);
        setError('');
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load offers.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, status, debouncedSearch, page, refreshKey]);

  // Product search for the picker.
  useEffect(() => {
    if (!debouncedProductSearch) {
      setProductResults([]);
      return undefined;
    }

    let active = true;
    setSearchingProducts(true);

    getProducts({ search: debouncedProductSearch, limit: 8 })
      .then((data) => {
        if (active) setProductResults(data.products || []);
      })
      .catch(() => {
        if (active) setProductResults([]);
      })
      .finally(() => {
        if (active) setSearchingProducts(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedProductSearch]);

  const refresh = () => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  const setField = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

    setForm((current) => ({ ...current, [name]: value }));
  };

  const addProduct = (product) => {
    setSelected((current) =>
      current.some((item) => item._id === product._id) ? current : [...current, product]
    );
    setProductSearch('');
    setProductResults([]);
  };

  const removeProduct = (id) => {
    setSelected((current) => current.filter((item) => item._id !== id));
  };

  const addCategory = (name) => {
    if (!name) return;

    setSelectedCategories((current) => (current.includes(name) ? current : [...current, name]));
  };

  const removeCategory = (name) => {
    setSelectedCategories((current) => current.filter((item) => item !== name));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSelected([]);
    setSelectedCategories([]);
    setEditingId(null);
    setProductSearch('');
    setProductResults([]);
  };

  const startEdit = (offer) => {
    setEditingId(offer._id);
    setError('');
    setNotice('');
    setForm({
      title: offer.title,
      type: offer.type,
      value: String(offer.value),
      startsAt: toLocalInput(offer.startsAt),
      expiresAt: toLocalInput(offer.expiresAt),
      isActive: offer.isActive,
    });
    setSelected(
      (offer.productIds || []).map((product) =>
        typeof product === 'object' ? product : { _id: product, name: 'Product' }
      )
    );
    setSelectedCategories(offer.categories || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (selected.length === 0 && selectedCategories.length === 0) {
      setError('Choose at least one product or category for this offer.');
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title,
      type: form.type,
      value: form.value,
      productIds: selected.map((product) => product._id),
      categories: selectedCategories,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        const data = await adminUpdateOffer(token, editingId, payload);
        setNotice(`Offer "${data.offer.title}" updated.`);
      } else {
        const data = await adminCreateOffer(token, payload);
        setNotice(`Offer "${data.offer.title}" created.`);
      }

      resetForm();
      refresh();
    } catch (err) {
      setError(err.message || 'Could not save this offer.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (offer) => {
    setBusyId(offer._id);
    setError('');
    setNotice('');

    try {
      const data = await adminSetOfferStatus(token, offer._id, !offer.isActive);
      setNotice(data.message);
      refresh();
    } catch (err) {
      setError(err.message || 'Could not change this offer.');
    } finally {
      setBusyId('');
    }
  };

  const removeOffer = async (offer) => {
    if (!(await confirmDialog({ message: `Delete the offer "${offer.title}"? Its products go back to full price.`, confirmLabel: 'Delete', danger: true }))) {
      return;
    }

    setBusyId(offer._id);
    setError('');
    setNotice('');

    try {
      await adminDeleteOffer(token, offer._id);
      setNotice(`Offer "${offer.title}" deleted.`);

      if (editingId === offer._id) resetForm();

      refresh();
    } catch (err) {
      setError(err.message || 'Could not delete this offer.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <AdminLayout
      title="Offers"
      subtitle="Product discounts that apply automatically, with no code"
    >
      {error && (
        <Notice tone="error" onClose={() => setError('')}>
          {error}
        </Notice>
      )}
      {notice && <Notice onClose={() => setNotice('')}>{notice}</Notice>}

      <section className="admin-panel" style={{ marginBottom: 20 }}>
        <h3 className="admin-panel-title">
          {editingId ? `Edit "${form.title}"` : 'Create an offer'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-full">
              <span>Offer name (shown to customers)</span>
              <input
                type="text"
                maxLength={80}
                value={form.title}
                onChange={setField('title')}
                placeholder="e.g. Festive sale on tees"
                required
              />
            </label>

            <label className="admin-field">
              <span>Discount type</span>
              <select value={form.type} onChange={setField('type')}>
                <option value="PERCENT">Percentage off</option>
                <option value="FIXED">Fixed amount off each unit (₹)</option>
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

            <label className="admin-field">
              <span>Starts (optional)</span>
              <input type="datetime-local" value={form.startsAt} onChange={setField('startsAt')} />
            </label>

            <label className="admin-field">
              <span>Ends (optional)</span>
              <input type="datetime-local" value={form.expiresAt} onChange={setField('expiresAt')} />
            </label>
          </div>

          <div style={{ margin: '18px 0 8px' }}>
            <span className="admin-field-label">Whole categories (every product in them)</span>

            {selectedCategories.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0' }}>
                {selectedCategories.map((name) => (
                  <span
                    key={name}
                    className="admin-pill admin-pill-info"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}
                  >
                    {name}
                    <button
                      type="button"
                      aria-label={`Remove ${name}`}
                      onClick={() => removeCategory(name)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <select
              aria-label="Add a category"
              value=""
              onChange={(event) => addCategory(event.target.value)}
              style={{ maxWidth: 420, width: '100%' }}
            >
              <option value="">
                {categoryOptions.length ? 'Add a category…' : 'No categories yet'}
              </option>
              {categoryOptions
                .filter((name) => !selectedCategories.includes(name))
                .map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ margin: '18px 0 8px' }}>
            <span className="admin-field-label">Individual products</span>

            {selected.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0' }}>
                {selected.map((product) => (
                  <span
                    key={product._id}
                    className="admin-pill admin-pill-neutral"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}
                  >
                    {product.name}
                    <button
                      type="button"
                      aria-label={`Remove ${product.name}`}
                      onClick={() => removeProduct(product._id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              type="search"
              className="admin-search"
              placeholder="Search a product to add it"
              aria-label="Search products to add"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              style={{ width: '100%', maxWidth: 420 }}
            />

            {productSearch.trim() && (
              <div style={{ maxWidth: 420, border: '1px solid #e5e5e5', marginTop: 4 }}>
                {searchingProducts ? (
                  <p className="admin-muted" style={{ padding: 10, margin: 0 }}>Searching…</p>
                ) : productResults.length === 0 ? (
                  <p className="admin-muted" style={{ padding: 10, margin: 0 }}>No products found.</p>
                ) : (
                  productResults.map((product) => {
                    const already = selected.some((item) => item._id === product._id);

                    return (
                      <button
                        key={product._id}
                        type="button"
                        disabled={already}
                        onClick={() => addProduct(product)}
                        style={{
                          display: 'flex',
                          width: '100%',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          border: 'none',
                          borderBottom: '1px solid #eee',
                          background: '#fff',
                          cursor: already ? 'default' : 'pointer',
                          textAlign: 'left',
                          opacity: already ? 0.5 : 1,
                        }}
                      >
                        <span>{product.name}</span>
                        <span className="admin-muted">
                          {already ? 'Added' : `₹${Number(product.price).toLocaleString('en-IN')}`}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
            <input type="checkbox" checked={form.isActive} onChange={setField('isActive')} />
            Active (applies in the shop now)
          </label>

          <div className="admin-form-actions">
            <button type="submit" className="admin-button admin-button-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create offer'}
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
            placeholder="Search offer name"
            aria-label="Search offers"
            value={search}
            onChange={(event) => {
              setLoading(true);
              setSearch(event.target.value);
            }}
          />
        </div>

        {loading ? (
          <p className="admin-empty">Loading offers…</p>
        ) : offers.length === 0 ? (
          <p className="admin-empty">No product offers yet. Create one above.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Offer</th>
                  <th>Products</th>
                  <th>Discount</th>
                  <th>Valid</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {offers.map((offer) => (
                  <tr key={offer._id}>
                    <td>
                      <span className="admin-product-name">{offer.title}</span>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      {(offer.categories || []).length > 0 && (
                        <div>
                          <strong>Categories:</strong> {offer.categories.join(', ')}
                        </div>
                      )}
                      {(offer.productIds || []).length > 0 && (
                        <div className="admin-muted">
                          {offer.productIds.map((product) => product.name || 'Product').join(', ')}
                        </div>
                      )}
                      {!(offer.categories || []).length && !(offer.productIds || []).length && '—'}
                    </td>
                    <td>{describeDiscount(offer)}</td>
                    <td>
                      {formatDate(offer.startsAt)}
                      <br />
                      <small className="admin-muted">to {formatDate(offer.expiresAt)}</small>
                    </td>
                    <td>
                      <span className={`admin-pill admin-pill-${offer.isActive ? 'success' : 'neutral'}`}>
                        {offer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-button"
                        disabled={busyId === offer._id}
                        onClick={() => toggleActive(offer)}
                      >
                        {offer.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="admin-button"
                        disabled={busyId === offer._id}
                        onClick={() => startEdit(offer)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button-danger"
                        disabled={busyId === offer._id}
                        onClick={() => removeOffer(offer)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
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
            itemLabel="offers"
            disabled={loading}
          />
        )}
      </section>
    </AdminLayout>
  );
};

export default AdminOffers;
