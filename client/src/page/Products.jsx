import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getProducts, getProductCategories } from '../services/productService';
import ProductCard from '../components/ProductCard.jsx';
import Pagination from '../components/Pagination.jsx';
import useDebouncedValue from '../hooks/useDebouncedValue.js';

const PAGE_SIZE = 12;

const labelStyle = {
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#555',
};

const priceInputStyle = {
  boxSizing: 'border-box',
  width: '90px',
  padding: '8px 10px',
  border: '1px solid #ddd',
  backgroundColor: '#fff',
  color: '#111',
  fontSize: '12px',
};

const selectStyle = {
  marginLeft: '8px',
  border: 'none',
  backgroundColor: 'transparent',
  fontSize: '10px',
  color: '#111',
  cursor: 'pointer',
  outline: 'none',
};

// Keeps only a non-negative number; anything else means no limit.
const normalizePrice = (value) => {
  const text = String(value ?? '').trim();
  const number = Number(text);

  return text !== '' && Number.isFinite(number) && number >= 0 ? String(number) : '';
};

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef(null);

  // Filters live in the URL so a filtered view can be shared or bookmarked.
  const search = searchParams.get('search') || '';
  const gender = searchParams.get('gender') || 'all';
  const category = searchParams.get('category') || 'all';
  const sort = searchParams.get('sort') || 'recent';
  const featured = searchParams.get('featured') === '1';
  const minPrice = normalizePrice(searchParams.get('minPrice'));
  const maxPrice = normalizePrice(searchParams.get('maxPrice'));
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);

  // The search box updates the URL after a short pause, not on each keystroke.
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 350);

  // If the URL search changes from outside (header search, back button),
  // copy it into the box. Done during render to avoid an extra effect pass.
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setSearchInput(search);
  }

  // Price inputs. Typing is applied after a pause; URL changes (e.g. Clear Filters) refill the inputs.
  const [minInput, setMinInput] = useState(minPrice);
  const [maxInput, setMaxInput] = useState(maxPrice);
  const [lastPrice, setLastPrice] = useState({ min: minPrice, max: maxPrice });

  if (minPrice !== lastPrice.min || maxPrice !== lastPrice.max) {
    setLastPrice({ min: minPrice, max: maxPrice });
    setMinInput(minPrice);
    setMaxInput(maxPrice);
  }

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Writes filter changes to the URL. Any change other than a page change
  // returns to page 1. Empty and default values are left out of the URL.
  const updateParams = useCallback(
    (changes, { replace = true } = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          Object.entries(changes).forEach(([key, value]) => {
            const isDefault =
              value === '' ||
              value === null ||
              value === undefined ||
              value === 'all' ||
              (key === 'sort' && value === 'recent') ||
              (key === 'page' && Number(value) <= 1);

            if (isDefault) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });

          if (!('page' in changes)) {
            next.delete('page');
          }

          return next;
        },
        { replace }
      );
    },
    [setSearchParams]
  );

  // Write the debounced search text to the URL.
  useEffect(() => {
    // Only write text the user is typing now. A debounced value left over from
    // before Clear Filters must not bring the old search back into the URL.
    if (debouncedSearch === searchInput.trim() && debouncedSearch !== search.trim()) {
      updateParams({ search: debouncedSearch });
    }
  }, [debouncedSearch, searchInput, search, updateParams]);

  // Write the price range to the URL after the user pauses typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      const min = normalizePrice(minInput);
      const max = normalizePrice(maxInput);

      if (min !== minPrice || max !== maxPrice) {
        setLoading(true);
        updateParams({ minPrice: min, maxPrice: max });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [minInput, maxInput, minPrice, maxPrice, updateParams]);

  // Focus the search box when arriving with a search in the URL.
  useEffect(() => {
    if (searchParams.has('search')) {
      searchInputRef.current?.focus();
    }
    // Only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Categories for the filter dropdown.
  useEffect(() => {
    let cancelled = false;

    getProductCategories()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch(() => {
        // Filter stays usable with "All categories" if this fails.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load the current page of products whenever a filter or page changes.
  useEffect(() => {
    let cancelled = false;

    // Set here, next to the fetch that clears it, so the list can never stay dimmed
    // when a click (such as Clear Filters) leaves the URL unchanged.
    setLoading(true);

    getProducts({ page, limit: PAGE_SIZE, search, gender, category, sort, minPrice, maxPrice, featured: featured ? 'true' : '' })
      .then((data) => {
        if (cancelled) return;

        // If the page no longer exists (e.g. after narrowing filters), go to the last one.
        if (
          data.products.length === 0 &&
          data.pagination.totalPages > 0 &&
          page > data.pagination.totalPages
        ) {
          updateParams({ page: data.pagination.totalPages }, { replace: true });
          return;
        }

        setError('');
        setProducts(data.products);
        setPagination(data.pagination);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load products. Please try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, search, gender, category, sort, minPrice, maxPrice, featured, updateParams]);

  // Event handlers set loading before changing the URL, so the list dims while fetching.
  const changeFilter = (changes) => {
    setLoading(true);
    updateParams(changes);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setMinInput('');
    setMaxInput('');
    changeFilter({ search: '', gender: 'all', category: 'all', minPrice: '', maxPrice: '', featured: '' });
  };

  const categoryOptions = [
    ...new Set(categories.map((item) => item.toLowerCase())),
  ];

  const total = pagination?.total ?? 0;
  const showGrid = products.length > 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff', color: '#111' }}>
      <main>
        <section
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '70px 32px 50px',
            borderBottom: '1px solid #111',
          }}
        >
          <p
            style={{
              margin: '0 0 14px',
              fontSize: '10px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#777',
            }}
          >
            SHOP
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(48px, 7vw, 92px)',
              lineHeight: 0.9,
              letterSpacing: '-0.06em',
              fontWeight: 500,
              color: '#111',
            }}
          >
            ALL PRODUCTS
          </h1>
        </section>

        <section
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '40px 32px 100px',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '30px',
              paddingBottom: '18px',
              borderBottom: '1px solid #111',
            }}
          >
            <input
              ref={searchInputRef}
              type="search"
              aria-label="Search products"
              placeholder="Search products..."
              value={searchInput}
              onChange={(event) => {
                setLoading(true);
                setSearchInput(event.target.value);
              }}
              style={{
                boxSizing: 'border-box',
                padding: '10px 12px',
                border: '1px solid #ddd',
                backgroundColor: '#fff',
                color: '#111',
                fontSize: '12px',
                minWidth: '180px',
                maxWidth: '100%',
              }}
            />

            <p
              aria-live="polite"
              style={{ ...labelStyle, margin: 0, letterSpacing: '0.12em' }}
            >
              {total} PRODUCTS
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <label style={labelStyle}>
                CATEGORY
                <select
                  value={category}
                  onChange={(event) =>
                    changeFilter({ category: event.target.value })
                  }
                  style={selectStyle}
                >
                  <option value="all">All Categories</option>
                  {categoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                GENDER
                <select
                  value={gender}
                  onChange={(event) =>
                    changeFilter({ gender: event.target.value })
                  }
                  style={selectStyle}
                >
                  <option value="all">All</option>
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                  <option value="unisex">Unisex</option>
                </select>
              </label>

              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  padding: '8px 0',
                  border: 'none',
                  borderBottom: '1px solid #111',
                  backgroundColor: 'transparent',
                  color: '#111',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Clear Filters
              </button>

              <div
                role="group"
                aria-label="Price range"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span style={labelStyle}>PRICE ₹</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="Min"
                  aria-label="Minimum price"
                  value={minInput}
                  onChange={(event) => setMinInput(event.target.value)}
                  style={priceInputStyle}
                />
                <span style={labelStyle}>TO</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="Max"
                  aria-label="Maximum price"
                  value={maxInput}
                  onChange={(event) => setMaxInput(event.target.value)}
                  style={priceInputStyle}
                />
              </div>

              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(event) => changeFilter({ featured: event.target.checked ? '1' : '' })}
                />
                FEATURED ONLY
              </label>

              <label htmlFor="sort-products" style={labelStyle}>
                SORT BY
                <select
                  id="sort-products"
                  value={sort}
                  onChange={(event) => changeFilter({ sort: event.target.value })}
                  style={{ ...selectStyle, letterSpacing: '0.04em' }}
                >
                  <option value="recent">Recently Added</option>
                  <option value="low-high">Price: Low to High</option>
                  <option value="high-low">Price: High to Low</option>
                </select>
              </label>
            </div>
          </div>

          {/* States */}
          {loading && !showGrid && (
            <p role="status" style={{ textAlign: 'center', padding: '80px 0', color: '#555' }}>
              Loading products...
            </p>
          )}

          {!loading && error && (
            <div role="alert" style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 16px',
                  border: '1px solid #111',
                  backgroundColor: '#fff',
                  color: '#111',
                  cursor: 'pointer',
                }}
              >
                TRY AGAIN
              </button>
            </div>
          )}

          {!loading && !error && !showGrid && (
            <p style={{ textAlign: 'center', padding: '80px 0', fontSize: '14px', color: '#555' }}>
              No products found. Try changing your search or filters.
            </p>
          )}

          {showGrid && !error && (
            <div
              className="products-grid"
              aria-busy={loading}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 280px))',
                gap: '32px 20px',
                alignItems: 'start',
                opacity: loading ? 0.45 : 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          {!error && (
            <Pagination
              pagination={pagination}
              variant="shop"
              itemLabel="products"
              disabled={loading}
              onPageChange={(next) => {
                setLoading(true);
                updateParams({ page: next }, { replace: false });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
};

export default Products;
