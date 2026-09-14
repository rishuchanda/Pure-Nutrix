import React from 'react';
import './Footer.css';

// Real, crawlable hrefs. Every link here used to be href="#", which meant
// Google could not reach /products, /quality, /legal, /privacy-policy or
// /support at all, and customers could not open the return & refund policy.
const PRODUCT_LINKS = [
  { label: 'Ultra L-Glutathione', href: '/product/ultra-l-glutathione-500mg-with-vitamin-c' },
  { label: 'Advanced Collagen', href: '/product/advanced-collagen-biotin-with-hyaluronic-acid-vitamin-c-zinc' },
  { label: 'Sea Buckthorn Juice', href: '/product/pure-nutrix-himalayan-sea-buckthorn-juice-500-ml-supports-immunity-glowing-skin-gut-health-with-omega-3-6-7-9' },
  { label: 'Ashwagandha Capsules', href: '/product/pure-nutrix-ashwagandha-root-extract-capsules-500mg-natural-stress-relief-energy-immunity-support-30-capsules' },
  { label: 'All Supplements', href: '/products' },
];

const Footer = ({ onOpenQuality, onOpenLegalPolicy, onOpenPrivacyPolicy, onOpenSupport, onOpenProducts }) => {
  // Keeps the SPA transition when a handler exists, but leaves the href intact
  // so crawlers, middle-click and "open in new tab" all still work.
  const spa = (handler) => (e) => {
    if (!handler) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    handler();
  };

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
          {PRODUCT_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={href === '/products' ? spa(onOpenProducts) : undefined}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="footer-links-group">
          <h3>Company</h3>
          <a href="/quality" onClick={spa(onOpenQuality)}>Quality &amp; Standards</a>
          <a href="/legal" onClick={spa(onOpenLegalPolicy)}>Return, Refund &amp; Shipping</a>
          <a href="/legal" onClick={spa(onOpenLegalPolicy)}>Terms of Service</a>
          <a href="/privacy-policy" onClick={spa(onOpenPrivacyPolicy)}>Privacy Policy</a>
          <a href="/support" onClick={spa(onOpenSupport)}>Contact Us / Support</a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Pure Nutrix. A brand of <strong>D3 PRODUCTION</strong>. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
