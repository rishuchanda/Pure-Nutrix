import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './ShopByConcern.css';

// "Shop by need" tiles. Each tile points to the matching product (found by
// name in the live catalog); labels follow the wording on the product packs.
const TILES = [
  { key: 'skin', label: 'Skin Radiance', sub: 'Liposomal Glutathione 600mg', match: ['liposomal'], img: '/assets/products/liposomal-glutathione/1.jpg', theme: 'sbc-blue' },
  { key: 'hair', label: 'Skin & Hair', sub: 'Collagen & Biotin + Hyaluronic Acid', match: ['collagen'], img: '/assets/products/collagen/collagen 1.jpg', theme: 'sbc-rose' },
  { key: 'gut', label: 'Immunity & Gut', sub: 'Himalayan Sea Buckthorn Juice', match: ['sea buckthorn', 'buckthorn'], img: '/assets/products/sea_buckthorn/1.jpg', theme: 'sbc-amber' },
  { key: 'stress', label: 'Stress & Energy', sub: 'Ashwagandha Root Extract 500mg', match: ['ashwagandha'], img: '/assets/products/ashwagandha/1.jpg', theme: 'sbc-green' },
];

const ShopByConcern = ({ onProductClick, onOpenProducts }) => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    supabase.from('products').select('*').then(({ data }) => { if (data) setProducts(data); });
  }, []);

  const findProduct = (match) => products.find(p => match.some(m => (p.name || '').toLowerCase().includes(m)));

  return (
    <section className="sbc-section">
      <div className="sbc-wrap">
        <div className="sbc-head">
          <span className="sbc-eyebrow">Shop by need</span>
          <h2 className="sbc-title">What do you <em className="serif-accent">need</em> today?</h2>
        </div>
        <div className="sbc-grid">
          {TILES.map((t, i) => {
            const p = findProduct(t.match);
            const href = p ? `/product/${p.slug || p.id}` : '/products';
            const onClick = (e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey) return;
              e.preventDefault();
              if (p && onProductClick) onProductClick(p); else if (onOpenProducts) onOpenProducts();
            };
            return (
              <motion.a
                key={t.key}
                href={href}
                onClick={onClick}
                className={`sbc-tile ${t.theme}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <div className="sbc-text">
                  <span className="sbc-label">{t.label}</span>
                  <span className="sbc-sub">{t.sub}</span>
                </div>
                <img src={t.img} alt={t.sub} loading="lazy" decoding="async" />
                <span className="sbc-go" aria-hidden="true"><ArrowUpRight size={18} /></span>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ShopByConcern;
