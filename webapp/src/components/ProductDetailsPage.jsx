import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ShieldCheck, Truck, ArrowLeft, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import './ProductDetailsPage.css';

const ProductDetailsPage = ({ product, onBack, onOrder, onAddToCart }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [direction, setDirection] = useState(0); // For animation direction

  if (!product) return null;

  const handleNextImage = () => {
    if (product.image_urls && product.image_urls.length > 0) {
      setDirection(1);
      setActiveImage((prev) => (prev + 1) % product.image_urls.length);
    }
  };

  const handlePrevImage = () => {
    if (product.image_urls && product.image_urls.length > 0) {
      setDirection(-1);
      setActiveImage((prev) => (prev - 1 + product.image_urls.length) % product.image_urls.length);
    }
  };

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div className="pdp-wrapper section-padding">
      <div className="container">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} /> Back to Products
        </button>

        <div className="pdp-grid">
          {/* Left Column: Image Gallery */}
          <div className="pdp-gallery">
            <div className="pdp-main-image-container" style={{ position: 'relative' }}>
              {product.image_urls && product.image_urls.length > 0 ? (
                <>
                  <AnimatePresence initial={false} custom={direction}>
                    <motion.img
                      key={activeImage}
                      src={product.image_urls[activeImage]}
                      alt={product.name}
                      className="pdp-main-image"
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                      style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={1}
                      onDragEnd={(e, { offset, velocity }) => {
                        const swipe = Math.abs(offset.x) * velocity.x;
                        if (swipe < -10000) handleNextImage();
                        else if (swipe > 10000) handlePrevImage();
                      }}
                    />
                  </AnimatePresence>
                  
                  {product.image_urls.length > 1 && (
                    <>
                      <button className="image-nav-btn prev-btn" onClick={handlePrevImage} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                        <ChevronLeft size={24} color="#111" />
                      </button>
                      <button className="image-nav-btn next-btn" onClick={handleNextImage} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                        <ChevronRight size={24} color="#111" />
                      </button>
                    </>
                  )}
                </>
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

          <div className="pdp-info">
            <div className="pdp-bogo-banner" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', fontSize: '0.95rem' }}>
              🌧️ Monsoon Sale: Buy 1 Get 1 FREE Automatically Applied!
            </div>
            
            <h3 className="pdp-category text-gold">{product.category}</h3>
            <h1 className="pdp-title">{product.name}</h1>
            
            <div className="pdp-price-row">
              <span className="pdp-price">₹{product.price}</span>
              {product.original_price && product.original_price > product.price && (
                <>
                  <span className="pdp-mrp" style={{ textDecoration: 'line-through', color: 'var(--color-text-secondary)', marginLeft: '10px', fontSize: '1.2rem' }}>₹{product.original_price}</span>
                  <span className="pdp-discount" style={{ color: '#059669', marginLeft: '10px', fontSize: '1.1rem', fontWeight: '600' }}>
                    ({Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF)
                  </span>
                </>
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
              <div className="pdp-trust-badge"><CheckCircle size={20} className="text-gold"/> 100% Authentic</div>
              <div className="pdp-trust-badge"><Truck size={20} className="text-gold"/> 2-5 Days Delivery</div>
              <div className="pdp-trust-badge"><ShieldCheck size={20} className="text-gold"/> Secure Payment</div>
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
