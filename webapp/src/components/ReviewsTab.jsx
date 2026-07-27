import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, CheckCircle, XCircle, Trash2, Eye, Search, Filter, 
  MessageSquare, Image as ImageIcon, ShieldCheck, AlertCircle, 
  ThumbsUp, Calendar, User, RefreshCw, Check, X, Award, ExternalLink
} from 'lucide-react';
import { 
  getStoredReviews, updateReviewStatus, deleteReview, 
  toggleVerifiedBuyer, saveStoredReviews 
} from '../utils/mockReviews';
import './ReviewsTab.css';

const ReviewsTab = ({ showNotification }) => {
  const [reviews, setReviews] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [photoFilter, setPhotoFilter] = useState('all');
  
  // Modal states
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [inspectReview, setInspectReview] = useState(null);

  // Load reviews on mount & listen for updates
  const loadReviews = () => {
    const list = getStoredReviews();
    setReviews(list || []);
  };

  useEffect(() => {
    loadReviews();
    window.addEventListener('pn_reviews_updated', loadReviews);
    return () => window.removeEventListener('pn_reviews_updated', loadReviews);
  }, []);

  // Handlers for moderation
  const handleApprove = (id, customerName) => {
    const updated = updateReviewStatus(id, 'Approved');
    setReviews(updated);
    if (showNotification) {
      showNotification(`✅ Review by "${customerName}" Approved & Posted live on website!`);
    }
  };

  const handleReject = (id, customerName) => {
    const updated = updateReviewStatus(id, 'Rejected');
    setReviews(updated);
    if (showNotification) {
      showNotification(`🚫 Review by "${customerName}" Rejected & Removed from website.`);
    }
  };

  const handleDelete = (id, customerName) => {
    if (window.confirm(`Are you sure you want to permanently delete the review by ${customerName}?`)) {
      const updated = deleteReview(id);
      setReviews(updated);
      if (showNotification) {
        showNotification(`🗑️ Review by "${customerName}" permanently deleted.`);
      }
    }
  };

  const handleToggleVerified = (id, customerName) => {
    const updated = toggleVerifiedBuyer(id);
    setReviews(updated);
    if (showNotification) {
      showNotification(`✔ Verified Buyer status toggled for "${customerName}".`);
    }
  };

  // Filtered & Searched reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(rev => {
      // Search match
      const query = searchQuery.toLowerCase();
      const matchSearch = !query || 
        rev.customerName?.toLowerCase().includes(query) ||
        rev.customerEmail?.toLowerCase().includes(query) ||
        rev.productName?.toLowerCase().includes(query) ||
        rev.comment?.toLowerCase().includes(query);

      // Status match
      const matchStatus = statusFilter === 'all' || 
        rev.status?.toLowerCase() === statusFilter.toLowerCase();

      // Rating match
      const matchRating = ratingFilter === 'all' || 
        (ratingFilter === '5' && rev.rating === 5) ||
        (ratingFilter === '4' && rev.rating === 4) ||
        (ratingFilter === '3' && rev.rating === 3) ||
        (ratingFilter === 'low' && rev.rating <= 2);

      // Photo match
      const matchPhoto = photoFilter === 'all' || 
        (photoFilter === 'photos' && rev.photos && rev.photos.length > 0) ||
        (photoFilter === 'no-photos' && (!rev.photos || rev.photos.length === 0));

      return matchSearch && matchStatus && matchRating && matchPhoto;
    });
  }, [reviews, searchQuery, statusFilter, ratingFilter, photoFilter]);

  // KPI Metrics
  const totalCount = reviews.length;
  const pendingCount = reviews.filter(r => r.status === 'Pending Moderation').length;
  const approvedCount = reviews.filter(r => r.status === 'Approved').length;
  const photoCount = reviews.filter(r => r.photos && r.photos.length > 0).length;
  const avgRating = totalCount > 0 
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / totalCount).toFixed(1)
    : '5.0';

  return (
    <div className="reviews-admin-wrapper">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="reviews-admin-header">
        <div className="reviews-header-left">
          <h2><Star size={28} style={{ color: '#d4af37', fill: '#d4af37' }} /> Product Reviews & Rating Moderation</h2>
          <p>Inspect customer reviews, moderate user submissions, verify buyer status, and manage product photos live on your storefront.</p>
        </div>
        <div className="reviews-header-actions">
          <button 
            className="reviews-btn reviews-btn-secondary"
            onClick={() => {
              loadReviews();
              if (showNotification) showNotification('🔄 Reviews data refreshed.');
            }}
          >
            <RefreshCw size={16} /> Refresh Data
          </button>
        </div>
      </div>

      {/* ─── KPI Stats Grid ──────────────────────────────────────────────── */}
      <div className="reviews-kpi-grid">
        <div className="reviews-kpi-card" onClick={() => setStatusFilter('all')} style={{ cursor: 'pointer' }}>
          <div className="reviews-kpi-info">
            <h4>Total Reviews Submitted</h4>
            <div className="kpi-value">{totalCount}</div>
          </div>
          <div className="reviews-kpi-icon icon-cyan">
            <MessageSquare size={24} />
          </div>
        </div>

        <div className="reviews-kpi-card" onClick={() => setStatusFilter('Pending Moderation')} style={{ cursor: 'pointer', borderColor: pendingCount > 0 ? '#f97316' : undefined }}>
          <div className="reviews-kpi-info">
            <h4>Pending Inspection</h4>
            <div className="kpi-value" style={{ color: pendingCount > 0 ? '#f97316' : '#f8fafc' }}>{pendingCount}</div>
          </div>
          <div className="reviews-kpi-icon icon-orange">
            <AlertCircle size={24} />
          </div>
        </div>

        <div className="reviews-kpi-card" onClick={() => setStatusFilter('Approved')} style={{ cursor: 'pointer' }}>
          <div className="reviews-kpi-info">
            <h4>Live / Posted on Store</h4>
            <div className="kpi-value" style={{ color: '#10b981' }}>{approvedCount}</div>
          </div>
          <div className="reviews-kpi-icon icon-green">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="reviews-kpi-card" onClick={() => setPhotoFilter('photos')} style={{ cursor: 'pointer' }}>
          <div className="reviews-kpi-info">
            <h4>Reviews with Photos</h4>
            <div className="kpi-value" style={{ color: '#d4af37' }}>{photoCount}</div>
          </div>
          <div className="reviews-kpi-icon icon-gold">
            <ImageIcon size={24} />
          </div>
        </div>

        <div className="reviews-kpi-card">
          <div className="reviews-kpi-info">
            <h4>Average Customer Rating</h4>
            <div className="kpi-value" style={{ color: '#a855f7' }}>{avgRating} ★</div>
          </div>
          <div className="reviews-kpi-icon icon-purple">
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* ─── Toolbar & Filters ───────────────────────────────────────────── */}
      <div className="reviews-toolbar">
        <div className="reviews-search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by customer name, email, product, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="reviews-filter-group">
          <select 
            className="reviews-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">🔍 All Statuses ({totalCount})</option>
            <option value="Pending Moderation">⏳ Pending Inspection ({pendingCount})</option>
            <option value="Approved">✔ Approved & Posted ({approvedCount})</option>
            <option value="Rejected">🚫 Rejected / Hidden</option>
          </select>

          <select 
            className="reviews-filter-select"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
          >
            <option value="all">⭐ All Star Ratings</option>
            <option value="5">⭐⭐⭐⭐⭐ 5 Stars Only</option>
            <option value="4">⭐⭐⭐⭐ 4 Stars Only</option>
            <option value="3">⭐⭐⭐ 3 Stars Only</option>
            <option value="low">⭐⭐ 1-2 Stars (Critical)</option>
          </select>

          <select 
            className="reviews-filter-select"
            value={photoFilter}
            onChange={(e) => setPhotoFilter(e.target.value)}
          >
            <option value="all">🖼️ All Submissions</option>
            <option value="photos">📸 With Uploaded Photos ({photoCount})</option>
            <option value="no-photos">📝 Text Only</option>
          </select>
        </div>
      </div>

      {/* ─── Reviews List ────────────────────────────────────────────────── */}
      {filteredReviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px dashed #475569' }}>
          <MessageSquare size={48} style={{ color: '#64748b', marginBottom: '16px' }} />
          <h3 style={{ color: '#cbd5e1', margin: '0 0 8px 0' }}>No customer reviews match your filter criteria</h3>
          <p style={{ color: '#64748b', margin: 0 }}>Try adjusting your search query or filter selections above.</p>
        </div>
      ) : (
        <div className="reviews-cards-list">
          {filteredReviews.map((rev) => {
            const isApproved = rev.status === 'Approved';
            const isPending = rev.status === 'Pending Moderation';
            const isRejected = rev.status === 'Rejected';

            return (
              <div key={rev.id} className="review-admin-card">
                <div className={`review-card-status-strip ${isApproved ? 'strip-approved' : isPending ? 'strip-pending' : 'strip-rejected'}`} />

                {/* Card Header */}
                <div className="review-card-top">
                  <div className="review-user-meta">
                    <div className="review-user-avatar">
                      {rev.customerName ? rev.customerName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="review-user-details">
                      <h5>
                        {rev.customerName}
                        {rev.verifiedBuyer && (
                          <span className="verified-badge" title="Verified buyer status">
                            ✔ Verified Buyer
                          </span>
                        )}
                      </h5>
                      <span>{rev.customerEmail || 'No email provided'}</span>
                    </div>
                  </div>

                  <div className="review-meta-badges">
                    <span className={`review-status-badge ${isApproved ? 'status-approved' : isPending ? 'status-pending' : 'status-rejected'}`}>
                      {isApproved && '✔ Posted Live'}
                      {isPending && '⏳ Pending Inspection'}
                      {isRejected && '🚫 Rejected'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="review-card-body">
                  <div className="review-product-tag">
                    🛍️ Product Reviewed: <strong style={{ color: '#f8fafc', fontWeight: 700 }}>{rev.productName}</strong>
                  </div>

                  <div className="review-stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} style={{ color: i < rev.rating ? '#fbbf24' : '#475569' }}>★</span>
                    ))}
                    <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700, marginLeft: '8px' }}>
                      ({rev.rating}.0 / 5.0)
                    </span>
                  </div>

                  <p className="review-comment-text">"{rev.comment}"</p>

                  {/* Uploaded Photos Grid */}
                  {rev.photos && rev.photos.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                        📸 Customer Uploaded Photos ({rev.photos.length}) — Click to Inspect:
                      </div>
                      <div className="review-photos-grid">
                        {rev.photos.map((photoUrl, pIdx) => (
                          <div 
                            key={pIdx} 
                            className="review-photo-thumb"
                            onClick={() => setSelectedPhoto({ url: photoUrl, author: rev.customerName, product: rev.productName })}
                          >
                            <img src={photoUrl} alt={`Review photo ${pIdx + 1}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="review-card-footer">
                  <div className="review-date-id">
                    Submitted: <strong>{rev.date}</strong> | Review ID: <code>{rev.id}</code>
                  </div>

                  <div className="review-action-btns">
                    <button 
                      className="btn-action-inspect"
                      onClick={() => setInspectReview(rev)}
                      title="Inspect full review details"
                    >
                      <Eye size={15} /> Inspect Details
                    </button>

                    <button 
                      className="reviews-btn reviews-btn-secondary" 
                      style={{ padding: '7px 12px', fontSize: '0.78rem' }}
                      onClick={() => handleToggleVerified(rev.id, rev.customerName)}
                      title="Toggle verified buyer checkmark"
                    >
                      <ShieldCheck size={15} style={{ color: rev.verifiedBuyer ? '#10b981' : '#64748b' }} /> 
                      {rev.verifiedBuyer ? 'Verified Buyer' : 'Mark Verified'}
                    </button>

                    {!isApproved && (
                      <button 
                        className="btn-action-approve"
                        onClick={() => handleApprove(rev.id, rev.customerName)}
                      >
                        <Check size={15} /> Post / Approve
                      </button>
                    )}

                    {!isRejected && (
                      <button 
                        className="btn-action-reject"
                        onClick={() => handleReject(rev.id, rev.customerName)}
                      >
                        <X size={15} /> Reject / Hide
                      </button>
                    )}

                    <button 
                      className="btn-action-delete"
                      onClick={() => handleDelete(rev.id, rev.customerName)}
                      title="Delete review permanently"
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL: PHOTO INSPECTION ────────────────────────────────────────── */}
      {selectedPhoto && (
        <div className="reviews-modal-backdrop" onClick={() => setSelectedPhoto(null)}>
          <div className="reviews-modal-content" onClick={e => e.stopPropagation()}>
            <div className="reviews-modal-header">
              <h3>📸 Inspecting Customer Review Photo</h3>
              <button className="reviews-modal-close" onClick={() => setSelectedPhoto(null)}>×</button>
            </div>
            <div className="reviews-modal-body">
              <div className="reviews-modal-image-container">
                <img src={selectedPhoto.url} alt="Inspected Customer Photo" />
              </div>
              <p style={{ color: '#f8fafc', margin: '0 0 4px 0', fontWeight: 700 }}>
                Uploaded by: {selectedPhoto.author}
              </p>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>
                Product: {selectedPhoto.product}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: FULL INSPECTION ────────────────────────────────────────── */}
      {inspectReview && (
        <div className="reviews-modal-backdrop" onClick={() => setInspectReview(null)}>
          <div className="reviews-modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="reviews-modal-header">
              <h3>🔍 Complete Review Inspection Report</h3>
              <button className="reviews-modal-close" onClick={() => setInspectReview(null)}>×</button>
            </div>
            <div className="reviews-modal-body" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#1e293b', padding: '14px', borderRadius: '10px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>CUSTOMER IDENTIFIER</div>
                <div style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 700 }}>{inspectReview.customerName}</div>
                <div style={{ color: '#38bdf8', fontSize: '0.9rem' }}>{inspectReview.customerEmail}</div>
                <div style={{ marginTop: '6px' }}>
                  {inspectReview.verifiedBuyer ? (
                    <span className="verified-badge">✔ Verified Purchase Record</span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Unverified Purchase</span>
                  )}
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '14px', borderRadius: '10px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>PRODUCT SUBJECT</div>
                <div style={{ color: '#d4af37', fontSize: '1rem', fontWeight: 700 }}>{inspectReview.productName}</div>
              </div>

              <div style={{ background: '#1e293b', padding: '14px', borderRadius: '10px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '6px' }}>RATING & COMMENT</div>
                <div style={{ color: '#fbbf24', fontSize: '1.2rem', marginBottom: '8px' }}>
                  {Array.from({ length: inspectReview.rating }).map((_, i) => '★').join('')}
                  <span style={{ color: '#cbd5e1', fontSize: '0.9rem', marginLeft: '8px' }}>({inspectReview.rating}.0 Star)</span>
                </div>
                <div style={{ color: '#f8fafc', fontStyle: 'italic', lineHeight: '1.5', borderLeft: '3px solid #38bdf8', paddingLeft: '12px' }}>
                  "{inspectReview.comment}"
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid #334155', paddingTop: '14px' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Status: </span>
                  <strong style={{ color: inspectReview.status === 'Approved' ? '#10b981' : inspectReview.status === 'Pending Moderation' ? '#f97316' : '#ef4444' }}>
                    {inspectReview.status}
                  </strong>
                </div>
                <button 
                  className="reviews-btn reviews-btn-primary" 
                  onClick={() => setInspectReview(null)}
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;
