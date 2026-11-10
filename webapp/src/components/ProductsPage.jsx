import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getProductReviews } from '../utils/mockReviews';
import { getProductDetails } from '../utils/productDetailsData';
import './ProductsPage.css';

// Category chips match words in the product name (no extra DB column needed).
const CATEGORIES = [
  { key: 'all', label: 'All', match: [] },
  { key: 'skin', label: 'Skin Glow', match: ['glutathione'] },
  { key: 'hair', label: 'Skin & Hair', match: ['collagen', 'biotin'] },
  { key: 'wellness', label: 'Wellness', match: ['buckthorn', 'ashwagandha'] },
];
const SORTS = { featured: 'Featured', low: 'Price: Low to High', high: 'Price: High to Low' };

const ProductsPage = ({ onProductClick, onBack, onAddToCart }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('featured');
  const [addedId, setAddedId] = useState(null);
  useEffect(() => { if (!addedId) return undefined; const t = setTimeout(() => setAddedId(null), 1600); return () => clearTimeout(t); }, [addedId]);

  const cat = CATEGORIES.find(c => c.key === category);
  const visible = products
    .filter(p => !cat.match.length || cat.match.some(m => (p.name || '').toLowerCase().includes(m)))
    .slice()
    .sort((a, b) => (sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : 0));

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching products:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="products-page-wrapper">
      <div className="products-container">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Home
        </button>

        <div className="products-header">
          <motion.h1
            className="products-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            All Products
          </motion.h1>
          <motion.p
            className="products-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Treat your body from head to toe with our range of science-backed & efficacious nutraceutical products. Protect every last inch of your health.
          </motion.p>
        </div>

        <div className="products-chips" role="tablist" aria-label="Categories">
          {CATEGORIES.map(c => (
            <button key={c.key} role="tab" aria-selected={category === c.key} className={`pchip ${category === c.key ? 'is-active' : ''}`} onClick={() => setCategory(c.key)}>{c.label}</button>
          ))}
        </div>

        <div className="products-top-bar">
          <div>Showing {visible.length} {visible.length === 1 ? 'product' : 'products'}</div>
          <label className="products-sort">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', color: '#555' }}>Loading collection...</div>
        ) : (
          <div className="products-grid">
            {visible.map((product, index) => {
              const reviewData = getProductReviews(product);
              const dynamicDetails = getProductDetails(product.name);

              return (
                <motion.div
                  key={product.id}
                  className="product-item"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  onClick={() => onProductClick(product)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="product-item-image-wrap">
                    <span className="badge-best-seller">{reviewData.isNew ? 'New Launch' : 'Best Seller'}</span>
                    {product.original_price > product.price && (
                      <span className="badge-save">−{Math.round((1 - product.price / product.original_price) * 100)}%</span>
                    )}
                    {product.image_urls && product.image_urls.length > 0 ? (
                      <img src={product.image_urls[0]} alt={product.name} loading={index < 4 ? "eager" : "lazy"} decoding="async" width="600" height="600" />
                    ) : (
                      <div style={{ padding: '40px', color: '#888' }}>No Image</div>
                    )}
                  </div>

                  <div className="product-item-details">
                    <h2 className="product-item-title">
                      {/* Real href so Google can crawl from /products into each
                          product page. The click handler keeps the SPA feel. */}
                      <a
                        href={`/product/${product.slug || product.id}`}
                        onClick={(e) => {
                          if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                          e.preventDefault();
                          e.stopPropagation();
                          onProductClick(product);
                        }}
                      >
                        {product.name}
                      </a>
                    </h2>
                    <p className="product-item-subtitle">{dynamicDetails.subtitle}</p>

                    {reviewData.totalCount > 0 ? (
                      <div className="product-item-stars">
                        <div style={{ display: 'flex' }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={14} fill="#fbbf24" stroke="none" className="star-icon" />
                          ))}
                        </div>
                        <span>{reviewData.rating} ({reviewData.totalCount} reviews)</span>
                      </div>
                    ) : (
                      <div className="product-item-stars"><span>New launch · no reviews yet</span></div>
                    )}

                    <div className="product-item-price">
                      <span>₹{product.price}</span>
                      {product.original_price && product.original_price > product.price && (
                        <span className="product-item-mrp">₹{product.original_price}</span>
                      )}
                    </div>

                    <button
                      className={`btn-add-to-cart ${addedId === product.id ? 'is-added' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart && onAddToCart(product);
                        setAddedId(product.id);
                      }}
                    >
                      {addedId === product.id ? '✓ Added' : 'Add to cart'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
