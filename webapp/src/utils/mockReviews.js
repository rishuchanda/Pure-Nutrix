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

// Backwards-compatible getter used by storefront pages (ProductDetailsPage, ProductsPage, etc.)
export const getProductReviews = (product) => {
  const allStored = getStoredReviews();
  const productName = product?.name?.toLowerCase() || '';
  const isGlutathione = productName.includes('glutathione');
  const isAshwagandha = productName.includes('ashwagandha');
  const isCollagen = productName.includes('collagen');
  const isSeaBuckthorn = productName.includes('sea buckthorn') || productName.includes('juice') || productName.includes('himalayan');

  // Filter approved dynamic reviews that match this product strictly
  const matchingApproved = allStored.filter(rev => {
    if (rev.status !== 'Approved') return false;
    const revName = rev.productName?.toLowerCase() || '';
    if (isGlutathione && revName.includes('glutathione')) return true;
    if (isAshwagandha && revName.includes('ashwagandha')) return true;
    if (isCollagen && revName.includes('collagen')) return true;
    if (isSeaBuckthorn && (revName.includes('buckthorn') || revName.includes('juice') || revName.includes('himalayan'))) return true;
    if (!isGlutathione && !isAshwagandha && !isCollagen && !isSeaBuckthorn && productName && revName.includes(productName)) return true;
    return false;
  });

  // Deterministic count based on product name/id
  const nameLength = product?.name?.length || 10;
  const baseCount = isGlutathione ? 186 : (isAshwagandha ? 154 : (isCollagen ? 142 : (isSeaBuckthorn ? 168 : (120 + (nameLength * 7)))));
  const totalCount = baseCount + matchingApproved.length;
  
  // Stable random rating between 4.5 and 4.9
  const possibleRatings = [4.5, 4.6, 4.7, 4.8, 4.9];
  const baseRating = isGlutathione ? 4.8 : (isAshwagandha ? 4.9 : (isCollagen ? 4.8 : (isSeaBuckthorn ? 4.7 : possibleRatings[(nameLength * 17) % possibleRatings.length])));

  // Comprehensive customer names
  const names = [
    "Priya Sharma", "Rahul Verma", "Neha Gupta", "Amit Kumar", "Sneha Desai", 
    "Ravi Singh", "Anjali Patel", "Vikram Reddy", "Kavita Rao", "Siddharth Jain",
    "Meera Nair", "Pooja Agarwal", "Rohan Mehta", "Simran Kaur", "Arjun Khanna"
  ];

  // Dedicated review sets for each product type (Real, natural conversational phrasing without fake stock photos)
  const glutaReviews = [
    { comment: "I've struggled with dark spots for a while, but this glutathione has really helped even out my skin tone. Plus, it gives a nice natural glow!", photos: [], rating: 5 },
    { comment: "Good quality glutathione. I take 1 tablet daily after lunch. My forehead tanning and dark spots have lightened quite a bit.", photos: [], rating: 5 },
    { comment: "Delivery was fast, got it in 2 days. Bottle came properly sealed with barcode. Taste is fine and no stomach discomfort so far.", photos: [], rating: 5 },
    { comment: "I had acne pigmentation on my cheeks for months. Started this 1000mg course last month and the marks are definitely fading now.", photos: [], rating: 5 },
    { comment: "Really good product for uneven skin tone. My sister recommended this brand to me. Skin feels hydrated and glowing.", photos: [], rating: 4 },
    { comment: "Original product. Best part is it has Vitamin C included so you don't need to buy a separate tablet for absorption.", photos: [], rating: 5 },
    { comment: "Taking it for 25 days now. Friends at work actually asked if I changed my face cream! Gives a nice subtle glow from inside.", photos: [], rating: 5 },
    { comment: "No side effects or acidity issues for me. Packaging is sturdy and tablets are easy to swallow with water.", photos: [], rating: 5 },
    { comment: "Worth the money. I used to spend a lot on chemical peels, but taking daily glutathione is working much better for my pigmentation.", photos: [], rating: 4 },
    { comment: "Skin texture feels smoother and soft. Even my under-eye darkness looks slightly better after consistent use.", photos: [], rating: 5 },
    { comment: "Genuine brand. I checked the QR code on the box. Noticeable difference in skin brightness after finishing half the bottle.", photos: [], rating: 5 },
    { comment: "Very satisfied! Gives a healthy, even complexion. Ordering my second bottle today.", photos: [], rating: 5 }
  ];

  const ashwaReviews = [
    { comment: "This ashwagandha is a lifesaver. My sleep schedule was messed up due to work stress, and this completely fixed my sleep cycle and anxiety.", photos: [], rating: 5 },
    { comment: "Best thing about this is sleep quality! I take one capsule with warm milk before going to bed. Falling asleep is so much easier now.", photos: [], rating: 5 },
    { comment: "Taking this for gym recovery and stamina. Muscle soreness after leg day has reduced and morning energy is great.", photos: [], rating: 5 },
    { comment: "Pure root extract, no weird smell or aftertaste. Doesn't make you feel drowsy or sleepy during day time office hours.", photos: [], rating: 5 },
    { comment: "My mood swings and anxiety have reduced after 2 weeks of regular use. Really helps in keeping cortisol in check.", photos: [], rating: 5 },
    { comment: "Good product and prompt delivery by Pure Nutrix. 500mg potency is just right for daily use without any side effects.", photos: [], rating: 5 },
    { comment: "I used to wake up tired even after 8 hours of sleep. This has genuinely improved my morning freshness and focus at work.", photos: [], rating: 4 },
    { comment: "Trainer suggested Ashwagandha for natural strength support. Quality seems premium and capsules are 100% veg.", photos: [], rating: 5 },
    { comment: "Very effective for daily stress relief. Feeling much more active and less irritable throughout the day.", photos: [], rating: 5 },
    { comment: "Authentic product with proper FSSAI license details mentioned on bottle. Value for money compared to other expensive brands.", photos: [], rating: 5 },
    { comment: "My endurance during evening running has improved. No fatigue or lethargy. Highly recommend for working professionals.", photos: [], rating: 4 },
    { comment: "Genuine adaptogen supplement. Worked really well for my sleep cycle and overall energy levels.", photos: [], rating: 5 }
  ];

  const collagenReviews = [
    { comment: "Started taking this collagen a month ago. My skin feels so much more elastic and my joint pain has surprisingly reduced as well. Highly recommended.", photos: [], rating: 5 },
    { comment: "Hair fall has definitely reduced after 3 weeks! Also noticed my nails aren't breaking or chipping as easily as before.", photos: [], rating: 5 },
    { comment: "Best marine collagen I have tried. Easily dissolves in normal water and doesn't have that horrible fishy smell or taste.", photos: [], rating: 5 },
    { comment: "Skin feels plumper and hydrated. Fine lines around my eyes look softer now. Good combination with Biotin and Hyaluronic Acid.", photos: [], rating: 4 },
    { comment: "Taking this everyday after breakfast for my hair and skin. Noticeable glow on my face and hair texture feels thicker now.", photos: [], rating: 5 },
    { comment: "Very clean formulation. Packaging was secure and delivery was within 3 days. Happy with the quality.", photos: [], rating: 5 },
    { comment: "My sister and I are both taking this. Our hair fall has stopped and facial skin looks so fresh and hydrated every morning.", photos: [], rating: 5 },
    { comment: "Nails used to be super brittle and thin. After 1 month of this collagen powder, they grow fast and strong.", photos: [], rating: 4 },
    { comment: "Genuine marine peptides. Noticeable difference in skin elasticity and moisture. Good value for money.", photos: [], rating: 5 },
    { comment: "No bloating or stomach upset at all. Mixes clean in water and gives amazing results for hair volume and nail strength.", photos: [], rating: 5 },
    { comment: "I stopped using biotin gummies after switching to this complete collagen formula. Much better absorption and results.", photos: [], rating: 5 },
    { comment: "Awesome product! Skin looks youthful and smooth. Will definitely continue using this monthly.", photos: [], rating: 5 }
  ];

  const seaBuckthornReviews = [
    { comment: "Absolutely love this Sea Buckthorn juice. It has a great tangy flavor and I've noticed a significant boost in my immunity and digestion since I started taking it.", photos: [], rating: 5 },
    { comment: "Very natural tart and tangy taste. You can tell it is genuine Himalayan berry pulp without artificial sugar or colors.", photos: [], rating: 5 },
    { comment: "Omega 7 is really good for skin dryness. My skin feels naturally moisturized from inside and even dry eyes feel better.", photos: [], rating: 5 },
    { comment: "Great immunity booster! My family has been drinking this daily and we haven't caught any common colds or seasonal coughs.", photos: [], rating: 5 },
    { comment: "Digestion has improved remarkably. No more heaviness or acid reflux after eating lunch or dinner.", photos: [], rating: 5 },
    { comment: "Glass bottle packaging was very secure with bubble wrap, and they included a measuring cup which is super handy.", photos: [], rating: 4 },
    { comment: "Feel very energetic throughout the day without drinking coffee. Excellent antioxidant drink for overall liver and gut health.", photos: [], rating: 5 },
    { comment: "Acidity problem is 90% gone within 10 days of starting this juice. Truly amazing superfood!", photos: [], rating: 5 },
    { comment: "My complexion looks clearer and stomach feels light. Clean, pure Himalayan Sea Buckthorn extract.", photos: [], rating: 5 },
    { comment: "Tastes refreshing when mixed with water and a small spoonful of honey. A permanent part of my morning routine now.", photos: [], rating: 4 },
    { comment: "High quality juice. Not watered down at all, rich consistency. Very satisfied with Pure Nutrix standards.", photos: [], rating: 5 },
    { comment: "Genuine herbal wellness drink. Solved my chronic indigestion and gave a nice natural glow to my face.", photos: [], rating: 5 }
  ];

  const generalReviews = [
    { comment: "Great product, highly recommend it to everyone looking for quality supplements.", photos: [], rating: 5 },
    { comment: "Results are visible within a few weeks. Very satisfied with the purchase.", photos: [], rating: 5 },
    { comment: "Pure Nutrix never disappoints. Premium quality as always.", photos: [], rating: 5 },
    { comment: "Value for money. The packaging was also very secure and premium.", photos: [], rating: 4 },
    { comment: "I have tried many brands but this one actually works perfectly for me.", photos: [], rating: 5 },
    { comment: "100% genuine formulation with fast courier dispatch.", photos: [], rating: 5 },
    { comment: "Daily staple in my wellness routine. Highly effective and lab tested.", photos: [], rating: 5 }
  ];

  const selectedReviews = isGlutathione ? glutaReviews : (isAshwagandha ? ashwaReviews : (isCollagen ? collagenReviews : (isSeaBuckthorn ? seaBuckthornReviews : generalReviews)));
  const nameOffset = (product?.name?.length || 0) % 5;

  const staticList = selectedReviews.map((rev, index) => {
    const nameIndex = (index + nameOffset) % names.length;
    return {
      id: `STATIC-${index}`,
      name: names[nameIndex],
      rating: rev.rating,
      date: `${(index * 2) + 2} Days Ago`,
      comment: rev.comment,
      verified: true,
      photos: rev.photos
    };
  });

  // Map dynamic reviews to storefront format and put them at the top!
  const formattedDynamic = matchingApproved.map(rev => ({
    id: rev.id,
    name: rev.customerName,
    rating: rev.rating,
    date: rev.date,
    comment: rev.comment,
    verified: rev.verifiedBuyer,
    photos: rev.photos || []
  }));

  const combinedList = [...formattedDynamic, ...staticList];

  return { totalCount, rating: baseRating, reviewsList: combinedList };
};
