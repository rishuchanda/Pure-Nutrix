import { supabase } from '../supabaseClient';

// Real customer reviews, stored in Supabase (table product_reviews).
// Only reviews an admin approved are public. Customers submit through the
// submit_product_review() function, which puts every review on "pending".

let approved = null;      // cached approved reviews (all products)
let loading = null;

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return ''; }
};

export const toStoreReview = (r) => ({
  id: r.id,
  productId: r.product_id,
  productName: r.product_name,
  customerName: r.customer_name,
  customerEmail: r.customer_email || '',
  rating: r.rating,
  date: fmtDate(r.created_at),
  createdAt: r.created_at,
  comment: r.comment,
  photos: r.photos || [],
  status: r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'Pending Moderation',
  verifiedBuyer: !!r.verified_buyer,
});

export const getApprovedReviewsCache = () => approved || [];

export async function loadApprovedReviews(force = false) {
  if (approved && !force) return approved;
  if (loading && !force) return loading;
  loading = (async () => {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('id, product_id, product_name, customer_name, rating, comment, photos, verified_buyer, status, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(500);
    approved = error ? (approved || []) : (data || []).map(toStoreReview);
    loading = null;
    window.dispatchEvent(new Event('pn_reviews_updated'));
    return approved;
  })();
  return loading;
}

// Shrinks a photo to max 1280px JPEG before upload (phone photos are 3–8 MB).
async function compressImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Only photos can be added');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82));
  } finally { URL.revokeObjectURL(url); }
}

const ERRORS = {
  login_required: 'Please log in to write a review.',
  invalid_name: 'Please enter your name (2–60 letters).',
  invalid_rating: 'Please choose a star rating.',
  invalid_comment: 'Please write at least 10 characters.',
  too_many_photos: 'You can add up to 3 photos.',
  invalid_photo: 'One of the photos could not be used. Please try again.',
  too_many: 'You have sent many reviews today. Please try again tomorrow.',
  invalid_product: 'This product could not be found.',
};

export async function submitReview({ productId, name, rating, comment, files = [] }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error(ERRORS.login_required);
  const photos = [];
  for (const [i, file] of files.slice(0, 3).entries()) {
    const blob = await compressImage(file);
    const path = `${user.id}/${Date.now()}-${i}.jpg`;
    const { error } = await supabase.storage.from('review-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw new Error('Photo upload failed. Please try again or submit without photos.');
    photos.push(supabase.storage.from('review-photos').getPublicUrl(path).data.publicUrl);
  }
  const { data, error } = await supabase.rpc('submit_product_review', {
    p_product_id: productId, p_name: name, p_rating: rating, p_comment: comment, p_photos: photos,
  });
  if (error) {
    const code = Object.keys(ERRORS).find((k) => (error.message || '').includes(k));
    throw new Error(code ? ERRORS[code] : 'Could not submit the review. Please try again.');
  }
  return data;
}

export async function fetchMyReviews() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('product_reviews')
    .select('id, product_id, product_name, customer_name, rating, comment, photos, verified_buyer, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return (data || []).map(toStoreReview);
}

// ---------- admin ----------
export async function fetchAllReviewsAdmin() {
  const { data, error } = await supabase.from('product_reviews').select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) throw error;
  return (data || []).map(toStoreReview);
}

export async function setReviewStatusAdmin(id, status) {
  const { error } = await supabase.from('product_reviews').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  loadApprovedReviews(true);
}

export async function setVerifiedAdmin(id, verified) {
  const { error } = await supabase.from('product_reviews').update({ verified_buyer: verified }).eq('id', id);
  if (error) throw error;
  loadApprovedReviews(true);
}

export async function deleteReviewAdmin(id) {
  const { error } = await supabase.from('product_reviews').delete().eq('id', id);
  if (error) throw error;
  loadApprovedReviews(true);
}
