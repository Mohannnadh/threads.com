
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {getProducts,createProduct,updateProduct,deleteProduct,} from '../services/productService.js';
import '../styles/admin.css';

const initialForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  gender: 'unisex',
  images: '',
  sizes: 'S, M, L, XL',
  colors: 'Black, White',
  stock: '0',
  isFeatured: false,
};

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);

function AdminProducts() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getProducts();
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message || 'Unable to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) =>
      [
        product.name,
        product.category,
        product.gender,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    );
  }, [products, search]);

  const inStockCount = products.filter(
    (product) => Number(product.stock) > 0
  ).length;

  const lowStockCount = products.filter(
    (product) => Number(product.stock) <= 5
  ).length;

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
  };

  const handleEdit = (product) => {
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
      stock: String(product.stock ?? 0),
      isFeatured: Boolean(product.isFeatured),
    });

    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.category.trim()
    ) {
      setError('Please fill in the product name, description, and category.');
      return;
    }

    if (form.price.trim() === '' || Number(form.price) < 0 ||
        !Number.isFinite(Number(form.price))) {
      setError('Enter a valid price greater than or equal to zero.');
      return;
    }

    if (
      form.stock.trim() === '' ||
      !Number.isInteger(Number(form.stock)) ||
      Number(form.stock) < 0
    ) {
      setError('Stock must be a non-negative whole number.');
      return;
    }

    const productData = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      images: form.images.split(',').map((item) => item.trim()).filter(Boolean),
      sizes: form.sizes.split(',').map((item) => item.trim()).filter(Boolean),
      colors: form.colors.split(',').map((item) => item.trim()).filter(Boolean),
    };

    try {
      setSaving(true);

      if (editingId) {
        await updateProduct(editingId, productData, token);
        setSuccess('Product updated successfully.');
      } else {
        await createProduct(productData, token);
        setSuccess('Product created successfully.');
      }

      resetForm();
      await loadProducts();
    } catch (err) {
      setError(err.message || 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await deleteProduct(product._id, token);

      if (editingId === product._id) {
        resetForm();
      }

      setSuccess('Product deleted successfully.');
      await loadProducts();
    } catch (err) {
      setError(err.message || 'Unable to delete product.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            
            <span className="admin-brand-mark">T</span>
            <div>
              <strong>THREADS.COM</strong>
              <span>ADMIN STUDIO</span>
            </div>
          </div>

          <div className="admin-nav-label">WORKSPACE</div>

          
<nav className="admin-nav">
  <NavLink
    to="/admin"
    end
    className={({ isActive }) => (isActive ? 'active' : '')}
  >
    <span>▦</span> Overview
  </NavLink>

  <NavLink
    to="/admin/products"
    className={({ isActive }) => (isActive ? 'active' : '')}
  >
    <span>◫</span> Products
  </NavLink>

  
<NavLink
  to="/admin/orders"
  className={({ isActive }) => (isActive ? 'active' : '')}
>
  <span>▤</span> Orders
</NavLink>


  <a
    href="#customers"
    onClick={(event) => event.preventDefault()}
    title="Customer management is coming next"
  >
    <span>♙</span> Customers
    <small>Soon</small>
  </a>
</nav>


          <div className="admin-sidebar-footer">
            <div className="admin-avatar">A</div>
            <div className="admin-user-info">
              <strong>Administrator</strong>
              <span>Store management</span>
            </div>
            <button
              type="button"
              className="admin-logout"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              ↗
            </button>
          </div>
        </aside>

        <main className="admin-main" id="products">
          <header className="admin-topbar">
            <div>
              <div className="admin-eyebrow">STORE MANAGEMENT / PRODUCTS</div>
              <h1 className="admin-title">Product management</h1>
              <p className="admin-subtitle">
                Manage your catalogue, pricing, and inventory in one place.
              </p>
            </div>

            <button
              type="button"
              className="admin-button admin-button-primary"
              onClick={() => {
                resetForm();
                setError('');
                setSuccess('');
                document.getElementById('product-form')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }}
            >
              + Add product
            </button>
          </header>

          {error && (
            <div className="admin-notice admin-notice-error" role="alert">
              <span>!</span> {error}
              <button type="button" onClick={() => setError('')}>
                ×
              </button>
            </div>
          )}

          {success && (
            <div className="admin-notice" role="status">
              <span>✓</span> {success}
              <button type="button" onClick={() => setSuccess('')}>
                ×
              </button>
            </div>
          )}

          <section className="admin-stats" aria-label="Product statistics">
            <article className="admin-stat-card">
              <div className="admin-stat-label">TOTAL PRODUCTS</div>
              <div className="admin-stat-value">{products.length}</div>
              <div className="admin-muted">Products in your catalogue</div>
            </article>

            <article className="admin-stat-card">
              <div className="admin-stat-label">AVAILABLE PRODUCTS</div>
              <div className="admin-stat-value">{inStockCount}</div>
              <div className="admin-muted">Products with stock available</div>
            </article>

            <article className="admin-stat-card">
              <div className="admin-stat-label">LOW / OUT OF STOCK</div>
              <div className="admin-stat-value">{lowStockCount}</div>
              <div className="admin-muted">Products with 5 units or fewer</div>
            </article>
          </section>

          <section className="admin-panel" id="product-form">
            <div className="admin-panel-header">
              <div>
                <h2 className="admin-panel-title">
                  {editingId ? 'Edit product' : 'Add a new product'}
                </h2>
                <p className="admin-muted">
                  {editingId
                    ? 'Update the product details below.'
                    : 'Enter the details to add an item to your catalogue.'}
                </p>
              </div>

              {editingId && (
                <span className="admin-stock">EDITING</span>
              )}
            </div>

            <form onSubmit={handleSubmit}>
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
                  <label htmlFor="category">Category *</label>
                  <input
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="e.g. T-shirts"
                    required
                  />
                </div>

                <div className="admin-field admin-field-full">
                  <label htmlFor="description">Description *</label>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the product..."
                    rows={3}
                    required
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="price">Price (₹) *</label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="999"
                    required
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="stock">Stock quantity *</label>
                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                  >
                    <option value="unisex">Unisex</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                  </select>
                </div>

                <div className="admin-field">
                  <label htmlFor="sizes">Sizes</label>
                  <input
                    id="sizes"
                    name="sizes"
                    value={form.sizes}
                    onChange={handleChange}
                    placeholder="S, M, L, XL"
                  />
                  <small className="admin-muted">Separate with commas.</small>
                </div>

                <div className="admin-field">
                  <label htmlFor="colors">Colors</label>
                  <input
                    id="colors"
                    name="colors"
                    value={form.colors}
                    onChange={handleChange}
                    placeholder="Black, White"
                  />
                  <small className="admin-muted">Separate with commas.</small>
                </div>

                <div className="admin-field admin-field-full">
                  <label htmlFor="images">Image URLs</label>
                  <textarea
                    id="images"
                    name="images"
                    value={form.images}
                    onChange={handleChange}
                    placeholder="https://example.com/product.jpg"
                    rows={2}
                  />
                  <small className="admin-muted">
                    Add image URLs separated by commas.
                  </small>
                </div>

                <div className="admin-field admin-field-full">
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={form.isFeatured}
                      onChange={handleChange}
                    />
                    <span>Feature this product in the store</span>
                  </label>
                </div>
              </div>

              <div className="admin-form-actions">
                {editingId && (
                  <button
                    type="button"
                    className="admin-button"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    Cancel edit
                  </button>
                )}

                <button
                  type="submit"
                  className="admin-button admin-button-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Save changes'
                      : 'Create product'}
                </button>
              </div>
            </form>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2 className="admin-panel-title">Your products</h2>
                <p className="admin-muted">
                  {filteredProducts.length} of {products.length} products
                </p>
              </div>

              <button
                type="button"
                className="admin-button"
                onClick={loadProducts}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : '↻ Refresh'}
              </button>
            </div>

            <div className="admin-table-toolbar">
              <input
                className="admin-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by product, category, or gender..."
                aria-label="Search products"
              />
            </div>

            {loading ? (
              <div className="admin-empty">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
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
                    {filteredProducts.map((product) => {
                      const stock = Number(product.stock) || 0;

                      return (
                        <tr key={product._id}>
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
                            <span
                              className={`admin-stock ${
                                stock === 0
                                  ? 'admin-stock-out'
                                  : stock <= 5
                                    ? 'admin-stock-low'
                                    : ''
                              }`}
                            >
                              {stock === 0
                                ? 'Out of stock'
                                : stock <= 5
                                  ? `${stock} left`
                                  : stock}
                            </span>
                          </td>

                          <td>{product.isFeatured ? 'Yes' : 'No'}</td>

                          <td>
                            <div className="admin-row-actions">
                              <button
                                type="button"
                                className="admin-button"
                                onClick={() => handleEdit(product)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="admin-button admin-button-danger"
                                onClick={() => handleDelete(product)}
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
          </section>

          <footer className="admin-muted admin-page-footer">
            THREADS.COM · ADMIN STUDIO
          </footer>
        </main>
      </div>
    </div>
  );
}

export default AdminProducts;
