import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './ProductsPage.css';

const ProductsPage = ({ onProductClick, onBack, onOrder, onAddToCart }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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
    <div className="products-page-wrapper section-padding">
      <div className="container">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} /> Back to Home
        </button>
        
        <div className="section-header" style={{ marginTop: '20px' }}>
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            ALL <span className="text-gold">PRODUCTS</span>
          </motion.h2>
          <p className="section-subtitle">Discover our complete range of premium nutrition</p>
        </div>

        {loading ? (
          <div className="loading-spinner" style={{ textAlign: 'center', margin: '50px 0' }}>Loading premium collection...</div>
        ) : (
          <div className="products-grid">
            {products.map((product, index) => (
              <motion.div 
                key={product.id}
                className="product-tile"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onClick={() => onProductClick(product)}
                style={{ cursor: 'pointer' }}
              >
                <div className="product-image-container">
                  {product.image_urls && product.image_urls.length > 0 ? (
                    <img 
                      src={product.image_urls[0]} 
                      alt={product.name} 
                      className="product-image"
                    />
                  ) : (
                    <div className="product-image placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>No Image</div>
                  )}
                </div>
                
                <div className="product-details">
                  <h3 className="product-category text-gold">{product.category || 'NUTRITION'}</h3>
                  <h2 className="product-name">{product.name}</h2>
                  
                  <div className="product-meta">
                    <span className="product-qty">{product.quantity || '30'} {product.product_form || 'Capsules'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="product-price">₹{product.price}</span>
                      {product.original_price && product.original_price > product.price && (
                        <>
                          <span style={{ textDecoration: 'line-through', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>₹{product.original_price}</span>
                          <span style={{ color: '#059669', fontSize: '0.85rem', fontWeight: '600' }}>
                            ({Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="product-actions">
                    <button 
                      className="add-to-cart-btn" 
                      onClick={(e) => { e.stopPropagation(); onAddToCart && onAddToCart(product); }}
                    >
                      Add to Cart
                    </button>
                    <button 
                      className="buy-now-btn" 
                      onClick={(e) => { e.stopPropagation(); onOrder(product); }}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
