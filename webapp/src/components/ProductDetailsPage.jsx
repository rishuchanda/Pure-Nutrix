import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import './ProductDetailsPage.css';

const ProductDetailsPage = ({ product, onBack, onOrder, onAddToCart }) => {
  const [activeImage, setActiveImage] = useState(0);

  if (!product) return null;

  return (
    <div className="pdp-wrapper section-padding">
      <div className="container">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} /> Back to Products
        </button>

        <div className="pdp-grid">
          {/* Left Column: Image Gallery */}
          <div className="pdp-gallery">
            <div className="pdp-main-image-container">
              {product.image_urls && product.image_urls.length > 0 ? (
                <img src={product.image_urls[activeImage]} alt={product.name} className="pdp-main-image" />
              ) : (
                <div className="pdp-no-image">No Image Available</div>
              )}
            </div>
            
            {product.image_urls && product.image_urls.length > 1 && (
              <div className="pdp-thumbnails">
                {product.image_urls.map((img, idx) => (
                  <div 
                    key={idx} 
                    className={`pdp-thumbnail ${activeImage === idx ? 'active' : ''}`}
                    onClick={() => setActiveImage(idx)}
                  >
                    <img src={img} alt={`Thumbnail ${idx}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Details */}
          <div className="pdp-info">
            <h3 className="pdp-category text-gold">{product.category}</h3>
            <h1 className="pdp-title">{product.name}</h1>
            
            <div className="pdp-price-row">
              <span className="pdp-price">₹{product.price}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="pdp-mrp" style={{ textDecoration: 'line-through', color: '#888', marginLeft: '10px', fontSize: '1.2rem' }}>₹{product.original_price}</span>
              )}
              <span className="pdp-tax-inclusive" style={{ marginLeft: '10px' }}>(Inclusive of all taxes)</span>
            </div>

            <p className="pdp-short-desc">{product.short_description}</p>

            <div className="pdp-actions" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <button className="btn-outline pdp-cart-btn" onClick={() => onAddToCart && onAddToCart(product)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <ShoppingBag size={20} /> Add to Cart
              </button>
              <button className="btn-primary pdp-order-btn" onClick={() => onOrder(product)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: 0 }}>
                <ShoppingBag size={20} /> Buy Now
              </button>
            </div>

            <div className="pdp-trust-badges">
              <div className="pdp-trust-badge"><ShieldCheck size={20} className="text-gold"/> Authentic Quality</div>
              <div className="pdp-trust-badge"><Truck size={20} className="text-gold"/> Fast Shipping</div>
              <div className="pdp-trust-badge"><RefreshCw size={20} className="text-gold"/> Easy Returns</div>
            </div>

            {/* Granular Details requested by user */}
            <div className="pdp-specs">
              <h3 className="pdp-section-title">Product Specifications</h3>
              <table className="pdp-specs-table">
                <tbody>
                  <tr>
                    <th>Product Form</th>
                    <td>{product.product_form || 'Capsules'}</td>
                  </tr>
                  <tr>
                    <th>Quantity</th>
                    <td>{product.quantity || '30'} {product.product_form || 'Capsules'}</td>
                  </tr>
                  <tr>
                    <th>Product Type</th>
                    <td>{product.product_type || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Pack Of</th>
                    <td>{product.pack_of || '1'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pdp-details-sections">
              <div className="pdp-detail-section">
                <h3 className="pdp-section-title">Composition / Ingredients</h3>
                <p>{product.composition || 'N/A'}</p>
              </div>

              <div className="pdp-detail-section">
                <h3 className="pdp-section-title">Nutrient Content</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{product.nutrient_content || 'N/A'}</p>
              </div>

              <div className="pdp-detail-section">
                <h3 className="pdp-section-title">Usage Instructions</h3>
                <p>{product.usage_instructions || 'N/A'}</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsPage;
