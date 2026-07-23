export const getProductReviews = (product) => {
  // Use product id or name to create a stable pseudo-random count
  const isGlutathione = product?.name?.toLowerCase().includes('glutathione');
  
  // Deterministic count based on product name/id
  const nameLength = product?.name?.length || 10;
  const totalCount = isGlutathione ? 186 : (120 + (nameLength * 7));
  
  // Stable random rating between 4.5 and 4.9
  const possibleRatings = [4.5, 4.6, 4.7, 4.8, 4.9];
  const rating = isGlutathione ? 4.8 : possibleRatings[(nameLength * 17) % possibleRatings.length];

  const names = [
    "Priya Sharma", "Rahul Verma", "Neha Gupta", "Amit Kumar", "Sneha Desai", 
    "Ravi Singh", "Anjali Patel", "Vikram Reddy", "Kavita Rao", "Siddharth Jain"
  ];
  
  const glutaComments = [
    "This L-Glutathione is amazing. I can see a visible glow on my skin after just 2 weeks of use.",
    "Very effective product! My skin tone looks much more even now and dark spots have faded.",
    "Authentic product and fast delivery. Happy with the results so far.",
    "Been using this for a month, pigmentation has reduced significantly.",
    "Good quality supplement. No side effects and my skin feels very fresh."
  ];

  const generalComments = [
    "Great product, highly recommend it to everyone looking for quality supplements.",
    "Results are visible within a few weeks. Very satisfied with the purchase.",
    "Pure Nutrix never disappoints. Premium quality as always.",
    "Value for money. The packaging was also very secure and premium.",
    "I have tried many brands but this one actually works perfectly for me."
  ];

  const comments = isGlutathione ? glutaComments : generalComments;

  // Use product name length to offset names so different products get different names
  const nameOffset = (product?.name?.length || 0) % 5;

  const reviewsList = Array.from({ length: 5 }).map((_, index) => {
    // 4.8 overall means mostly 5 stars, some 4 stars.
    const starCount = index === 1 ? 4 : 5; // Second review gets 4 stars, rest 5 stars
    const nameIndex = (index + nameOffset) % names.length;
    
    return {
      id: index,
      name: names[nameIndex],
      rating: starCount,
      date: `${(index * 3) + 2} Days Ago`,
      comment: comments[index % comments.length],
      verified: true
    };
  });

  return { totalCount, rating, reviewsList };
};
