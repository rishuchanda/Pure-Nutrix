import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import './RecentlyViewed.css';

// Products this visitor opened before (saved on this device by the product page).
const RecentlyViewed = ({ onProductClick }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem('pn_recently_viewed') || '[]');
      if (Array.isArray(list)) setItems(list.filter(p => p && p.id && p.name));
    } catch { /* storage blocked */ }
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="recent-section" aria-label="Recently viewed">
      <div className="recent-wrap">
        <h2 className="recent-title"><History size={18} /> Recently viewed</h2>
        <div className="recent-row">
          {items.map(p => (
            <a
              key={p.id}
              href={`/product/${p.slug || p.id}`}
              className="recent-card"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                onProductClick && onProductClick(p);
              }}
            >
              <span className="recent-img">{p.image_urls?.[0] && <img src={p.image_urls[0]} alt={p.name} loading="lazy" decoding="async" />}</span>
              <span className="recent-name">{p.name}</span>
              <span className="recent-price">₹{p.price}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewed;
