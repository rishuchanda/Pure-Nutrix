import React, { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X, User } from 'lucide-react';
import { motion } from 'framer-motion';
import './Navbar.css';

const Navbar = ({ user, onOpenAuth, onSignOut, onOpenAccount, onGoHome, onOpenProducts, cartCount = 0, onOpenCart }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <a href="#home" className="nav-link" onClick={(e) => { e.preventDefault(); onGoHome(); }}>Home</a>
          <a href="#products" className="nav-link" onClick={(e) => { e.preventDefault(); onOpenProducts(); }}>Products</a>
          <a href="#about" className="nav-link">Our Science</a>
          <a href="#contact" className="nav-link">Contact</a>
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
            <span className="cart-count">{cartCount}</span>
          </button>
          
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mobile-menu glass"
        >
          <a href="#home" className="mobile-nav-link" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); onGoHome(); }}>Home</a>
          <a href="#products" className="mobile-nav-link" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); onOpenProducts(); }}>Products</a>
          <a href="#about" className="mobile-nav-link" onClick={() => { setMobileMenuOpen(false); onGoHome(); }}>Our Science</a>
          <a href="#contact" className="mobile-nav-link" onClick={() => { setMobileMenuOpen(false); onGoHome(); }}>Contact</a>
          
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
              <button className="btn-outline mobile-full-btn" onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }}>
                Sign In
              </button>
            )}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
