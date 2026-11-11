import { getApprovedReviewsCache, loadApprovedReviews } from './reviewsStore';
// ─── Customer Reviews & Rating Store (LocalStorage + Seed Data) ─────────────

const DEFAULT_REVIEWS = [
  {
    id: "REV-1001",
    productId: "gluta-glow-01",
    productName: "Pure Nutrix L-Glutathione Skin Glow Tablets (1000mg)",
    customerName: "Ananya Sharma",
    customerEmail: "ananya.sharma@gmail.com",
    rating: 5,
    date: "26 Jul 2026",
    comment: "Been using this for around 3 weeks now. My skin looks noticeably clearer and less dull in the mornings. Very happy with the purchase!",
    photos: [],
    status: "Approved",
    verifiedBuyer: true,
    likes: 24
  },
  {
    id: "REV-1002",
    productId: "ashwa-500mg-01",
    productName: "Pure Nutrix Ashwagandha Root Extract Capsules 500mg",
    customerName: "Vikram Rathore",
    customerEmail: "vikram.fitness@yahoo.com",
    rating: 5,
    date: "25 Jul 2026",
    comment: "I have a very stressful IT job and used to get severe headaches by evening. Since taking this 500mg root extract, my mind feels much calmer.",
    photos: [],
    status: "Approved",
    verifiedBuyer: true,
    likes: 18
  },
  {
    id: "REV-1003",
    productId: "collagen-01",
    productName: "Pure Nutrix Collagen Peptides with Biotin & Hyaluronic Acid",
    customerName: "Sneha Mukherjee",
    customerEmail: "sneha.m89@gmail.com",
    rating: 5,
    date: "27 Jul 2026",
    comment: "My hair fall has noticeably reduced after finishing one box, and my skin feels much smoother and plump. Really works!",
    photos: [],
    status: "Approved",
    verifiedBuyer: true,
    likes: 12
  },
  {
    id: "REV-1004",
    productId: "seabuckthorn-500ml-01",
    productName: "Pure Nutrix Himalayan Sea Buckthorn Juice 500ml",
    customerName: "Rajat Kapoor",
    customerEmail: "rajat.k@outlook.com",
    rating: 5,
    date: "27 Jul 2026",
    comment: "Had severe acidity and bloating issues for years. Drinking 15ml of this berry juice with lukewarm water every morning has fixed my digestion!",
    photos: [],
    status: "Approved",
    verifiedBuyer: true,
    likes: 15
  }
];

export const getStoredReviews = () => {
  const saved = localStorage.getItem('pn_customer_reviews');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any old test/default reviews that don't match our 4 main products
        const validReviews = parsed.filter(rev => {
          const name = rev.productName?.toLowerCase() || '';
          return name.includes('glutathione') || name.includes('ashwagandha') || name.includes('collagen') || name.includes('buckthorn') || name.includes('juice') || rev.id.startsWith('REV-CURRENT');
        });
        if (validReviews.length > 0) return validReviews.map(rev => ({ ...rev, photos: [] }));
      }
    } catch (e) {
      console.error('Error parsing stored reviews:', e);
    }
  }
  localStorage.setItem('pn_customer_reviews', JSON.stringify(DEFAULT_REVIEWS));
  return DEFAULT_REVIEWS;
};

export const saveStoredReviews = (reviews) => {
  localStorage.setItem('pn_customer_reviews', JSON.stringify(reviews));
  // Dispatch custom event so UI components can re-render if listening
  window.dispatchEvent(new Event('pn_reviews_updated'));
};

export const addCustomerReview = ({ productName, customerName, customerEmail, rating, comment, photos = [] }) => {
  const currentReviews = getStoredReviews();
  const newReview = {
    id: `REV-${Date.now().toString().slice(-4)}`,
    productId: productName ? productName.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'general-product',
    productName: productName || 'Pure Nutrix Premium Product',
    customerName: customerName || 'Valued Customer',
    customerEmail: customerEmail || 'customer@purenutrix.in',
    rating: Number(rating) || 5,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    comment: comment || '',
    photos: Array.isArray(photos) ? photos : [],
    status: "Pending Moderation", // Needs admin approval
    verifiedBuyer: true,
    likes: 0
  };

  const updatedList = [newReview, ...currentReviews];
  saveStoredReviews(updatedList);
  return newReview;
};

export const updateReviewStatus = (id, newStatus) => {
  const currentReviews = getStoredReviews();
  const updated = currentReviews.map(rev => 
    rev.id === id ? { ...rev, status: newStatus } : rev
  );
  saveStoredReviews(updated);
  return updated;
};

export const deleteReview = (id) => {
  const currentReviews = getStoredReviews();
  const updated = currentReviews.filter(rev => rev.id !== id);
  saveStoredReviews(updated);
  return updated;
};

export const toggleVerifiedBuyer = (id) => {
  const currentReviews = getStoredReviews();
  const updated = currentReviews.map(rev => 
    rev.id === id ? { ...rev, verifiedBuyer: !rev.verifiedBuyer } : rev
  );
  saveStoredReviews(updated);
  return updated;
};

// Storefront getter (ProductDetailsPage, ProductsPage, ProductShowcase).
// Shows ONLY real reviews that a customer wrote and an admin approved
// (table product_reviews). No invented names, counts or ratings.
const NEW_LAUNCH_KEYWORDS = ['liposomal'];
const FAMILY_KEYWORDS = [['liposomal'], ['glutathione'], ['ashwagandha'], ['collagen'], ['buckthorn', 'himalayan']];

export const getProductReviews = (product) => {
  loadApprovedReviews();
  const productName = product?.name?.toLowerCase() || '';
  const isNew = NEW_LAUNCH_KEYWORDS.some(k => productName.includes(k));
  // Keyword family of this product (liposomal is checked before plain glutathione).
  const family = FAMILY_KEYWORDS.find(keys => keys.some(k => productName.includes(k))) || null;
  const otherLiposomal = family && family[0] === 'glutathione';

  const real = getApprovedReviewsCache().filter(rev => {
    if (rev.status !== 'Approved') return false;
    if (product?.id && rev.productId) return rev.productId === product.id;
    const revName = (rev.productName || '').toLowerCase();
    if (!family) return !!productName && revName.includes(productName);
    if (otherLiposomal && revName.includes('liposomal')) return false;
    return family.some(k => revName.includes(k));
  }).map(rev => ({
    id: rev.id,
    name: rev.customerName,
    rating: Number(rev.rating) || 0,
    date: rev.date,
    comment: rev.comment,
    verified: rev.verifiedBuyer,
    photos: rev.photos || [],
  }));

  const rating = real.length
    ? Math.round((real.reduce((a, r) => a + r.rating, 0) / real.length) * 10) / 10
    : null;
  return { totalCount: real.length, rating, reviewsList: real, isNew };
};
