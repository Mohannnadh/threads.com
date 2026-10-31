import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategorySummary } from '../services/productService.js';
import '../styles/categories.css';

const titleCase = (text) => text.replace(/\b\w/g, (letter) => letter.toUpperCase());

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getCategorySummary()
      .then((list) => {
        if (active) setCategories(list.filter((category) => category.count > 0 && category.isActive));
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
  }, []);

  return (
    <main className="cat-page">
      <p className="cat-eyebrow">SHOP BY CATEGORY</p>
      <h1 className="cat-title">CATEGORIES</h1>

      {loading && <p className="cat-note">Loading categories…</p>}
      {error && <p className="cat-error" role="alert">{error}</p>}

      {!loading && !error && categories.length === 0 && (
        <p className="cat-note">No categories yet.</p>
      )}

      <ul className="cat-grid">
        {categories.map((category) => (
          <li key={category.name}>
            <Link
              to={`/products?category=${encodeURIComponent(category.name)}`}
              className="cat-tile"
            >
              <span
                className="cat-image"
                style={category.image ? { backgroundImage: `url("${category.image}")` } : undefined}
              >
                {!category.image && (
                  <span className="cat-placeholder">
                    {titleCase(category.name).charAt(0)}
                  </span>
                )}
              </span>
              <span className="cat-name">{titleCase(category.name)}</span>
              <span className="cat-count">
                {category.count} {category.count === 1 ? 'product' : 'products'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default Categories;
