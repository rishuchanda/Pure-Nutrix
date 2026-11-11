import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ShoppingBag, ArrowLeft, ChevronLeft, ChevronRight, Star, Plus, Minus, MessageSquare, Upload, Camera, CheckCircle, Image as ImageIcon, X, AlertCircle, ThumbsUp, Share2, FlaskConical, Truck, Wallet, ShieldCheck } from 'lucide-react';
import { getProductReviews } from '../utils/mockReviews';
import RatingStars from './RatingStars';
import { submitReview, loadApprovedReviews } from '../utils/reviewsStore';
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

const ProductDetailsPage = ({ product, onBack, onOrder, onAddToCart, onProductClick, onOpenAuth }) => {
  const [shareCopied, setShareCopied] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [otherProducts, setOtherProducts] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [reviewFiles, setReviewFiles] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
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
    // Real approved reviews from the database; re-render once they arrive.
    let alive = true;
    loadApprovedReviews().then(() => { if (alive) setReviewRefreshTrigger(t => t + 1); });
    return () => { alive = false; };
  }, [product?.id]);

  useEffect(() => {
    // Remember this product for the "Recently viewed" row on the home page
    if (!product?.id) return;
    try {
      const key = 'pn_recently_viewed';
      const list = JSON.parse(localStorage.getItem(key) || '[]').filter(p => p && p.id !== product.id);
      list.unshift(product);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 6)));
    } catch { /* storage blocked */ }
  }, [product?.id]);

  useEffect(() => {
    if (window.location.hash !== '#reviews') return undefined;
    const t = setTimeout(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }), 600);
    return () => clearTimeout(t);
  }, [product?.id]);

  useEffect(() => {
    setShowAllReviews(false);
    window.scrollTo(0, 0);
    if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
  }, [product?.id]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    e.target.value = '';
    const room = Math.max(0, 3 - reviewFiles.length);
    const picked = files.slice(0, room);
    setReviewFiles(prev => [...prev, ...picked]);
    setReviewPhotos(prev => [...prev, ...picked.map(f => URL.createObjectURL(f))]);
  };

  const removeReviewPhoto = (idx) => {
    setReviewFiles(prev => prev.filter((_, i) => i !== idx));
    setReviewPhotos(prev => { const url = prev[idx]; if (url) URL.revokeObjectURL(url); return prev.filter((_, i) => i !== idx); });
  };

  const openReviewForm = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { onOpenAuth ? onOpenAuth() : alert('Please log in to write a review.'); return; }
    if (!reviewerName) setReviewerName(user.user_metadata?.full_name || user.user_metadata?.name || '');
    setReviewError('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (reviewSubmitting) return;
    setReviewError('');
    setReviewSubmitting(true);
    try {
      await submitReview({ productId: product.id, name: reviewerName.trim(), rating: reviewRating, comment: reviewComment.trim(), files: reviewFiles });
      setShowReviewModal(false);
      setReviewSubmittedSuccess(true);
      setReviewComment('');
      reviewPhotos.forEach(u => URL.revokeObjectURL(u));
      setReviewPhotos([]);
      setReviewFiles([]);
      setTimeout(() => setReviewSubmittedSuccess(false), 8000);
    } catch (err) {
      setReviewError(err.message || 'Could not submit the review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
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
        value: typeof product.price === 'number' ? product.price : Number(String(product.price).replace(/[^0-9.-]+/g, "")),
        currency: 'INR'
      });
    }
  }, [product]);

  // Mobile: show a slim "Add to cart" bar once the main buttons scroll away.
  const actionsRef = useRef(null);
  const [showStickyBuy, setShowStickyBuy] = useState(false);
  useEffect(() => {
    const el = actionsRef.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      setShowStickyBuy(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [product?.id]);
  useEffect(() => {
    // Phones: keep the chatbot from covering the Buy buttons on product pages
    document.body.classList.add('pn-hide-bot');
    return () => document.body.classList.remove('pn-hide-bot');
  }, []);
  useEffect(() => {
    document.body.classList.toggle('pn-sticky-buy', showStickyBuy);
    return () => document.body.classList.remove('pn-sticky-buy');
  }, [showStickyBuy]);

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
        <meta property="og:type" content="product" />
        {product.image_urls && product.image_urls[0] && <meta property="og:image" content={product.image_urls[0].startsWith('http') ? product.image_urls[0] : `https://purenutrix.in${product.image_urls[0]}`} />}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={`${product.name} | Buy Online at Best Price - Pure Nutrix India`} />
        <meta property="twitter:description" content={details.subtitle || `Buy 100% genuine ${product.name} at Pure Nutrix.`} />
        {product.image_urls && product.image_urls[0] && <meta property="twitter:image" content={product.image_urls[0].startsWith('http') ? product.image_urls[0] : `https://purenutrix.in${product.image_urls[0]}`} />}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.name,
            "image": (product.image_urls && product.image_urls.length ? product.image_urls : ["/assets/og-image.jpg"]).map(u => (u.startsWith('http') ? u : `https://purenutrix.in${u}`)),
            "description": details.subtitle || `Buy ${product.name} at Pure Nutrix.`,
            "sku": product.slug || String(product.id),
            "brand": {
              "@type": "Brand",
              "name": "Pure Nutrix"
            },
            "offers": {
              "@type": "Offer",
              "url": `https://purenutrix.in/product/${product.slug || product.id}`,
              "priceCurrency": "INR",
              "price": product.price,
              "priceValidUntil": "2027-12-31",
              "itemCondition": "https://schema.org/NewCondition",
              "availability": (product.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"),
              "seller": {
                "@type": "Organization",
                "name": "Pure Nutrix"
              }
            }
            // No aggregateRating here on purpose. The star rating and review
            // count shown on the page are placeholder data, not verified
            // customer reviews. Sending them to Google as structured data is
            // what triggers a fake-review manual action, and it is what puts
            // invented stars in search results. Add this block back only once
            // the ratings come from real, verified orders.
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
            <div
              className="pdp-main-image-container"
              onTouchStart={(e) => { e.currentTarget.dataset.tx = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                const dx = e.changedTouches[0].clientX - Number(e.currentTarget.dataset.tx || 0);
                if (Math.abs(dx) > 45) (dx < 0 ? handleNextImage : handlePrevImage)();
              }}
            >
              {product.image_urls && product.image_urls.length > 1 && (
                <div className="pdp-dots" aria-hidden="true">
                  {product.image_urls.map((_, i) => <span key={i} className={i === activeImage ? 'on' : ''} />)}
                </div>
              )}
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
                    <img src={img} alt={`${product.name} image ${idx + 1}`} loading="lazy" decoding="async" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - PRODUCT INFO */}
          <div className="pdp-info-column">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="pdp-badge-best-seller">{reviewData.isNew ? 'New Launch' : 'Buy 1 Get 1 FREE'}</span>
              <button
                type="button"
                className="pdp-share-btn"
                aria-label={`Share ${product.name}`}
                onClick={async () => {
                  const shareData = {
                    title: `Pure Nutrix - ${product.name}`,
                    text: `Check out ${product.name} from Pure Nutrix 🌿 Buy 1 Get 1 FREE on purenutrix.in`,
                    url: window.location.href.split('#')[0],
                  };
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData);
                    } else {
                      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2200);
                    }
                  } catch (err) {
                    // user closed the share sheet — nothing to do
                  }
                }}
              >
                <Share2 size={15} /> {shareCopied ? 'Link copied' : 'Share'}
              </button>
            </div>

            <h1 className="pdp-title">{product.name}</h1>
            <p className="pdp-subtitle">{details.subtitle}</p>

            <div className="pdp-star-summary" onClick={() => document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' })}>
              {reviewData.totalCount > 0 && (
              <div className="pdp-stars"><RatingStars rating={reviewData.rating} size={16} /></div>
              )}
              <span>{reviewData.totalCount > 0 ? `${reviewData.rating} (${reviewData.totalCount} ${reviewData.totalCount === 1 ? 'review' : 'reviews'})` : `${reviewData.isNew ? 'New launch · ' : ''}No reviews yet — be the first to review`}</span>
            </div>

            <div className="pdp-price-row">
              <span className="pdp-price">₹{product.price}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="pdp-mrp">₹{product.original_price}</span>
              )}
              <span className="pdp-tax-inclusive">(Inclusive of all taxes)</span>
            </div>

            <div className="pdp-offers-box">
              <div className="pdp-offer-item"><strong>Offer:</strong> Buy 1 Get 1 FREE — the free jar is added to your cart automatically.</div>
              {typeof product.price === 'number' && (
                <div className="pdp-bogo-math">
                  <span>You get <strong>2 packs</strong> for <strong>₹{product.price}</strong></span>
                  <span className="pdp-bogo-each">= ₹{Math.round(product.price / 2)} per pack</span>
                </div>
              )}
            </div>

            <div className="pdp-tags">
              {details.tags.map((tag, idx) => (
                <span key={idx} className="pdp-tag">{tag}</span>
              ))}
            </div>

            {details.labReportSlug && (
              <a className="pdp-lab-report" href={`/lab-report/${details.labReportSlug}`}>
                <FlaskConical size={18} />
                <span>
                  <strong>Lab tested — see the report</strong>
                  <small>Same report as the QR code on the jar</small>
                </span>
                <ChevronRight size={18} />
              </a>
            )}

            <div className="pdp-actions" ref={actionsRef}>
              <button className="btn-add-cart" onClick={() => onAddToCart && onAddToCart(product)}>
                Add to Cart
              </button>
              <button className="btn-buy-now" onClick={() => onOrder(product)}>
                Buy Now
              </button>
            </div>

            <p className="pdp-dispatch"><Truck size={15} /> Dispatched from Jaipur within 24–48 hours (except Sundays)</p>

            <a className="pdp-wa-ask" href={`/whatsapp?p=${encodeURIComponent(product.slug || '')}`} target="_blank" rel="noopener noreferrer">
              <MessageSquare size={18} />
              <span><strong>Questions? Ask us on WhatsApp</strong><small>Price, how to take, delivery — quick reply</small></span>
              <ChevronRight size={18} />
            </a>

            <div className="pdp-trust-row">
              <span><Truck size={16} /> Free shipping above ₹499</span>
              <span><Wallet size={16} /> Cash on Delivery</span>
              <span><ShieldCheck size={16} /> Secure payment</span>
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
            <h2 className="pdp-section-header" style={{ margin: 0 }}>Customer Reviews{reviewData.totalCount > 0 ? ` (${reviewData.totalCount})` : ''}</h2>
            <button 
              className="btn-write-review"
              onClick={openReviewForm}
            >
              <MessageSquare size={18} /> Write a Review
            </button>
          </div>

          {reviewSubmittedSuccess && (
            <div style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '14px 20px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
              <CheckCircle size={22} style={{ color: '#166534' }} />
              <div>
                <strong>Thank you! Your review has been sent.</strong><br/>
                <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>It will appear here after our team checks it (usually within 1–2 days). You can see its status in My Account → My Reviews.</span>
              </div>
            </div>
          )}

          <div className="pdp-ai-summary">
            <h3>✨ Product Highlights</h3>
            <p>{details.aiSummary.text}</p>
            <div className="pdp-ai-topics">
              {details.aiSummary.topics.map((topic, idx) => (
                <span key={idx} className="pdp-ai-topic">{topic}</span>
              ))}
            </div>
          </div>

          {reviewData.reviewsList.length === 0 && (
            <p style={{ color: '#555', margin: '10px 0 30px' }}>No reviews yet. Bought this product? Tap “Write a Review” to share your experience.</p>
          )}

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
                        <img src={op.image_urls[0]} alt={op.name} loading="lazy" decoding="async" />
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
        <div className="pdp-review-modal-backdrop" onClick={() => !reviewSubmitting && setShowReviewModal(false)}>
          <div className="pdp-review-modal" onClick={e => e.stopPropagation()}>
            <div className="pdp-review-modal-header">
              <h3>Write a review</h3>
              <button type="button" className="pdp-review-modal-close" aria-label="Close" onClick={() => setShowReviewModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="pdp-review-modal-body">
                <p className="pdp-review-product">{product.name}</p>

                <div className="pdp-review-form-group">
                  <label>Your rating *</label>
                  <div className="pdp-star-selector" role="radiogroup" aria-label="Star rating">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        type="button"
                        key={i}
                        role="radio"
                        aria-checked={reviewRating === i + 1}
                        aria-label={`${i + 1} star${i ? 's' : ''}`}
                        className="pdp-star-btn"
                        style={{ color: i < reviewRating ? '#f5b301' : '#d4d4d4' }}
                        onClick={() => setReviewRating(i + 1)}
                      >★</button>
                    ))}
                    <span className="pdp-star-label">{['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][reviewRating]}</span>
                  </div>
                </div>

                <div className="pdp-review-form-group">
                  <label htmlFor="rv-name">Name shown with your review *</label>
                  <input id="rv-name" type="text" required minLength={2} maxLength={60} className="pdp-review-input"
                    placeholder="e.g. Priya S." value={reviewerName} onChange={e => setReviewerName(e.target.value)} />
                </div>

                <div className="pdp-review-form-group">
                  <label htmlFor="rv-text">Your experience *</label>
                  <textarea id="rv-text" rows="4" required minLength={10} maxLength={1500} className="pdp-review-textarea"
                    placeholder="How long have you used it? What did you like or not like?"
                    value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
                  <small className="pdp-review-hint">{reviewComment.trim().length}/1500 · at least 10 characters</small>
                </div>

                <div className="pdp-review-form-group">
                  <label>Photos (optional, up to 3)</label>
                  <div className="pdp-photo-upload-box">
                    {reviewFiles.length < 3 && (
                      <label className="pdp-photo-upload-btn" style={{ margin: 0 }}>
                        <Camera size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Add photos
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
                      </label>
                    )}
                    {reviewPhotos.length > 0 && (
                      <div className="pdp-uploaded-preview-grid">
                        {reviewPhotos.map((photo, pIdx) => (
                          <div key={pIdx} className="pdp-preview-thumb">
                            <img src={photo} alt="Your photo" />
                            <button type="button" className="pdp-preview-remove" aria-label="Remove photo" onClick={() => removeReviewPhoto(pIdx)}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <p className="pdp-review-note">Reviews are checked by our team before they appear on the website.</p>
                {reviewError && <p className="pdp-review-error" role="alert">{reviewError}</p>}
              </div>

              <div className="pdp-review-modal-footer">
                <button type="button" className="btn-add-cart" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => setShowReviewModal(false)} disabled={reviewSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-review-submit" disabled={reviewSubmitting}>
                  {reviewSubmitting ? 'Submitting…' : 'Submit review'}
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
      {createPortal(
      <div className={`pdp-sticky-buy ${showStickyBuy ? 'is-visible' : ''}`} aria-hidden={!showStickyBuy}>
        {product.image_urls?.[0] && <img src={product.image_urls[0]} alt="" />}
        <div className="pdp-sticky-info">
          <span className="pdp-sticky-name">{product.name}</span>
          <span className="pdp-sticky-price">
            ₹{product.price}
            {product.original_price > product.price && <s>₹{product.original_price}</s>}
          </span>
        </div>
        <button className="pdp-sticky-btn" tabIndex={showStickyBuy ? 0 : -1} onClick={() => onAddToCart && onAddToCart(product)}>Add to Cart</button>
      </div>,
      document.body)}
    </div>
  );
};

export default ProductDetailsPage;
