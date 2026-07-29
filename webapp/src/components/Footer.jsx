import React from 'react';
import './Footer.css';

const Footer = ({ onOpenQuality, onOpenLegalPolicy, onOpenSupport }) => {
  return (
    <footer className="footer glass">
      <div className="container footer-content">
        <div className="footer-brand">
          <img src="/assets/logo.png" alt="Pure Nutrix" className="footer-logo" />
          <h2 className="text-gold">PURE NUTRIX</h2>
          <p className="footer-desc">Premium skin and hair care nutraceuticals formulated for advanced cellular radiance.</p>
          <div className="footer-company-info" style={{ marginTop: '15px', fontSize: '0.85rem', color: '#a0a0a0', lineHeight: '1.4' }}>
            <strong>D3 PRODUCTION</strong><br />
            Keshar Vihar, Goner Road, Near Bus Stop, Dantli,<br />
            Jaipur, Rajasthan - 303012, India.<br />
            GSTIN: 08FJOPM3122F2Z5
          </div>
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
          <a href="#" onClick={(e) => { e.preventDefault(); if (onOpenLegalPolicy) onOpenLegalPolicy(); }}>Legal & Policy</a>
          <a href="#" onClick={(e) => { e.preventDefault(); if (onOpenSupport) onOpenSupport(); }}>Contact Us / Support</a>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Pure Nutrix. A brand of <strong>D3 PRODUCTION</strong>. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
