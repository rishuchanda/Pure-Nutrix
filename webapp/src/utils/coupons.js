// Discount coupons accepted at checkout.
// To add another one: copy a line, change the code and the percent.
// Codes are matched without caring about upper/lower case or spaces.
export const COUPONS = {
  PUREJOY10: { percent: 10, label: '10% off on all products' },
};

/** Returns { code, percent, label } for a valid code, or null. */
export function findCoupon(input) {
  const code = String(input || '').replace(/\s+/g, '').toUpperCase();
  return COUPONS[code] ? { code, ...COUPONS[code] } : null;
}

/** Discount in whole rupees on the product subtotal (shipping and fees are not discounted). */
export function couponDiscount(coupon, subtotal) {
  if (!coupon || !(subtotal > 0)) return 0;
  return Math.round((subtotal * coupon.percent) / 100);
}
