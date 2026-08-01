import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ShoppingBag, ArrowLeft, ChevronLeft, ChevronRight, Star, Plus, Minus, MessageSquare, Upload, Camera, CheckCircle, Image as ImageIcon, X, AlertCircle, ThumbsUp, Share2 } from 'lucide-react';
import { getProductReviews, addCustomerReview } from '../utils/mockReviews';
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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [reviewSubmittedSuccess, setReviewSubmittedSuccess] = useState(false);
  const [selectedReviewPhoto, setSelectedReviewPhoto] = useState(null);
  const [reviewRefreshTrigger, setReviewRefreshTrigger] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    const handleReviewUpdate = () => setReviewRefreshTrigger(prev => prev + 1);
    window.addEventListener('pn_reviews_updated', handleReviewUpdate);
    return () => window.removeEventListener('pn_reviews_updated', handleReviewUpdate);
  }, []);

  useEffect(() => {
    setShowAllReviews(false);
    window.scrollTo(0, 0);
    if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
  }, [product?.id]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReviewPhotos(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleAddPhotoUrl = () => {
    if (photoUrlInput.trim()) {
      setReviewPhotos(prev => [...prev, photoUrlInput.trim()]);
      setPhotoUrlInput('');
    }
  };

  const handleAddSamplePhoto = () => {
    const samples = [
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=600&q=80"
    ];
    const randomImg = samples[Math.floor(Math.random() * samples.length)];
    setReviewPhotos(prev => [...prev, randomImg]);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewComment.trim()) return;

    addCustomerReview({
      productName: product?.name || 'Pure Nutrix Product',
      customerName: reviewerName.trim(),
      customerEmail: reviewerEmail.trim(),
      rating: reviewRating,
      comment: reviewComment.trim(),
      photos: reviewPhotos
    });

    setReviewSubmittedSuccess(true);
    setTimeout(() => {
      setReviewSubmittedSuccess(false);
      setShowReviewModal(false);
      setReviewerName('');
      setReviewerEmail('');
      setReviewComment('');
      setReviewPhotos([]);
      setPhotoUrlInput('');
    }, 3000);
  };

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
    
    // Meta Pixel ViewContent Event
    if (window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_name: product.name,
        content_category: product.category,
        content_ids: [product.id],
        content_type: 'product',
        value: product.price,
        currency: 'INR'
      });
    }
  }, [product]);

  if (!product) return null;

  const reviewData = React.useMemo(() => getProductReviews(product), [product, reviewRefreshTrigger]);
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
        <title>{product.name} | Buy Online at Best Price - Pure Nutrix India</title>
        <meta name="title" content={`${product.name} | Buy Online at Best Price - Pure Nutrix India`} />
        <meta name="description" content={details.subtitle || `Buy 100% genuine ${product.name} at Pure Nutrix. Clinically tested formulation for advanced results. Free shipping & COD available in India.`} />
        <meta name="keywords" content={`${product.name}, buy ${product.name} online india, ${product.name} price, pure nutrix supplements, fssai health supplements india, genuine ${product.name}`} />
        <link rel="canonical" href={`https://purenutrix.in/product/${(product.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} />
        <meta property="og:title" content={`${product.name} | Buy Online at Best Price - Pure Nutrix India`} />
        <meta property="og:description" content={details.subtitle || `Buy 100% genuine ${product.name} at Pure Nutrix. Clinically tested formulation for advanced results.`} />
        <meta property="og:url" content={`https://purenutrix.in/product/${(product.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} />
        <meta property="og:type" content="product" />
        {product.image_urls && product.image_urls[0] && <meta property="og:image" content={product.image_urls[0]} />}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={`${product.name} | Buy Online at Best Price - Pure Nutrix India`} />
        <meta property="twitter:description" content={details.subtitle || `Buy 100% genuine ${product.name} at Pure Nutrix.`} />
        {product.image_urls && product.image_urls[0] && <meta property="twitter:image" content={product.image_urls[0]} />}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.name,
            "image": product.image_urls || ["https://purenutrix.in/assets/logo.png"],
            "description": details.subtitle || `Buy ${product.name} at Pure Nutrix.`,
            "sku": `PN-${product.id || '001'}`,
            "brand": {
              "@type": "Brand",
              "name": "Pure Nutrix"
            },
            "offers": {
              "@type": "Offer",
              "url": `https://purenutrix.in/product/${(product.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
              "priceCurrency": "INR",
              "price": product.price || 1499,
              "priceValidUntil": "2027-12-31",
              "itemCondition": "https://schema.org/NewCondition",
              "availability": "https://schema.org/InStock",
              "seller": {
                "@type": "Organization",
                "name": "Pure Nutrix"
              }
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": details.rating || "4.8",
              "reviewCount": details.reviewsCount || "142",
              "bestRating": "5",
              "worstRating": "1"
            }
          })}
        </script>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="pdp-badge-best-seller">Best Seller</span>
              <button 
                className="pdp-share-btn"
                onClick={async () => {
                  const shareData = {
                    title: `Pure Nutrix - ${product.name}`,
                    text: `Hey! Check out this amazing product from Pure Nutrix: ${product.name}. 🌿\n\nIt's a best-seller and highly rated!`,
                    url: window.location.href,
                  };
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData);
                    } else {
                      // Fallback for desktop
                      await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
                      alert("Link and message copied to clipboard! You can now paste and share it anywhere.");
                    }
                  } catch (err) {
                    console.log('Error sharing:', err);
                  }
                }}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
              >
                <Share2 size={14} /> Share
              </button>
            </div>

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
          <div className="pdp-reviews-header-bar">
            <h2 className="pdp-section-header" style={{ margin: 0 }}>Customer Reviews ({reviewData.totalCount})</h2>
            <button 
              className="btn-write-review"
              onClick={() => setShowReviewModal(true)}
            >
              <MessageSquare size={18} /> ✍️ Write a Review
            </button>
          </div>

          {reviewSubmittedSuccess && (
            <div style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '14px 20px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
              <CheckCircle size={22} style={{ color: '#166534' }} />
              <div>
                <strong>Thank you! Your review & photos have been submitted successfully.</strong><br/>
                <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>It is currently ⏳ Pending Admin Inspection and will appear live on the website once approved by our moderation team.</span>
              </div>
            </div>
          )}

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
            {(showAllReviews ? reviewData.reviewsList : reviewData.reviewsList.slice(0, 4)).map((review, idx) => (
              <div key={review.id || idx} className="pdp-review-item">
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

                {/* Uploaded review photos on storefront */}
                {review.photos && review.photos.length > 0 && (
                  <div className="pdp-review-photos-list">
                    {review.photos.map((photoUrl, pIdx) => (
                      <div 
                        key={pIdx} 
                        className="pdp-review-photo-item"
                        onClick={() => setSelectedReviewPhoto({ url: photoUrl, author: review.name })}
                      >
                        <img src={photoUrl} alt="Customer product photo" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {reviewData.reviewsList.length > 4 && (
            <div className="pdp-see-more-container" style={{ textAlign: 'center', marginTop: '25px', marginBottom: '20px' }}>
              <button 
                className="btn-see-more-reviews" 
                onClick={() => setShowAllReviews(!showAllReviews)}
                style={{
                  padding: '14px 32px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {showAllReviews ? '🔼 See Less Reviews' : `🔽 See More Reviews (Show All ${reviewData.reviewsList.length} Customer Reviews)`}
              </button>
            </div>
          )}

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

      {/* ─── MODAL: WRITE A CUSTOMER REVIEW ───────────────────────────────── */}
      {showReviewModal && (
        <div className="pdp-review-modal-backdrop" onClick={() => setShowReviewModal(false)}>
          <div className="pdp-review-modal" onClick={e => e.stopPropagation()}>
            <div className="pdp-review-modal-header">
              <h3>✍️ Write a Review for {product.name}</h3>
              <button className="pdp-review-modal-close" onClick={() => setShowReviewModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="pdp-review-modal-body">
                <div className="pdp-review-form-group">
                  <label>Your Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="pdp-review-input" 
                    placeholder="e.g. Rajeet Kumar" 
                    value={reviewerName}
                    onChange={e => setReviewerName(e.target.value)}
                  />
                </div>

                <div className="pdp-review-form-group">
                  <label>Your Email Address * (For Verified Buyer badge)</label>
                  <input 
                    type="email" 
                    required 
                    className="pdp-review-input" 
                    placeholder="e.g. rajeet@gmail.com" 
                    value={reviewerEmail}
                    onChange={e => setReviewerEmail(e.target.value)}
                  />
                </div>

                <div className="pdp-review-form-group">
                  <label>Overall Star Rating *</label>
                  <div className="pdp-star-selector">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span 
                        key={i} 
                        style={{ color: i < reviewRating ? '#fbbf24' : '#cccccc' }}
                        onClick={() => setReviewRating(i + 1)}
                      >
                        ★
                      </span>
                    ))}
                    <span style={{ fontSize: '1rem', color: '#666', alignSelf: 'center', marginLeft: '8px' }}>
                      ({reviewRating}.0 / 5.0)
                    </span>
                  </div>
                </div>

                <div className="pdp-review-form-group">
                  <label>Your Review & Experience *</label>
                  <textarea 
                    rows="4" 
                    required 
                    className="pdp-review-textarea" 
                    placeholder="Tell us what you liked about this product..."
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                  />
                </div>

                <div className="pdp-review-form-group">
                  <label>📸 Add Product Photos (Optional)</label>
                  <div className="pdp-photo-upload-box">
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <label className="pdp-photo-upload-btn" style={{ margin: 0 }}>
                        <Upload size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Choose Image Files
                        <input type="file" accept="image/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
                      </label>
                      <button type="button" className="pdp-photo-upload-btn" onClick={handleAddSamplePhoto} style={{ margin: 0 }}>
                        ✨ Add Sample Photo
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <input 
                        type="url" 
                        className="pdp-review-input" 
                        placeholder="Or paste an Image URL here..." 
                        value={photoUrlInput}
                        onChange={e => setPhotoUrlInput(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 10px' }}
                      />
                      <button 
                        type="button" 
                        className="btn-review-submit" 
                        style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                        onClick={handleAddPhotoUrl}
                      >
                        Add
                      </button>
                    </div>

                    {reviewPhotos.length > 0 && (
                      <div className="pdp-uploaded-preview-grid">
                        {reviewPhotos.map((photo, pIdx) => (
                          <div key={pIdx} className="pdp-preview-thumb">
                            <img src={photo} alt="Upload preview" />
                            <button 
                              type="button" 
                              className="pdp-preview-remove"
                              onClick={() => setReviewPhotos(prev => prev.filter((_, idx) => idx !== pIdx))}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pdp-review-modal-footer">
                <button type="button" className="btn-add-cart" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => setShowReviewModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-review-submit">
                  Submit Review & Photos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: LIGHTBOX / VIEW CUSTOMER PHOTO ────────────────────────── */}
      {selectedReviewPhoto && (
        <div className="pdp-review-modal-backdrop" onClick={() => setSelectedReviewPhoto(null)}>
          <div className="pdp-review-modal" style={{ background: '#000', color: '#fff', maxWidth: '650px', border: '1px solid #444' }} onClick={e => e.stopPropagation()}>
            <div className="pdp-review-modal-header" style={{ background: '#111', borderBottom: '1px solid #333' }}>
              <h3 style={{ color: '#fff' }}>📸 Customer Photo by {selectedReviewPhoto.author}</h3>
              <button className="pdp-review-modal-close" style={{ color: '#fff' }} onClick={() => setSelectedReviewPhoto(null)}>×</button>
            </div>
            <div className="pdp-review-modal-body" style={{ textAlign: 'center', padding: '20px', background: '#000' }}>
              <img src={selectedReviewPhoto.url} alt="Full size customer review" style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '8px' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailsPage;
