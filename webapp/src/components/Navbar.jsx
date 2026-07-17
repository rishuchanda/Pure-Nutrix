import React, { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { motion } from 'framer-motion';
import './Navbar.css';

const Navbar = () => {
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
        <div className="navbar-logo">
          <img src="/assets/logo.png" alt="Pure Nutrix Logo" className="logo-img" />
        </div>
        
        <div className="navbar-links">
          <a href="#home" className="nav-link">Home</a>
          <a href="#products" className="nav-link">Products</a>
          <a href="#about" className="nav-link">Our Science</a>
          <a href="#contact" className="nav-link">Contact</a>
        </div>

        <div className="navbar-actions">
          <button className="btn-outline cart-btn">
            <ShoppingCart size={20} />
            <span className="cart-count">0</span>
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
          <a href="#home" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Home</a>
          <a href="#products" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Products</a>
          <a href="#about" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Our Science</a>
          <a href="#contact" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Contact</a>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
