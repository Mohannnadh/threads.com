
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getProducts } from '../services/productService';
import ProductCard from '../components/ProductCard.jsx';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [sortBy, setSortBy] = useState('recent');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef(null);

  // 1. Fetch products from the backend
  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await getProducts();

        // Support common API response formats
        const productList = Array.isArray(response)
          ? response
          : Array.isArray(response?.products)
            ? response.products
            : Array.isArray(response?.data?.products)
              ? response.data.products
              : null;

        if (!productList) {
          throw new Error(
            'Could not load products. Please check the backend response.'
          );
        }

        if (isMounted) {
          setProducts(productList);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Failed to load products. Please try again.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Read search text passed from the Header
  useEffect(() => {
    const query = searchParams.get('search') || '';
    setSearchTerm(query);

    if (searchParams.has('search')) {
      searchInputRef.current?.focus();
    }
  }, [searchParams]);

  // 3. Filter products by search, category, and gender
  const filteredProducts = products.filter((product) => {
    const name = String(product?.name || '').toLowerCase();
    const category = String(product?.category || '');
    const gender = String(product?.gender || '').toLowerCase();

    const matchesSearch = name.includes(searchTerm.trim().toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ||
      category === selectedCategory;

    const matchesGender =
      selectedGender === 'all' ||
      gender === selectedGender;

    return matchesSearch && matchesCategory && matchesGender;
  });

  // 4. Sort the filtered products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const priceA = Number(a?.price) || 0;
    const priceB = Number(b?.price) || 0;

    if (sortBy === 'low-high') {
      return priceA - priceB;
    }

    if (sortBy === 'high-low') {
      return priceB - priceA;
    }

    // Recently added: newest products first
    const dateA = new Date(a?.createdAt || 0).getTime();
    const dateB = new Date(b?.createdAt || 0).getTime();

    return (
      (Number.isNaN(dateB) ? 0 : dateB) -
      (Number.isNaN(dateA) ? 0 : dateA)
    );
  });

  // 5. Get categories dynamically from the products
  const categories = [
    ...new Set(
      products
        .map((product) => product?.category)
        .filter(Boolean)
    ),
  ];

  // 6. Clear filters and search
  const handleClearFilters = () => {
    setSelectedCategory('all');
    setSelectedGender('all');
    setSearchTerm('');

    // Remove the search parameter from the URL
    if (searchParams.has('search')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('search');
      setSearchParams(nextParams);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#fff',
        color: '#111',
      }}
    >
      

      <main>
        {/* Page Introduction */}
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

        {/* Products Section */}
        <section
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '40px 32px 100px',
          }}
        >
          {/* Product Toolbar */}
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
            {/* Search */}
            <input
              ref={searchInputRef}
              type="search"
              aria-label="Search products"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(event) => {
                const value = event.target.value;
                setSearchTerm(value);

                // Keep the search in the URL for sharing/navigation
                const nextParams = new URLSearchParams(searchParams);

                if (value.trim()) {
                  nextParams.set('search', value);
                } else {
                  nextParams.delete('search');
                }

                setSearchParams(nextParams, { replace: true });
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

            {/* Product Count */}
            <p
              style={{
                margin: 0,
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#555',
              }}
            >
              {filteredProducts.length} PRODUCTS
            </p>

            {/* Filters and Sorting */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              {/* Category Filter */}
              <label
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#555',
                }}
              >
                CATEGORY

                <select
                  value={selectedCategory}
                  onChange={(event) =>
                    setSelectedCategory(event.target.value)
                  }
                  style={{
                    marginLeft: '8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '10px',
                    color: '#111',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="all">All Categories</option>

                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              {/* Gender Filter */}
              <label
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#555',
                }}
              >
                GENDER

                <select
                  value={selectedGender}
                  onChange={(event) =>
                    setSelectedGender(event.target.value)
                  }
                  style={{
                    marginLeft: '8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '10px',
                    color: '#111',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="all">All</option>
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                  <option value="unisex">Unisex</option>
                </select>
              </label>

              {/* Clear Filters */}
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

              {/* Sort Products */}
              <label
                htmlFor="sort-products"
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#555',
                }}
              >
                SORT BY

                <select
                  id="sort-products"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  style={{
                    marginLeft: '8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '10px',
                    letterSpacing: '0.04em',
                    color: '#111',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="recent">Recently Added</option>
                  <option value="low-high">Price: Low to High</option>
                  <option value="high-low">Price: High to Low</option>
                </select>
              </label>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <p
              role="status"
              style={{
                textAlign: 'center',
                padding: '80px 0',
                color: '#555',
              }}
            >
              Loading products...
            </p>
          )}

          {/* Error State */}
          {!loading && error && (
            <div
              role="alert"
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#555',
              }}
            >
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

          {/* Product Grid */}
          {!loading && !error && sortedProducts.length === 0 && (
            <p
              style={{
                textAlign: 'center',
                padding: '80px 0',
                fontSize: '14px',
                color: '#555',
              }}
            >
              No products found. Try changing your search or filters.
            </p>
          )}

          {!loading && !error && sortedProducts.length > 0 && (
            <div
              className="products-grid"
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                gap: '32px 20px',
              }}
            >
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      
    </div>
  );
};

export default Products;
