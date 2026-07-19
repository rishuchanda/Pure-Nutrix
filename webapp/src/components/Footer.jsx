import React from 'react';
import './Footer.css';

const Footer = ({ onOpenQuality }) => {
  return (
    <footer className="footer glass">
      <div className="container footer-content">
        <div className="footer-brand">
          <img src="/assets/logo.png" alt="Pure Nutrix" className="footer-logo" />
          <h2 className="text-gold">PURE NUTRIX</h2>
          <p className="footer-desc">Premium skin and hair care nutraceuticals formulated for advanced cellular radiance.</p>
        </div>
        
        <div className="footer-links-group">
          <h3>Products</h3>
          <a href="#">Ultra L-Glutathione</a>
          <a href="#">Advanced Collagen</a>
          <a href="#">All Supplements</a>
        </div>
        
        <div className="footer-links-group">
          <h3>Company</h3>
          <a href="#">Our Story</a>
          <a href="#" onClick={(e) => { e.preventDefault(); if (onOpenQuality) onOpenQuality(); }}>Quality & Standards</a>
          <a href="#">Science & Research</a>
          <a href="#">Contact Us</a>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Pure Nutrix. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
