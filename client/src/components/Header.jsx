
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

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
          <button type="button" onClick={() => goTo('/home')}>Home</button>
          <button type="button" onClick={() => goTo('/products')}>Shop</button>
          <button type="button" onClick={() => goTo('/men')}>Men</button>
          <button type="button" onClick={() => goTo('/women')}>Women</button>
          <button type="button" onClick={() => goTo('/unisex')}>Unisex</button>
          <button type="button" onClick={() => goTo('/new-arrivals')}>New Arrivals</button>
          
        </nav>

        
<div className="header-actions">
  <button type="button" onClick={() => goTo('/products?search=')}>
    Search
  </button>

  <button type="button" onClick={() => goTo('/wishlist')}>
    Wishlist
  </button>

  <button type="button" onClick={() => goTo('/profile')}>
    Profile
  </button>

  <button type="button" onClick={() => goTo('/cart')}>
    Cart
  </button>

  <button type="button" onClick={handleLogout}>
    Logout
  </button>
</div>

      </div>
    </header>
  );
};

export default Header;
