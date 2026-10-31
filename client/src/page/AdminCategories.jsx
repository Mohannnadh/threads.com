import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getCategorySummary,
  createCategory,
  moveCategoryProducts,
  setCategoryStatus,
  renameCategory,
} from '../services/productService.js';
import AdminLayout, { Notice } from '../components/AdminLayout.jsx';
import '../styles/admin.css';

const titleCase = (text) => text.replace(/\b\w/g, (letter) => letter.toUpperCase());

const AdminCategories = () => {
  const { token } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(null);
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;

    getCategorySummary()
      .then((list) => {
        if (active) setCategories(list);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load categories.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const handleCreate = async (event) => {
    event.preventDefault();

    const name = newName.trim();

    setError('');
    setNotice('');
    setCreating(true);

    try {
      await createCategory(name, token);

      setNotice(`"${titleCase(name.toLowerCase())}" added. Choose it when you add products.`);
      setNewName('');
      setLoading(true);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Could not add the category.');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (category) => {
    setError('');
    setNotice('');
    setBusy(true);

    try {
      await setCategoryStatus(category.name, !category.isActive, token);

      setNotice(
        category.isActive
          ? `"${titleCase(category.name)}" is hidden from the shop. Its products stay in place.`
          : `"${titleCase(category.name)}" is active again and visible in the shop.`
      );
      setLoading(true);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Could not change the category.');
    } finally {
      setBusy(false);
    }
  };

  const startRename = (category) => {
    setError('');
    setNotice('');
    setPending(null);
    setRenaming(category);
    setRenameValue(category.name);
  };

  const confirmRename = async () => {
    if (!renaming || !renameValue.trim()) return;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const result = await renameCategory(renaming.name, renameValue.trim(), token);

      setNotice(`Renamed to "${titleCase(result.name)}". ${result.moved} product(s) updated.`);
      setRenaming(null);
      setLoading(true);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Could not rename the category.');
    } finally {
      setBusy(false);
    }
  };

  const others = (name) => categories.filter((category) => category.name !== name);

  const startDelete = (category) => {
    setError('');
    setNotice('');
    setPending(category);
    setTarget(others(category.name)[0]?.name || '');
  };

  const confirmDelete = async () => {
    if (!pending || (pending.count > 0 && !target)) return;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const result = await moveCategoryProducts(pending.name, target, token);

      setNotice(
        pending.count > 0
          ? `"${titleCase(pending.name)}" deleted. ${result.moved} product(s) moved to "${titleCase(target)}".`
          : `"${titleCase(pending.name)}" deleted.`
      );
      setPending(null);
      setLoading(true);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Could not delete the category.');
    } finally {
      setBusy(false);
    }
  };

  const query = search.trim().toLowerCase();
  const visible = categories.filter(
    (category) =>
      !query ||
      category.name.includes(query) ||
      titleCase(category.name).toLowerCase().includes(query)
  );

  const subtitle = loading
    ? ''
    : `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`;

  return (
    <AdminLayout title="Categories" subtitle={subtitle}>
      {error && (
        <Notice tone="error" onClose={() => setError('')}>
          {error}
        </Notice>
      )}

      {notice && <Notice onClose={() => setNotice('')}>{notice}</Notice>}

      <section className="admin-panel" style={{ marginBottom: 20 }}>
        <form className="admin-toolbar" onSubmit={handleCreate}>
          <input
            type="text"
            className="admin-search"
            placeholder="New category name, e.g. Hoodies"
            aria-label="New category name"
            maxLength={40}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <button
            type="submit"
            className="admin-button admin-button-primary"
            disabled={creating || !newName.trim()}
          >
            {creating ? 'Adding…' : 'Add category'}
          </button>
        </form>
      </section>

      <section className="admin-panel">
        {loading ? (
          <p className="admin-empty">Loading categories…</p>
        ) : categories.length === 0 ? (
          <p className="admin-empty">No categories yet. Add a product to create one.</p>
        ) : (<>
          <div className="admin-toolbar">
            <input
              type="search"
              className="admin-search"
              placeholder="Search categories"
              aria-label="Search categories"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <p className="admin-muted" aria-live="polite">
              {visible.length} of {categories.length} shown
            </p>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num">Products</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {visible.map((category) => (
                  <tr key={category.name}>
                    <td>
                      <span className="admin-product-name">{titleCase(category.name)}</span>
                    </td>
                    <td className="num">{category.count}</td>
                    <td>
                      <span className={`admin-pill admin-pill-${category.isActive ? 'success' : 'neutral'}`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-button"
                        disabled={busy}
                        onClick={() => startRename(category)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button-primary"
                        disabled={busy}
                        onClick={() => toggleActive(category)}
                      >
                        {category.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button-danger"
                        disabled={busy}
                        onClick={() => startDelete(category)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      {renaming && (
        <section className="admin-panel" style={{ marginTop: 20 }}>
          <h3 className="admin-panel-title">Rename "{titleCase(renaming.name)}"</h3>
          <p className="admin-muted">
            Its {renaming.count} product(s) will use the new name.
          </p>

          <div className="admin-form-grid">
            <label className="admin-field">
              <span>New name</span>
              <input
                type="text"
                maxLength={40}
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
              />
            </label>
          </div>

          <div className="admin-form-actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="admin-button admin-button-primary"
              disabled={busy || !renameValue.trim()}
              onClick={confirmRename}
            >
              {busy ? 'Saving…' : 'Save name'}
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() => setRenaming(null)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {pending && (
        <section className="admin-panel" style={{ marginTop: 20 }}>
          <h3 className="admin-panel-title">Delete "{titleCase(pending.name)}"</h3>

          {pending.count === 0 ? (
            <p className="admin-muted">
              This category has no products, so it will be deleted straight away.
            </p>
          ) : others(pending.name).length === 0 ? (
            <p className="admin-muted">
              Add another category first. These products need somewhere to go.
            </p>
          ) : (
            <>
              <p className="admin-muted">
                Its {pending.count} product(s) will be moved to the category you choose.
              </p>

              <div className="admin-form-grid">
                <label className="admin-field">
                  <span>Move products to</span>
                  <select value={target} onChange={(event) => setTarget(event.target.value)}>
                    {others(pending.name).map((category) => (
                      <option key={category.name} value={category.name}>
                        {titleCase(category.name)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}

          <div className="admin-form-actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="admin-button admin-button-danger"
              disabled={busy || (pending.count > 0 && !target)}
              onClick={confirmDelete}
            >
              {busy ? 'Deleting…' : 'Delete category'}
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </AdminLayout>
  );
};

export default AdminCategories;
