
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Header.css';
import { Icon } from './Icon.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';

const Header = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlistItems } = useWishlist();
  const wishlistCount = wishlistItems.length;
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const categoryMenuRef = useRef(null);

  // Close the categories menu when clicking anywhere outside it.
  useEffect(() => {
    if (!categoryMenuOpen) return undefined;

    const handleOutside = (event) => {
      if (!categoryMenuRef.current?.contains(event.target)) {
        setCategoryMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [categoryMenuOpen]);

  const goTo = (path) => {
    setMenuOpen(false);
    setProfileOpen(false);
    setCategoryMenuOpen(false);
    navigate(path);
  };



  const handleLogout = () => {
    console.log('Logout button clicked');

    setMenuOpen(false);
    setProfileOpen(false);

    logout();
    console.log('Logout function executed');

    navigate('/login', { replace: true });
  };



  // Opens the shop with the typed search.
  const submitSearch = (event) => {
    event.preventDefault();

    const term = searchText.trim();

    if (!term) return;

    setSearchOpen(false);
    setSearchText('');
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  // Escape closes the search bar.
  useEffect(() => {
    if (!searchOpen) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          type="button"
          className="header-logo"
          onClick={() => goTo('/home')}
        >
          THREADS.COM
        </button>

        <button
          type="button"
          className="mobile-menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'CLOSE' : 'MENU'}
        </button>

        <nav
          className={`header-nav ${menuOpen ? 'is-open' : ''}`}
          aria-label="Main navigation"
        >
          <button type="button" onClick={() => goTo('/home')}>
            Home
          </button>
          <button type="button" onClick={() => goTo('/products')}>
            Shop
          </button>
          <div className="nav-dropdown" ref={categoryMenuRef}>
            <button
              type="button"
              className="nav-dropdown-toggle"
              aria-haspopup="menu"
              aria-expanded={categoryMenuOpen}
              onClick={() => setCategoryMenuOpen((open) => !open)}
            >
              Categories
            </button>

            {categoryMenuOpen && (
              <div className="nav-dropdown-menu" role="menu">
                <span className="nav-dropdown-group">By gender</span>
                <button type="button" role="menuitem" onClick={() => goTo('/products?gender=men')}>
                  Men
                </button>
                <button type="button" role="menuitem" onClick={() => goTo('/products?gender=women')}>
                  Women
                </button>
                <button type="button" role="menuitem" onClick={() => goTo('/products?gender=unisex')}>
                  Unisex
                </button>

              </div>
            )}
          </div>

          <button type="button" onClick={() => goTo('/products?sort=recent')}>
            New Arrivals
          </button>
        </nav>


        <div className="header-actions">
          <button
            type="button"
            aria-label="Search products"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
          >
            Search
          </button>

          <button
            type="button"
            className="header-icon-button"
            aria-label={`Wishlist, ${wishlistCount} items`}
            onClick={() => goTo('/wishlist')}
          >
            <Icon name="heart" size={20} />
            {wishlistCount > 0 && (
              <span className="header-badge">{wishlistCount > 99 ? '99+' : wishlistCount}</span>
            )}
          </button>


          <button
            type="button"
            className="header-icon-button"
            aria-label={`Cart, ${cartCount} items`}
            onClick={() => goTo('/cart')}
          >
            <Icon name="bag" size={20} />
            {cartCount > 0 && (
              <span className="header-badge">{cartCount > 99 ? '99+' : cartCount}</span>
            )}
          </button>

          <div className="profile-menu">
            <button
              type="button"
              className="profile-toggle"
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="profile-icon" aria-hidden="true"><Icon name="user" size={20} /></span>
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <button type="button" onClick={() => {
                  setProfileOpen(false);
                  goTo('/profile');
                }}>
                  My Profile
                </button>

                <button type="button" onClick={() => {
                  setProfileOpen(false);
                  goTo('/orders');
                }}>
                  My Orders
                </button>

                <button type="button" onClick={() => {
                  setProfileOpen(false);
                  goTo('/wallet');
                }}>
                  My Wallet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    console.log('Logout button clicked');
                    handleLogout();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>

        </div>

        {searchOpen && (
          <form
            role="search"
            onSubmit={submitSearch}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 24px',
              background: '#fff',
              borderBottom: '1px solid #ddd',
              boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
            }}
          >
            <input
              type="search"
              autoFocus
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search for products, colours, sizes or categories"
              aria-label="Search products"
              style={{ flex: 1, padding: '12px 14px', border: '1px solid #111', fontSize: '15px', outline: 'none' }}
            />
            <button
              type="submit"
              disabled={!searchText.trim()}
              style={{
                padding: '12px 22px',
                border: '1px solid #111',
                background: '#111',
                color: '#fff',
                cursor: searchText.trim() ? 'pointer' : 'not-allowed',
                opacity: searchText.trim() ? 1 : 0.5,
              }}
            >
              Search
            </button>
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setSearchOpen(false)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px 8px' }}
            >
              ✕
            </button>
          </form>
        )}

      </div>
    </header>
  );
};

export default Header;
