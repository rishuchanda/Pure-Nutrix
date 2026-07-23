import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getProductReviews } from '../utils/mockReviews';
import { getProductDetails } from '../utils/productDetailsData';
import './ProductsPage.css';

const ProductsPage = ({ onProductClick, onBack, onAddToCart }) => {
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

        <div className="products-top-bar">
          <div>Showing {products.length} products</div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span>Filter</span>
            <span>Sort By</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', color: '#555' }}>Loading collection...</div>
        ) : (
          <div className="products-grid">
            {products.map((product, index) => {
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
                    <span className="badge-best-seller">Best Seller</span>
                    {product.image_urls && product.image_urls.length > 0 ? (
                      <img src={product.image_urls[0]} alt={product.name} />
                    ) : (
                      <div style={{ padding: '40px', color: '#888' }}>No Image</div>
                    )}
                  </div>

                  <div className="product-item-details">
                    <h2 className="product-item-title">{product.name}</h2>
                    <p className="product-item-subtitle">{dynamicDetails.subtitle}</p>

                    <div className="product-item-stars">
                      <div style={{ display: 'flex' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={14} fill="#fbbf24" stroke="none" className="star-icon" />
                        ))}
                      </div>
                      <span>{reviewData.rating} ({reviewData.totalCount} reviews)</span>
                    </div>

                    <div className="product-item-price">
                      <span>₹{product.price}</span>
                      {product.original_price && product.original_price > product.price && (
                        <span className="product-item-mrp">₹{product.original_price}</span>
                      )}
                    </div>

                    <button
                      className="btn-add-to-cart"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart && onAddToCart(product);
                      }}
                    >
                      Add to cart
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
