import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './SearchPopup.css';

const SearchPopup = ({ isOpen, onClose, onProductClick }) => {
  const [topProducts, setTopProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Fetch 3 random or top products for the "Top Products" section
      const fetchTopProducts = async () => {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .limit(3);
          if (!error && data) {
            setTopProducts(data);
          }
        } catch (err) {
          console.error('Error fetching top products for search:', err);
        }
      };
      fetchTopProducts();
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  const trendingSearches = [
    "Sunscreen",
    "Face Serum",
    "Moisturizer",
    "Hair Serum",
    "Shampoo"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="search-popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="search-popup-container"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Search Input */}
            <div className="search-popup-header">
              <div className="search-input-wrapper">
                <Search size={20} color="#666" />
                <input
                  type="text"
                  placeholder="Search for products..."
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="search-close-btn" onClick={onClose}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="search-popup-content">
              {/* Left Column: Trending */}
              <div className="trending-searches">
                <h3 className="search-section-title">TRENDING SEARCHES</h3>
                <ul>
                  {trendingSearches.map((term, index) => (
                    <li key={index} onClick={() => setSearchQuery(term)}>
                      {term}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right Column: Top Products & Categories */}
              <div className="search-top-products-container">
                <h3 className="search-section-title">TOP PRODUCTS</h3>

                <div className="search-products-grid">
                  {topProducts.map((product) => (
                    <div
                      key={product.id}
                      className="search-product-card"
                      onClick={() => {
                        onClose();
                        onProductClick && onProductClick(product);
                      }}
                    >
                      <div className="search-product-img">
                        {product.image_urls && product.image_urls.length > 0 ? (
                          <img src={product.image_urls[0]} alt={product.name} />
                        ) : (
                          <div style={{ padding: '20px', color: '#888', fontSize: '0.8rem' }}>No Image</div>
                        )}
                      </div>
                      <h4 className="search-product-title">{product.name}</h4>
                      <div className="search-product-desc">Premium formulation for maximum efficacy.</div>
                      <div className="search-product-price">₹ {product.price}</div>
                    </div>
                  ))}
                </div>

                <div className="search-categories-grid">
                  <div className="search-category-card">Skin Care</div>
                  <div className="search-category-card">Hair Care</div>
                  <div className="search-category-card">Body Care</div>
                  <div className="search-category-card">Lip Care</div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchPopup;
