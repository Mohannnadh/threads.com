



import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        {/* Main Footer */}
        <div className="footer-main-grid">
          {/* Brand and Socials */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo" aria-label="Threads home">
              THREADS.COM
            </Link>

            <p className="footer-description">
              Crafting the ultimate foundational wardrobe
              through deliberate design, heavyweight
              textiles, and architectural silhouettes.
            </p>

            <div className="footer-socials">
              <FooterTitle>FOLLOW US</FooterTitle>

              <div className="footer-social-links">
                <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">
                  INSTAGRAM
                </a>
                <a href="https://www.pinterest.com/" target="_blank" rel="noreferrer">
                  PINTEREST
                </a>
                <a href="https://www.tiktok.com/" target="_blank" rel="noreferrer">
                  TIKTOK
                </a>
                <a href="https://x.com/" target="_blank" rel="noreferrer">
                  X / TWITTER
                </a>
              </div>
            </div>
          </div>

          {/* Shop */}
          <div>
            <FooterTitle>SHOP</FooterTitle>
            <FooterLink to="/products">All T-Shirts</FooterLink>
            <FooterLink to="/products?gender=men">Men</FooterLink>
            <FooterLink to="/products?gender=women">Women</FooterLink>
            <FooterLink to="/products?gender=unisex">Unisex</FooterLink>
          </div>

          {/* Help */}
          <div>
            <FooterTitle>HELP</FooterTitle>
            <FooterLink to="/contact">Contact</FooterLink>
            <FooterLink to="/shipping">Shipping</FooterLink>
            <FooterLink to="/returns">Returns &amp; Refunds</FooterLink>
            <FooterLink to="/faq">FAQ</FooterLink>
          </div>

          {/* Account */}
          <div>
            <FooterTitle>ACCOUNT</FooterTitle>
            <FooterLink to="/account">My Account</FooterLink>
            <FooterLink to="/orders">My Orders</FooterLink>
            <FooterLink to="/wishlist">Wishlist</FooterLink>
          </div>

          {/* Company */}
          <div>
            <FooterTitle>COMPANY</FooterTitle>
            <FooterLink to="/about">About Threads.com</FooterLink>
            <FooterLink to="/sustainability">Sustainability</FooterLink>
            <FooterLink to="/privacy-policy">Privacy Policy</FooterLink>
            <FooterLink to="/terms">Terms &amp; Conditions</FooterLink>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="footer-bottom">
          <span>© 2026 THREADS.COM INC. ALL RIGHTS RESERVED.</span>

          <div className="footer-bottom-right">
            <span>EDITION: GLOBAL / EN</span>
            <span>ARCHITECTURAL SILHOUETTES</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const FooterTitle = ({ children }) => (
  <h2 className="footer-title">{children}</h2>
);

const FooterLink = ({ to, children }) => (
  <Link to={to} className="footer-link">
    {children}
  </Link>
);

export default Footer;
