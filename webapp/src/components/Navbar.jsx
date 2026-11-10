import React, { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X, User, Search, Home, LayoutGrid, ShieldCheck, FlaskConical, Headphones, ChevronRight, Gift, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import './Navbar.css';
import SearchPopup from './SearchPopup';

const Navbar = ({ user, onOpenAuth, onSignOut, onOpenAccount, onGoHome, onOpenProducts, onOpenQuality, onOpenSupport, cartCount = 0, onOpenCart, onProductClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`navbar ${scrolled ? 'navbar-scrolled glass' : ''}`}
    >
      <div className="navbar-container container">
        <div className="navbar-logo" onClick={onGoHome} style={{ cursor: 'pointer' }}>
          <img src="/assets/logo.png" alt="Pure Nutrix Logo" className="logo-img" />
        </div>

        <div className="navbar-links">
          <a href="/" className="nav-link" onClick={(e) => { e.preventDefault(); onGoHome(); }}>Home</a>
          <a href="/products" className="nav-link" onClick={(e) => { e.preventDefault(); onOpenProducts(); }}>Products</a>
          <a href="/quality" className="nav-link" onClick={(e) => { e.preventDefault(); onOpenQuality(); }}>Quality</a>
          <a href="/#science" className="nav-link" onClick={(e) => { e.preventDefault(); onGoHome(); setTimeout(() => document.getElementById('science')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>Our Science</a>
          <a href="/support" className="nav-link" onClick={(e) => { e.preventDefault(); onOpenSupport(); }}>Contact</a>
        </div>

        <div className="navbar-actions">
          {/* Desktop Auth Buttons */}
          <div className="desktop-auth-actions hide-on-mobile">
            {user ? (
              <>
                <button className="btn-outline account-btn" onClick={onOpenAccount}>
                  <User size={18} />
                  <span>My Account</span>
                </button>
                <button className="btn-outline" onClick={onSignOut}>
                  Sign Out
                </button>
              </>
            ) : (
              <button className="btn-outline" onClick={onOpenAuth}>
                Sign In
              </button>
            )}
          </div>

          <button
            className="btn-outline search-btn"
            onClick={() => setIsSearchOpen(true)}
            style={{ padding: '10px' }}
          >
            <Search size={20} />
          </button>

          {/* Mobile Account Icon */}
          <button
            className="btn-outline mobile-account-icon hide-on-desktop"
            onClick={user ? onOpenAccount : onOpenAuth}
          >
            <User size={20} />
          </button>

          <button
            className={`btn-outline cart-btn ${cartCount === 0 ? 'hide-on-mobile' : 'mobile-small-cart'}`}
            onClick={onOpenCart}
          >
            <ShoppingCart size={20} />
            <span className="cart-count pn-bump" key={cartCount}>{cartCount}</span>
          </button>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu (drawer) */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="mobile-menu glass"
        >
          <div className="mm-offer"><Gift size={16} /> Buy 1 Get 1 FREE on every product</div>
          {[
            { label: 'Home', icon: Home, href: '/', go: onGoHome },
            { label: 'All Products', icon: LayoutGrid, href: '/products', go: onOpenProducts },
            { label: 'Quality & Lab Reports', icon: ShieldCheck, href: '/quality', go: onOpenQuality },
            { label: 'Our Science', icon: FlaskConical, href: '/#science', go: () => { onGoHome(); setTimeout(() => document.getElementById('science')?.scrollIntoView({ behavior: 'smooth' }), 150); } },
            { label: 'Help & Contact', icon: Headphones, href: '/support', go: onOpenSupport },
          ].map(({ label, icon: Icon, href, go }) => (
            <a key={label} href={href} className="mobile-nav-link" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); go(); }}>
              <span className="mm-ico"><Icon size={18} /></span>
              <span className="mm-label">{label}</span>
              <ChevronRight size={18} className="mm-chev" />
            </a>
          ))}

          <a href="/whatsapp" className="mm-wa"><MessageCircle size={18} /> Chat with us on WhatsApp</a>

          <div className="mobile-menu-auth-actions">
            {user ? (
              <>
                <button className="btn-outline account-btn mobile-full-btn" onClick={() => { setMobileMenuOpen(false); onOpenAccount(); }}>
                  <User size={18} />
                  <span>My Account</span>
                </button>
                <button className="btn-outline mobile-full-btn" onClick={() => { setMobileMenuOpen(false); onSignOut(); }}>
                  Sign Out
                </button>
              </>
            ) : (
              <button className="btn-outline mobile-full-btn mm-signin" onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }}>
                <User size={18} /> Sign In / Create account
              </button>
            )}
          </div>
        </motion.div>
      )}

      <SearchPopup
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onProductClick={(product) => {
          setIsSearchOpen(false);
          onProductClick && onProductClick(product);
        }}
      />
    </motion.nav>
  );
};

export default Navbar;
