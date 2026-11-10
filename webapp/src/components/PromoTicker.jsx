import React from 'react';
import './PromoTicker.css';

// Scrolling offer strip under the home hero. Every line here must stay true:
// BOGO is applied in the cart, free shipping starts at ₹499 (OrderPage),
// COD is offered at checkout, PUREJOY10 is a live coupon.
const ITEMS = [
  'Buy 1 Get 1 FREE on every product',
  'Free shipping above ₹499',
  'Cash on Delivery available',
  'Extra 10% off with code PUREJOY10',
  'FSSAI licensed',
  'Lab report on the jar QR',
  'Made in India',
];

const Row = ({ hidden }) => (
  <div className="pt-row" aria-hidden={hidden || undefined}>
    {ITEMS.map((t) => (
      <span key={t} className="pt-item">
        {t}
        <span className="pt-star" aria-hidden="true">✦</span>
      </span>
    ))}
  </div>
);

const PromoTicker = () => (
  <section className="promo-ticker" aria-label="Offers">
    <div className="pt-track">
      <Row />
      <Row hidden />
    </div>
  </section>
);

export default PromoTicker;
