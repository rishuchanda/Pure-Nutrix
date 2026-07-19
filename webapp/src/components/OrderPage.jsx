import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, CreditCard, Wallet, Truck, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './OrderPage.css';

const OrderPage = ({ product, onBack }) => {
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    pincode: '',
    flat: '',
    area: '',
    landmark: '',
    city: '',
    state: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [authError, setAuthError] = useState(null);

    const [quantity, setQuantity] = useState(1);
    const basePrice = typeof product.price === 'number' ? product.price : Number(product.price.toString().replace(/[^0-9.-]+/g, ""));
    const totalPrice = basePrice * quantity;
    const hasFreeGift = quantity >= 2;

    const handlePayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setAuthError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAuthError('You must be logged in to place an order.');
        setIsProcessing(false);
        return;
      }

      // Prepare order data
      const addressString = `${formData.flat}, ${formData.area}`;
      const finalProductName = product.name + (hasFreeGift ? ' (+ 1x Free L-Glutathione)' : '');
      
      // Insert into Supabase
      const { error } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user.id,
            customer_name: formData.name,
            customer_mobile: formData.mobile,
            shipping_address: addressString,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            product_name: finalProductName,
            price: totalPrice,
            qty: quantity,
            image: (product.image_urls || product.images || [])[0] || '',
            status: 'Processing'
          }
        ]);

      if (error) throw error;

      // Artificial delay for premium checkout feel
      setTimeout(() => {
        setIsProcessing(false);
        setIsSuccess(true);
      }, 1500);
      
    } catch (error) {
      console.error('Error placing order:', error.message);
      alert('Failed to place order: ' + error.message);
      setIsProcessing(false);
    }
  };

  if (!product) return null;

  return (
    <div className="order-page-wrapper">
      <AnimatePresence>
        {!isSuccess ? (
          <motion.div 
            key="checkout"
            className="order-container container"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="order-header">
              <button className="back-btn" onClick={onBack}>
                <ArrowLeft size={20} />
                <span>Back to Home</span>
              </button>
              <h1 className="order-page-title">Secure <span className="text-gold">Checkout</span></h1>
            </div>

            <div className="checkout-layout">
              {/* Left Side: Form */}
              <div className="checkout-form-section glass-card">
                <div className="steps-indicator">
                  <div className={`step ${step >= 1 ? 'active' : ''}`}>
                    <div className="step-circle">1</div>
                    <span>Shipping</span>
                  </div>
                  <div className="step-line" />
                  <div className={`step ${step >= 2 ? 'active' : ''}`}>
                    <div className="step-circle">2</div>
                    <span>Payment</span>
                  </div>
                </div>

                <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handlePayment}>
                  
                  {step === 1 && (
                    <motion.div 
                      className="form-step"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <h2 className="step-title">Shipping Address</h2>
                      <div className="input-group">
                        <label>Full Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="Raman Sharma" />
                      </div>
                      <div className="input-group">
                        <label>Mobile Number</label>
                        <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} required placeholder="10-digit mobile number" maxLength="10" />
                      </div>
                      <div className="input-row">
                        <div className="input-group">
                          <label>PIN Code</label>
                          <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} required placeholder="6 digits [0-9] PIN code" maxLength="6" />
                        </div>
                        <div className="input-group">
                          <label>State</label>
                          <input type="text" name="state" value={formData.state} onChange={handleInputChange} required placeholder="Maharashtra" />
                        </div>
                      </div>
                      <div className="input-group">
                        <label>Flat, House no., Building, Company, Apartment</label>
                        <input type="text" name="flat" value={formData.flat} onChange={handleInputChange} required placeholder="Flat No. 402, Sai Apartment" />
                      </div>
                      <div className="input-group">
                        <label>Area, Street, Sector, Village</label>
                        <input type="text" name="area" value={formData.area} onChange={handleInputChange} required placeholder="Main Road, Andheri West" />
                      </div>
                      <div className="input-row">
                        <div className="input-group">
                          <label>Landmark</label>
                          <input type="text" name="landmark" value={formData.landmark} onChange={handleInputChange} placeholder="E.g. near Apollo Hospital" />
                        </div>
                        <div className="input-group">
                          <label>Town/City</label>
                          <input type="text" name="city" value={formData.city} onChange={handleInputChange} required placeholder="Mumbai" />
                        </div>
                      </div>
                      
                      <button type="submit" className="btn-primary continue-btn">
                        Continue to Payment
                      </button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div 
                      className="form-step"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="step-header-with-back">
                        <button type="button" className="mini-back-btn" onClick={() => setStep(1)}>
                          <ArrowLeft size={16} />
                        </button>
                        <h2 className="step-title">Payment Method</h2>
                      </div>
                      
                      {authError && <div className="error-message" style={{ color: 'red', marginBottom: '15px' }}>{authError}</div>}

                      <div className="payment-methods">
                        <label className={`payment-option ${paymentMethod === 'card' ? 'selected' : ''}`}>
                          <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                          <CreditCard size={24} className="pay-icon" />
                          <div className="pay-details">
                            <span className="pay-title">Credit / Debit Card</span>
                            <span className="pay-subtitle">Visa, MasterCard, Amex</span>
                          </div>
                        </label>
                        
                        <label className={`payment-option ${paymentMethod === 'upi' ? 'selected' : ''}`}>
                          <input type="radio" name="payment" value="upi" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} />
                          <Wallet size={24} className="pay-icon" />
                          <div className="pay-details">
                            <span className="pay-title">UPI</span>
                            <span className="pay-subtitle">Google Pay, PhonePe, Paytm</span>
                          </div>
                        </label>

                        <label className={`payment-option ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                          <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                          <Truck size={24} className="pay-icon" />
                          <div className="pay-details">
                            <span className="pay-title">Cash on Delivery</span>
                            <span className="pay-subtitle">Pay when you receive it</span>
                          </div>
                        </label>
                      </div>

                      <button type="submit" className="btn-primary continue-btn pay-btn" disabled={isProcessing}>
                        {isProcessing ? 'Processing Securely...' : `Pay ₹${totalPrice}`}
                      </button>
                      
                      <div className="secure-badge">
                        <ShieldCheck size={16} />
                        <span>256-bit SSL Secure Checkout</span>
                      </div>
                    </motion.div>
                  )}

                </form>
              </div>

              {/* Right Side: Order Summary */}
              <div className="order-summary-section">
                <div className="glass-card summary-card">
                  <h3 className="summary-title">Order Summary</h3>
                  
                  <div className="summary-product">
                    <div className="summary-image-wrapper">
                      <img src={(product.image_urls || product.images || [])[0]} alt={product.name} />
                    </div>
                    <div className="summary-details">
                      <h4>{product.name}</h4>
                      <div className="qty-selector" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
                        <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #ccc', background: 'transparent' }}>-</button>
                        <span>{quantity}</span>
                        <button type="button" onClick={() => setQuantity(quantity + 1)} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #ccc', background: 'transparent' }}>+</button>
                      </div>
                      <p className="summary-price">₹{basePrice}</p>
                    </div>
                  </div>

                  {hasFreeGift && (
                    <div className="summary-product free-item" style={{ marginTop: '15px', padding: '10px', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '8px', border: '1px dashed var(--color-accent-gold)' }}>
                      <div className="summary-image-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                        <span style={{ fontSize: '24px' }}>✨</span>
                      </div>
                      <div className="summary-details">
                        <h4 style={{ color: 'var(--color-accent-gold)' }}>L-Glutathione (Free Gift)</h4>
                        <p>1</p>
                        <p className="summary-price" style={{ textDecoration: 'line-through', color: '#888' }}>₹1999</p>
                        <p className="summary-price" style={{ color: 'var(--color-accent-emerald)' }}>FREE</p>
                      </div>
                    </div>
                  )}

                  <div className="summary-calculations">
                    <div className="calc-row">
                      <span>Subtotal</span>
                      <span>₹{totalPrice}</span>
                    </div>
                    <div className="calc-row">
                      <span>Shipping</span>
                      <span className="text-emerald" style={{color: 'var(--color-accent-emerald)', fontWeight: 600}}>Free</span>
                    </div>
                    <div className="calc-row">
                      <span>Taxes</span>
                      <span>Included</span>
                    </div>
                    <div className="calc-divider" />
                    <div className="calc-row total-row">
                      <span>Total</span>
                      <span>₹{totalPrice}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="success"
            className="success-container container"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
          >
            <div className="glass-card success-card">
              <motion.div 
                className="success-icon-wrapper"
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              >
                <CheckCircle2 size={80} style={{color: 'var(--color-accent-emerald)'}} />
              </motion.div>
              
              <h1 className="success-title">Order Confirmed!</h1>
              <p className="success-desc">
                Thank you, <span className="text-gold" style={{fontWeight: 600}}>{formData.name || 'Valued Customer'}</span>. <br/>
                Your order for <strong>{product.name}</strong> is being processed. 
                We'll send the tracking updates to your mobile number <strong>{formData.mobile}</strong> shortly.
              </p>
              
              <div className="success-order-details">
                <div className="detail-item">
                  <span className="detail-label">Order Number</span>
                  <span className="detail-value">#PNX-{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Expected Delivery</span>
                  <span className="detail-value">3-5 Business Days</span>
                </div>
              </div>

              <button className="btn-primary return-home-btn" onClick={onBack}>
                Return to Home
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderPage;
