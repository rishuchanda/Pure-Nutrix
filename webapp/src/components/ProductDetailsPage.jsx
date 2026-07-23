import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ShoppingBag, ArrowLeft, ChevronLeft, ChevronRight, Star, Plus, Minus } from 'lucide-react';
import { getProductReviews } from '../utils/mockReviews';
import { getProductDetails } from '../utils/productDetailsData';
import { supabase } from '../supabaseClient';
import './ProductDetailsPage.css';

const Accordion = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="pdp-accordion">
      <button className="pdp-accordion-header" onClick={() => setIsOpen(!isOpen)}>
        {title}
        {isOpen ? <Minus size={20} /> : <Plus size={20} />}
      </button>
      {isOpen && <div className="pdp-accordion-content">{children}</div>}
    </div>
  );
};

const ProductDetailsPage = ({ product, onBack, onOrder, onAddToCart, onProductClick }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [otherProducts, setOtherProducts] = useState([]);

  useEffect(() => {
    if (!product) return;
    const fetchOthers = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .neq('id', product.id)
          .limit(4);
        if (!error && data) {
          setOtherProducts(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchOthers();
  }, [product]);

  if (!product) return null;

  const reviewData = getProductReviews(product);
  const details = getProductDetails(product.name);

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

  return (
    <div className="pdp-wrapper">
      <Helmet>
        <title>{product.name} | Pure Nutrix</title>
        <meta name="title" content={`${product.name} | Pure Nutrix`} />
        <meta name="description" content={details.subtitle || `Buy ${product.name} at Pure Nutrix. Premium formulation for advanced results.`} />
        <meta property="og:title" content={`${product.name} | Pure Nutrix`} />
        <meta property="og:description" content={details.subtitle || `Buy ${product.name} at Pure Nutrix. Premium formulation.`} />
        {product.image_urls && product.image_urls[0] && <meta property="og:image" content={product.image_urls[0]} />}
      </Helmet>
      
      <div className="pdp-container">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Products
        </button>

        <div className="pdp-grid">
          {/* LEFT COLUMN - STICKY GALLERY */}
          <div className="pdp-gallery-column">
            <div className="pdp-main-image-container">
              {product.image_urls && product.image_urls.length > 0 ? (
                <>
                  <motion.img
                    key={activeImage}
                    src={product.image_urls[activeImage]}
                    alt={product.name}
                    className="pdp-main-image"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  {product.image_urls.length > 1 && (
                    <>
                      <button className="image-nav-btn prev-btn" onClick={handlePrevImage}>
                        <ChevronLeft size={20} />
                      </button>
                      <button className="image-nav-btn next-btn" onClick={handleNextImage}>
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div style={{ padding: '40px', color: '#888' }}>No Image Available</div>
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

          {/* RIGHT COLUMN - PRODUCT INFO */}
          <div className="pdp-info-column">
            <span className="pdp-badge-best-seller">Best Seller</span>

            <h1 className="pdp-title">{product.name}</h1>
            <p className="pdp-subtitle">{details.subtitle}</p>

            <div className="pdp-star-summary" onClick={() => document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' })}>
              <div className="pdp-stars">
                <Star size={16} fill="#fbbf24" stroke="none" />
                <Star size={16} fill="#fbbf24" stroke="none" />
                <Star size={16} fill="#fbbf24" stroke="none" />
                <Star size={16} fill="#fbbf24" stroke="none" />
                <Star size={16} fill="#fbbf24" stroke="none" />
              </div>
              <span>{reviewData.rating} ({reviewData.totalCount} reviews)</span>
            </div>

            <div className="pdp-price-row">
              <span className="pdp-price">₹{product.price}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="pdp-mrp">₹{product.original_price}</span>
              )}
              <span className="pdp-tax-inclusive">(Inclusive of all taxes)</span>
            </div>

            <div className="pdp-offers-box">
              <div className="pdp-offer-item"><strong>Offer:</strong> Monsoon Refresh Sale: Buy 1 Get 1 FREE Automatically Applied!</div>
            </div>

            <div className="pdp-tags">
              {details.tags.map((tag, idx) => (
                <span key={idx} className="pdp-tag">{tag}</span>
              ))}
            </div>

            <div className="pdp-actions">
              <button className="btn-add-cart" onClick={() => onAddToCart && onAddToCart(product)}>
                Add to Cart
              </button>
              <button className="btn-buy-now" onClick={() => onOrder(product)}>
                Buy Now
              </button>
            </div>

            <div className="pdp-accordions">
              <Accordion title="What makes it special" defaultOpen={true}>
                <p>{details.whatMakesItSpecial.description}</p>
                <ul style={{ paddingLeft: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {details.whatMakesItSpecial.bullets.map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
                </ul>
              </Accordion>

              <Accordion title="How to use">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {details.howToUse.steps.map((step, idx) => (
                    <div key={idx}><strong>{step.title}:</strong> {step.desc}</div>
                  ))}
                  <div><em>{details.howToUse.note}</em></div>
                </div>
              </Accordion>

              <Accordion title="Science & Ingredients">
                <p style={{ marginBottom: '10px' }}><strong>Key Ingredients:</strong></p>
                <p>{details.scienceAndIngredients.keyIngredients}</p>
                <p style={{ marginTop: '10px' }}>{details.scienceAndIngredients.description}</p>
              </Accordion>

              <Accordion title="Product Specifications">
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                  <strong style={{ color: '#111' }}>Product Form:</strong> <span>{details.specs.form}</span>
                  <strong style={{ color: '#111' }}>Quantity:</strong> <span>{details.specs.quantity}</span>
                  <strong style={{ color: '#111' }}>Pack Of:</strong> <span>{details.specs.packOf}</span>
                  <strong style={{ color: '#111' }}>Shelf Life:</strong> <span>{details.specs.shelfLife}</span>
                </div>
              </Accordion>
            </div>
          </div>
        </div>

        {/* BOTTOM FULL WIDTH SECTIONS */}
        <div className="pdp-bottom-sections" id="reviews">
          <h2 className="pdp-section-header">Customer Reviews</h2>

          <div className="pdp-ai-summary">
            <h3>✨ AI Generated Review Summary</h3>
            <p>{details.aiSummary.text}</p>
            <div className="pdp-ai-topics">
              {details.aiSummary.topics.map((topic, idx) => (
                <span key={idx} className="pdp-ai-topic">{topic}</span>
              ))}
            </div>
          </div>

          <div className="pdp-reviews-list">
            {reviewData.reviewsList.map((review, idx) => (
              <div key={idx} className="pdp-review-item">
                <div className="pdp-review-header">
                  <div>
                    <div className="pdp-reviewer-name">{review.name}</div>
                    <div className="pdp-verified">✔ Verified Buyer</div>
                  </div>
                  <div className="pdp-review-date">{review.date}</div>
                </div>
                <div className="pdp-stars" style={{ marginBottom: '10px' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill={i < review.rating ? "#fbbf24" : "none"} stroke={i < review.rating ? "none" : "#cccccc"} />
                  ))}
                </div>
                <div className="pdp-review-text">"{review.comment}"</div>
              </div>
            ))}
          </div>

          <h2 className="pdp-section-header" style={{ marginTop: '40px' }}>Q&A</h2>
          <div className="pdp-qa-list">
            {details.faq.map((item, idx) => (
              <div key={idx} className="pdp-qa-item">
                <div className="pdp-qa-q">Q: {item.q}</div>
                <div className="pdp-qa-a">A: {item.a}</div>
              </div>
            ))}
          </div>

          {/* SUGGESTED PRODUCTS */}
          {otherProducts.length > 0 && (
            <div className="pdp-suggested-products" style={{ marginTop: '60px', borderTop: '1px solid #e5e5e5', paddingTop: '60px' }}>
              <h2 className="pdp-section-header">You May Also Like</h2>
              <div className="products-grid" style={{ marginBottom: '0' }}>
                {otherProducts.map((op, idx) => (
                  <div key={op.id} className="product-item" onClick={() => { window.scrollTo(0, 0); onProductClick && onProductClick(op); }} style={{ cursor: 'pointer' }}>
                    <div className="product-item-image-wrap">
                      {op.image_urls && op.image_urls.length > 0 ? (
                        <img src={op.image_urls[0]} alt={op.name} />
                      ) : (
                        <div style={{ padding: '40px', color: '#888' }}>No Image</div>
                      )}
                    </div>
                    <div className="product-item-details">
                      <h2 className="product-item-title">{op.name}</h2>
                      <div className="product-item-price">
                        <span>₹{op.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsPage;
