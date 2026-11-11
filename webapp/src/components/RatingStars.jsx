import React from 'react';
import { Star } from 'lucide-react';

// Stars for a real average rating (rounded to the nearest whole star).
const RatingStars = ({ rating, size = 14, color = '#fbbf24' }) => {
  const filled = Math.round(Number(rating) || 0);
  return (
    <span style={{ display: 'inline-flex', gap: 1 }} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} fill={i < filled ? color : 'none'} stroke={i < filled ? 'none' : '#c8c8c8'} />
      ))}
    </span>
  );
};

export default RatingStars;
