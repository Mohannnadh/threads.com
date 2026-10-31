import { confirmDialog, notifyDialog } from '../components/Dialog.jsx';

import { useEffect, useState } from 'react';
import { lowStockSizes } from '../utils/stock.js';
import { useAuth } from '../context/AuthContext.jsx';
import {getProducts,createProduct,updateProduct,deleteProduct,uploadProductImages,getCategorySummary,} from '../services/productService.js';
import { getDashboardStats, getAdminProducts } from '../services/adminService.js';
import Pagination from '../components/Pagination.jsx';
import useDebouncedValue from '../hooks/useDebouncedValue.js';

const PAGE_SIZE = 10;
import '../styles/admin.css';
import { Icon } from '../components/Icon.jsx';
import AdminLayout, { Notice } from '../components/AdminLayout.jsx';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// One size under a colour, with its own price and quantity.
const createSizeRow = (overrides = {}) => ({
  id: newId(),
  size: '',
  price: '',
  stock: '',
  ...overrides,
});

// One colour option: a name, its own photo(s), its sizes, and the photo already saved for it.
const createColorRow = (overrides = {}) => ({
  id: newId(),
  name: '',
  files: [],
  previews: [],
  existingImage: '',
  sizes: [createSizeRow()],
  ...overrides,
});

// Colour options for an existing product, with each size's price and quantity.
const buildColorRows = (product) => {
  const photos = Array.isArray(product.colorImages) ? product.colorImages : [];
  const variants = Array.isArray(product.variants) ? product.variants : [];

  // Products saved before sizes had prices use the single price, with quantities left to fill in.
  const source = variants.length > 0
    ? variants
    : (Array.isArray(product.colors) ? product.colors : []).flatMap((color) =>
        (Array.isArray(product.sizes) ? product.sizes : []).map((size) => ({
          color,
          size,
          price: product.price,
          stock: '',
        }))
      );

  const colorNames = [...new Set(source.map((item) => item.color))];

  const rows = colorNames.map((name) =>
    createColorRow({
      name,
      existingImage:
        photos.find((entry) => entry?.color?.trim().toLowerCase() === name.trim().toLowerCase())?.image || '',
      sizes: source
        .filter((item) => item.color === name)
        .map((item) => createSizeRow({ size: item.size, price: String(item.price), stock: String(item.stock ?? '') })),
    })
  );

  return rows.length > 0 ? rows : [createColorRow()];
};

const initialForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  gender: 'unisex',
  images: '',
  sizes: 'S, M, L, XL',
  colors: 'Black, White',
  colorPhotos: '',
  stock: '0',
  isFeatured: false,
};

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);

// First image of a product, or '' when none is set.
const getProductImage = (product) =>
  product?.images?.find((image) => typeof image === 'string' && image.trim() !== '')?.trim() || '';

function AdminProducts() {
  const { token } = useAuth();
  const [viewing, setViewing] = useState(null); // product shown in the popup
  const [brokenImages, setBrokenImages] = useState({}); // ids whose image failed to load

  // Close the popup with Escape.
  useEffect(() => {
    if (!viewing) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') setViewing(null);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing]);

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({ total: 0, inStock: 0, lowStock: 0, outOfStock: 0 });
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false); // form is hidden until Add or Edit
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Bumping this counter reloads the current page (after save/delete/refresh).
  const [refreshKey, setRefreshKey] = useState(0);

  // Loads the current page whenever the page, search or refresh key changes.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const [listResult, statsResult] = await Promise.all([
          getAdminProducts(token, { page, limit: PAGE_SIZE, search: debouncedSearch }),
          getDashboardStats(token).catch(() => null),
        ]);

        if (cancelled) return;

        const { products: pageItems, pagination: meta } = listResult;

        // If the current page no longer exists (e.g. after a delete), step back.
        if (pageItems.length === 0 && meta.totalPages > 0 && page > meta.totalPages) {
          setPage(meta.totalPages);
          return;
        }

        setError('');
        setProducts(pageItems || []);
        setPagination(meta);

        if (statsResult) {
          setStats(statsResult.products);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load products.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, token, refreshKey]);

  // Reload the current page from an event handler (sets loading first).
  const reloadProducts = () => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  // Existing categories for the dropdown. Reloads after a save adds a new one.
  const [categoryOptions, setCategoryOptions] = useState([]);

  useEffect(() => {
    let active = true;

    getCategorySummary()
      .then((list) => {
        if (active) setCategoryOptions(list.map((category) => category.name));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [refreshKey]);

  // Colour options: each has a name and its own photo(s).
  const [colorRows, setColorRows] = useState(() => [createColorRow()]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setColorRows([createColorRow()]);
  };

  // Escape closes the add/edit popup.
  useEffect(() => {
    if (!formOpen) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') closeForm();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [formOpen]);

  const closeForm = () => {
    resetForm();
    setFormOpen(false);
  };

  const openNewForm = () => {
    resetForm();
    setFormOpen(true);
    setError('');
    setSuccess('');
    setTimeout(() => {
      document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleEdit = (product) => {
    setFormOpen(true);
    setColorRows(buildColorRows(product));
    setEditingId(product._id);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: String(product.price ?? ''),
      category: product.category || '',
      gender: product.gender || 'unisex',
      images: Array.isArray(product.images)
        ? product.images.join(', ')
        : '',
      sizes: Array.isArray(product.sizes)
        ? product.sizes.join(', ')
        : 'S, M, L, XL',
      colors: Array.isArray(product.colors)
        ? product.colors.join(', ')
        : 'Black, White',
      colorPhotos: Array.isArray(product.colorImages)
        ? product.colorImages
            .filter((entry) => entry?.color && entry?.image)
            .map((entry) => `${entry.color}=${entry.image}`)
            .join('; ')
        : '',
      stock: String(product.stock ?? 0),
      isFeatured: Boolean(product.isFeatured),
    });

    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateRow = (id, patch) =>
    setColorRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const addColorRow = () => setColorRows((rows) => [...rows, createColorRow()]);

  const updateSizeRow = (colorId, sizeId, patch) =>
    setColorRows((rows) =>
      rows.map((row) =>
        row.id !== colorId
          ? row
          : {
              ...row,
              sizes: row.sizes.map((size) => (size.id === sizeId ? { ...size, ...patch } : size)),
            }
      )
    );

  const addSizeRow = (colorId) =>
    setColorRows((rows) =>
      rows.map((row) => (row.id === colorId ? { ...row, sizes: [...row.sizes, createSizeRow()] } : row))
    );

  const removeSizeRow = (colorId, sizeId) =>
    setColorRows((rows) =>
      rows.map((row) =>
        row.id !== colorId
          ? row
          : {
              ...row,
              sizes: row.sizes.length > 1 ? row.sizes.filter((size) => size.id !== sizeId) : [createSizeRow()],
            }
      )
    );

  const removeColorRow = (id) =>
    setColorRows((rows) => (rows.length > 1 ? rows.filter((row) => row.id !== id) : [createColorRow()]));

  // Photos for one colour. Files that are too big or the wrong type are skipped.
  const pickColorFiles = (id, event) => {
    const picked = Array.from(event.target.files || [])
      .filter((file) => ACCEPTED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_BYTES)
      .slice(0, 5);

    event.target.value = '';

    updateRow(id, {
      files: picked,
      previews: picked.map((file) => URL.createObjectURL(file)),
      existingImage: '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.description.trim() || !form.category.trim()) {
      setError('Please fill in the product name, description, and category.');
      return;
    }

    // Colour options that have a name, a photo, or both.
    const options = colorRows
      .map((row) => ({ ...row, name: row.name.trim() }))
      .filter((row) => row.name || row.files.length > 0 || row.existingImage);

    if (options.some((row) => !row.name)) {
      setError('Give every colour option a name, or remove it.');
      return;
    }

    // Every size needs a name, a price and a quantity.
    const variants = [];

    for (const row of options) {
      const sizes = row.sizes.filter((size) => size.size.trim() || size.price !== '' || size.stock !== '');

      if (sizes.length === 0) {
        setError(`Add at least one size for ${row.name}.`);
        return;
      }

      for (const size of sizes) {
        if (!size.size.trim()) {
          setError(`Give every size under ${row.name} a name.`);
          return;
        }

        if (size.price === '' || !Number.isFinite(Number(size.price)) || Number(size.price) < 0) {
          setError(`Enter a price for ${row.name} / ${size.size.trim()}.`);
          return;
        }

        if (size.stock === '' || !Number.isInteger(Number(size.stock)) || Number(size.stock) < 0) {
          setError(`Enter a whole-number quantity for ${row.name} / ${size.size.trim()}.`);
          return;
        }

        variants.push({
          color: row.name,
          size: size.size.trim(),
          price: Number(size.price),
          stock: Number(size.stock),
        });
      }
    }

    if (variants.length === 0) {
      setError('Add at least one colour with a size, price and quantity.');
      return;
    }

    const names = options.map((row) => row.name.toLowerCase());

    if (new Set(names).size !== names.length) {
      setError('Each colour option needs a different name.');
      return;
    }

    try {
      setSaving(true);

      // Upload each colour's photos, then save with the URLs.
      const optionUploads = await Promise.all(
        options.map((row) => (row.files.length > 0 ? uploadProductImages(row.files, token) : []))
      );

      const colorImages = options
        .map((row, index) => {
          const image = optionUploads[index][0] || row.existingImage;

          return image ? { color: row.name, image } : null;
        })
        .filter(Boolean);

      const optionPhotos = options.flatMap((row, index) =>
        [...optionUploads[index], row.existingImage].filter(Boolean)
      );

      const images = [...new Set(optionPhotos)];

      // Colours, sizes, the lowest price and total stock come from the variants.
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        gender: form.gender,
        isFeatured: form.isFeatured,
        variants,
        colorImages,
        images,
      };

      if (editingId) {
        await updateProduct(editingId, payload, token);
        setSuccess('Product updated successfully.');
      } else {
        await createProduct(payload, token);
        setSuccess('Product created successfully.');
      }

      closeForm();
      reloadProducts();
    } catch (err) {
      setError(err.message || 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = await confirmDialog({
      title: 'Delete product?',
      message: `Are you sure you want to delete "${product.name}"?`,
      confirmLabel: 'Delete',
      danger: true,
    });

    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await deleteProduct(product._id, token);

      if (editingId === product._id) {
        closeForm();
      }

      setSuccess('Product deleted successfully.');
      reloadProducts();
    } catch (err) {
      setError(err.message || 'Unable to delete product.');
    }
  };

  return (
    <AdminLayout
      title="Products"
      subtitle="Catalogue, pricing and stock in one place."
      actions={
        <button
          type="button"
          className="admin-button admin-button-primary"
          onClick={openNewForm}
        >
          <Icon name="plus" /> Add product
        </button>
      }
    >
          {error && (
            <Notice tone="error" onClose={() => setError('')}>
              {error}
            </Notice>
          )}

          {success && (
            <Notice onClose={() => setSuccess('')}>{success}</Notice>
          )}

          <section className="admin-stats" aria-label="Product statistics">
            <article className="admin-stat-card">
              <div className="admin-stat-label">Total products</div>
              <div className="admin-stat-value">{stats.total}</div>
              <div className="admin-muted">Products in your catalogue</div>
            </article>

            <article className="admin-stat-card">
              <div className="admin-stat-label">Available products</div>
              <div className="admin-stat-value">{stats.inStock}</div>
              <div className="admin-muted">Products with stock available</div>
            </article>

            <article className="admin-stat-card">
              <div className="admin-stat-label">Low stock</div>
              <div className="admin-stat-value">{stats.lowStock}</div>
              <div className="admin-muted">Products with a size at 5 units or fewer</div>
            </article>

            <article className="admin-stat-card">
              <div className="admin-stat-label">Out of stock</div>
              <div className="admin-stat-value">{stats.outOfStock ?? 0}</div>
              <div className="admin-muted">Products with no units in any size</div>
            </article>
          </section>

          {formOpen && (
          <div
            className="admin-modal-backdrop"
            onClick={closeForm}
            role="presentation"
          >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 980 }}
          >
          <section className="admin-panel" id="product-form" style={{ margin: 0, border: 'none', boxShadow: 'none' }}>
            <div className="admin-panel-header">
              <div>
                <p className="admin-kicker" style={{ margin: 0, letterSpacing: '0.16em', fontSize: 11 }}>
                  {editingId ? 'EDIT PRODUCT' : 'NEW ARRIVAL'}
                </p>
                <h2 id="product-form-title" className="admin-panel-title">{editingId ? 'Edit product' : 'Add a product'}</h2>
                <p className="admin-muted">Fill in the details below. Each colour can have its own photo.</p>
              </div>
              <button type="button" className="admin-icon-button" aria-label="Close" onClick={closeForm}>
                <Icon name="x" size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* 01 Product details */}
              <div className="admin-step-head">
                <span className="admin-step-num">01</span>
                <h3>Product details</h3>
              </div>

              <div className="admin-form-grid">
                <div className="admin-field">
                  <label htmlFor="name">Product name *</label>
                  <input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Essential Black Tee"
                    required
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="category-select">Category *</label>
                  <select
                    id="category-select"
                    value={form.category}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, category: event.target.value }))
                    }
                    required
                  >
                    <option value="">Choose a category</option>
                    {/* Keeps a product's current category selectable when editing it. */}
                    {form.category && !categoryOptions.includes(form.category) && (
                      <option value={form.category}>{form.category}</option>
                    )}
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <small className="admin-muted">
                    Categories are managed on the Categories page.
                  </small>
                </div>

                <div className="admin-field admin-field-full">
                  <label htmlFor="description">Description *</label>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the material, design, and details..."
                    rows={4}
                    maxLength={2000}
                    required
                  />
                  <small className="admin-muted" style={{ textAlign: 'right' }}>
                    {form.description.length}/2000 characters
                  </small>
                </div>
              </div>

              {/* 02 Colour options */}
              <div className="admin-step-head">
                <span className="admin-step-num">02</span>
                <h3>Colour options</h3>
                <button type="button" className="admin-button" onClick={addColorRow} style={{ marginLeft: 'auto' }}>
                  <Icon name="plus" /> Add color
                </button>
              </div>
              <p className="admin-muted" style={{ marginTop: 0 }}>
                Each colour gets its own photo. Shoppers see it when they pick that colour.
              </p>

              {colorRows.map((row, index) => (
                <div
                  key={row.id}
                  style={{
                    border: '1px solid var(--adm-line)',
                    padding: 16,
                    marginBottom: 14,
                    background: '#faf8f4',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <strong>Option {String(index + 1).padStart(2, '0')}</strong>
                    <button
                      type="button"
                      className="admin-button admin-button-danger"
                      onClick={() => removeColorRow(row.id)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="admin-field">
                    <label htmlFor={`color-name-${row.id}`}>Color name *</label>
                    <input
                      id={`color-name-${row.id}`}
                      value={row.name}
                      onChange={(event) => updateRow(row.id, { name: event.target.value })}
                      placeholder="e.g. Walnut Brown"
                      maxLength={40}
                    />
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong style={{ fontSize: 13 }}>Sizes, price and quantity</strong>
                      <button type="button" className="admin-button" onClick={() => addSizeRow(row.id)}>
                        <Icon name="plus" /> Add size
                      </button>
                    </div>
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Size</th>
                            <th className="num">Price (₹)</th>
                            <th className="num">Quantity</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {row.sizes.map((size) => (
                            <tr key={size.id}>
                              <td>
                                <input
                                  aria-label={`Size for ${row.name || 'this colour'}`}
                                  value={size.size}
                                  onChange={(event) => updateSizeRow(row.id, size.id, { size: event.target.value })}
                                  placeholder="e.g. M"
                                  maxLength={20}
                                  style={{ width: '100%' }}
                                />
                              </td>
                              <td className="num">
                                <input
                                  aria-label={`Price for ${size.size || 'this size'}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={size.price}
                                  onChange={(event) => updateSizeRow(row.id, size.id, { price: event.target.value })}
                                  style={{ width: 110 }}
                                />
                              </td>
                              <td className="num">
                                <input
                                  aria-label={`Quantity for ${size.size || 'this size'}`}
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={size.stock}
                                  onChange={(event) => updateSizeRow(row.id, size.id, { stock: event.target.value })}
                                  style={{ width: 90 }}
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="admin-icon-button"
                                  aria-label={`Remove size ${size.size || ''}`}
                                  onClick={() => removeSizeRow(row.id, size.id)}
                                >
                                  <Icon name="x" size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="admin-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                      Colour total: {row.sizes.reduce((sum, size) => sum + (Number(size.stock) || 0), 0)} in stock.
                      Sizes with a quantity of 0 show as sold out on the shop.
                    </p>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {row.previews.length === 0 && row.existingImage && (
                      <div>
                        <img
                          src={row.existingImage}
                          alt={`${row.name || 'Colour'} photo`}
                          style={{ width: 84, height: 105, objectFit: 'cover', border: '1px solid var(--adm-line)' }}
                        />
                        <button
                          type="button"
                          className="admin-button"
                          style={{ display: 'block', marginTop: 6 }}
                          onClick={() => updateRow(row.id, { existingImage: '' })}
                        >
                          Remove photo
                        </button>
                      </div>
                    )}

                    {row.previews.map((src, photoIndex) => (
                      <img
                        key={src}
                        src={src}
                        alt={`${row.name || 'Colour'} new photo ${photoIndex + 1}`}
                        style={{ width: 84, height: 105, objectFit: 'cover', border: '1px solid var(--adm-line)' }}
                      />
                    ))}
                  </div>

                  <label
                    style={{
                      display: 'block',
                      marginTop: 12,
                      padding: '22px 16px',
                      textAlign: 'center',
                      border: '1px dashed #b9b2a3',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES.join(',')}
                      multiple
                      hidden
                      onChange={(event) => pickColorFiles(row.id, event)}
                    />
                    <span style={{ display: 'block', fontSize: 22, lineHeight: 1 }}>+</span>
                    <strong style={{ display: 'block', marginTop: 6 }}>
                      {row.name ? `Choose images for ${row.name}` : 'Choose images for this color'}
                    </strong>
                    <span className="admin-muted" style={{ fontSize: 12 }}>
                      JPG, PNG, WEBP or GIF, up to 5 MB each. 5 images at most.
                    </span>
                  </label>
                </div>
              ))}

              {/* 03 Other details */}
              <div className="admin-step-head" style={{ marginTop: 24 }}>
                <span className="admin-step-num">03</span>
                <h3>Other details</h3>
              </div>
              <p className="admin-muted" style={{ marginTop: 0 }}>
                Price and quantity are set for each size above. The shop shows the lowest price.
              </p>

              <div className="admin-form-grid">
                <div className="admin-field">
                  <label htmlFor="gender">Gender</label>
                  <select id="gender" name="gender" value={form.gender} onChange={handleChange}>
                    <option value="unisex">Unisex</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                  </select>
                </div>

                <div className="admin-field admin-field-full">
                  <label className="admin-checkbox">
                    <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} />
                    <span>Feature this product in the store</span>
                  </label>
                </div>
              </div>

              <div className="admin-form-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="admin-button" onClick={closeForm} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="admin-button admin-button-primary" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save product'}
                </button>
              </div>
            </form>
          </section>
          </div>
          </div>
          )}

          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2 className="admin-panel-title">Your products</h2>
                <p className="admin-muted">
                  {pagination?.total ?? 0} {debouncedSearch ? 'matching' : 'total'} products
                </p>
              </div>

              <button
                type="button"
                className="admin-button"
                onClick={reloadProducts}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : <><Icon name="refresh" /> Refresh</>}
              </button>
            </div>

            <div className="admin-table-toolbar">
              <input
                className="admin-search"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setLoading(true);
                  setPage(1);
                }}
                placeholder="Search by name, category, gender, color or size"
                aria-label="Search products"
              />
            </div>

            {loading ? (
              <div className="admin-empty">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="admin-empty">
                <strong>No products found</strong>
                <p className="admin-muted">
                  {search
                    ? 'Try a different search term.'
                    : 'Create your first product using the form above.'}
                </p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>IMAGE</th>
                      <th>PRODUCT</th>
                      <th>CATEGORY</th>
                      <th>GENDER</th>
                      <th>PRICE</th>
                      <th>STOCK</th>
                      <th>FEATURED</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {products.map((product) => {
                      const stock = Number(product.stock) || 0;

                      return (
                        <tr
                          key={product._id}
                          className="admin-row-clickable"
                          onClick={() => setViewing(product)}
                          title="View product"
                        >
                          <td style={{ width: 64 }}>
                            {getProductImage(product) && !brokenImages[product._id] ? (
                              <img
                                src={getProductImage(product)}
                                alt={product.name || 'Product'}
                                onError={() =>
                                  setBrokenImages((current) => ({ ...current, [product._id]: true }))
                                }
                                style={{
                                  width: 48,
                                  height: 60,
                                  objectFit: 'cover',
                                  border: '1px solid #eee',
                                  background: '#f3f1ed',
                                  display: 'block',
                                }}
                              />
                            ) : (
                              <div
                                aria-label="No image"
                                style={{
                                  width: 48,
                                  height: 60,
                                  border: '1px solid #eee',
                                  background: '#f3f1ed',
                                  color: '#999',
                                  fontSize: 10,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                No img
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="admin-product-name">
                              {product.name}
                            </div>
                            <div className="admin-muted">
                              ID: {product._id?.slice(-6) || '—'}
                            </div>
                          </td>

                          <td>{product.category || '—'}</td>
                          <td>{product.gender || 'Unisex'}</td>
                          <td>{formatPrice(product.price)}</td>

                          <td>
                            {(() => {
                              const low = lowStockSizes(product);

                              if (stock === 0) {
                                return <span className="admin-stock admin-stock-out">Out of stock</span>;
                              }

                              if (low.length > 0) {
                                return (
                                  <span className="admin-stock admin-stock-low">
                                    Low: {low.map((variant) => `${variant.color} / ${variant.size} (${variant.stock})`).join(', ')}
                                  </span>
                                );
                              }

                              return <span className="admin-stock">{stock}</span>;
                            })()}
                          </td>

                          <td>{product.isFeatured ? 'Yes' : 'No'}</td>

                          <td>
                            <div className="admin-row-actions">
                              <button
                                type="button"
                                className="admin-button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleEdit(product);
                                }}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="admin-button admin-button-danger"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDelete(product);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && (
              <Pagination
                pagination={pagination}
                onPageChange={(next) => {
                  setLoading(true);
                  setPage(next);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                itemLabel="products"
              />
            )}
          </section>


      {viewing && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setViewing(null)}
          role="presentation"
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-head">
              <h2 id="product-modal-title" className="admin-panel-title">
                {viewing.name}
              </h2>
              <button
                type="button"
                className="admin-icon-button"
                aria-label="Close"
                onClick={() => setViewing(null)}
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-modal-image">
                {getProductImage(viewing) && !brokenImages[viewing._id] ? (
                  <img
                    src={getProductImage(viewing)}
                    alt={viewing.name || 'Product'}
                    onError={() =>
                      setBrokenImages((current) => ({ ...current, [viewing._id]: true }))
                    }
                  />
                ) : (
                  <span className="admin-muted">No image</span>
                )}
              </div>

              <dl className="admin-modal-details">
                <dt>Price</dt>
                <dd>{formatPrice(viewing.price)}</dd>
                <dt>Category</dt>
                <dd>{viewing.category || '—'}</dd>
                <dt>Gender</dt>
                <dd>{viewing.gender || 'Unisex'}</dd>
                <dt>Stock</dt>
                <dd>{Number(viewing.stock) || 0}</dd>
                <dt>Sizes</dt>
                <dd>{(viewing.sizes || []).join(', ') || '—'}</dd>
                <dt>Colors</dt>
                <dd>{(viewing.colors || []).join(', ') || '—'}</dd>
                <dt>Featured</dt>
                <dd>{viewing.isFeatured ? 'Yes' : 'No'}</dd>
                <dt>Rating</dt>
                <dd>
                  {Number(viewing.ratingCount) > 0
                    ? `${Number(viewing.ratingAverage).toFixed(1)} (${viewing.ratingCount})`
                    : 'No reviews'}
                </dd>
              </dl>

              {viewing.description && (
                <p className="admin-muted admin-modal-description">{viewing.description}</p>
              )}

              <div className="admin-row-actions">
                <button
                  type="button"
                  className="admin-button admin-button-primary"
                  onClick={() => {
                    const product = viewing;
                    setViewing(null);
                    handleEdit(product);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="admin-button admin-button-danger"
                  onClick={() => {
                    const product = viewing;
                    setViewing(null);
                    handleDelete(product);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminProducts;
