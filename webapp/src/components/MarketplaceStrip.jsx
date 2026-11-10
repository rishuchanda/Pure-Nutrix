import React from 'react';
import { Store, Gift } from 'lucide-react';
import './MarketplaceStrip.css';

// "Also on Amazon & Flipkart" trust band. Plain text names only (no logos).
// The website perk line must stay true: BOGO on every product here.
const MarketplaceStrip = () => (
  <section className="mkt-strip" aria-label="Also available on">
    <div className="mkt-card">
      <div className="mkt-left">
        <span className="mkt-icon"><Store size={18} /></span>
        <span className="mkt-label">Also available on</span>
        <span className="mkt-chip">Amazon</span>
        <span className="mkt-chip">Flipkart</span>
      </div>
      <p className="mkt-perk"><Gift size={15} /> On purenutrix.in you get Buy 1 Get 1 on every product.</p>
    </div>
  </section>
);

export default MarketplaceStrip;
