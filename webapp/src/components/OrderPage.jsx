import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, CreditCard, Wallet, Truck, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './OrderPage.css';

const OrderPage = ({ product, cartItems, onBack }) => {
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

    // Normalization: if cartItems is provided, use it. Otherwise, use the single product with quantity state.
    const [singleProductQty, setSingleProductQty] = useState(1);
    
    const orderItems = cartItems || (product ? [{ product, quantity: singleProductQty }] : []);
    
    const totalQuantity = orderItems.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = orderItems.reduce((acc, item) => {
      const price = typeof item.product.price === 'number' ? item.product.price : Number(item.product.price.toString().replace(/[^0-9.-]+/g, ""));
      return acc + (price * item.quantity);
    }, 0);
    
    const shippingFee = totalPrice < 499 ? 28 : 0;
    const codFee = paymentMethod === 'cod' ? 19 : 0;
    const finalTotal = totalPrice + shippingFee + codFee;
    
    // BOGO: Every item gets a free copy.

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
      
      const itemNames = orderItems.map(item => {
        const qty = cartItems ? item.quantity : singleProductQty;
        return `${qty}x ${item.product.name} (+ ${qty}x Free BOGO)`;
      }).join(', ');
      const finalProductName = itemNames;
      
      // Use the first image from the first product as thumbnail
      const firstProductImage = orderItems.length > 0 ? (orderItems[0].product.image_urls || orderItems[0].product.images || [])[0] || '' : '';
      
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
            price: finalTotal,
            qty: totalQuantity,
            image: firstProductImage,
            status: 'Processing'
          }
        ]);

      if (error) throw error;

      // Try sending WhatsApp order confirmation asynchronously
      try {
        await supabase.functions.invoke('send-whatsapp', {
          body: {
            phone_number: '91' + formData.mobile.replace(/[^0-9]/g, ''), // Assuming India country code +91
            message: `Hi ${formData.name},\n\nYour order for ${finalProductName} has been confirmed! Total: ₹${finalTotal}.\n\nThank you for choosing Pure-Nutrix.`,
            type: 'text'
          }
        });
      } catch (waError) {
        console.error('Failed to send WhatsApp message (Edge Function might not be deployed yet):', waError);
      }

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

  if (!product && (!cartItems || cartItems.length === 0)) return null;

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
                        {isProcessing ? 'Processing Securely...' : `Pay ₹${finalTotal}`}
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
                  
                  {orderItems.map((item, idx) => {
                    const basePrice = typeof item.product.price === 'number' ? item.product.price : Number(item.product.price.toString().replace(/[^0-9.-]+/g, ""));
                    const qty = cartItems ? item.quantity : singleProductQty;
                    return (
                      <React.Fragment key={item.product.id || idx}>
                        <div className="summary-product">
                          <div className="summary-image-wrapper">
                            <img src={(item.product.image_urls || item.product.images || [])[0]} alt={item.product.name} />
                          </div>
                          <div className="summary-details">
                            <h4>{item.product.name}</h4>
                            {cartItems ? (
                               <p>Qty: {item.quantity}</p>
                            ) : (
                              <div className="qty-selector" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
                                <button type="button" onClick={() => setSingleProductQty(Math.max(1, singleProductQty - 1))} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #ccc', background: 'transparent' }}>-</button>
                                <span>{singleProductQty}</span>
                                <button type="button" onClick={() => setSingleProductQty(singleProductQty + 1)} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #ccc', background: 'transparent' }}>+</button>
                              </div>
                            )}
                            <p className="summary-price">₹{basePrice}</p>
                          </div>
                        </div>

                        {/* BOGO Free Item */}
                        <div className="summary-product free-item" style={{ marginTop: '5px', padding: '10px', background: 'rgba(5, 150, 105, 0.05)', borderRadius: '8px', border: '1px dashed #059669' }}>
                          <div className="summary-image-wrapper">
                            <img src={(item.product.image_urls || item.product.images || [])[0]} alt={item.product.name} style={{ filter: 'grayscale(20%)', opacity: 0.9 }} />
                          </div>
                          <div className="summary-details">
                            <h4 style={{ color: '#059669' }}>{item.product.name} (Free BOGO)</h4>
                            <p>Qty: {qty}</p>
                            <p className="summary-price" style={{ textDecoration: 'line-through', color: '#888' }}>₹{basePrice}</p>
                            <p className="summary-price" style={{ color: '#059669', fontWeight: 'bold' }}>₹0</p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  <div className="summary-calculations">
                    <div className="calc-row">
                      <span>Subtotal</span>
                      <span>₹{totalPrice}</span>
                    </div>
                    <div className="calc-row">
                      <span>Shipping</span>
                      {shippingFee > 0 ? (
                        <span>₹{shippingFee}</span>
                      ) : (
                        <span className="text-emerald" style={{color: 'var(--color-accent-emerald)', fontWeight: 600}}>Free</span>
                      )}
                    </div>
                    {paymentMethod === 'cod' && (
                      <div className="calc-row">
                        <span>COD Handling Fee</span>
                        <span>₹{codFee}</span>
                      </div>
                    )}
                    <div className="calc-row">
                      <span>Taxes</span>
                      <span>Included</span>
                    </div>
                    <div className="calc-divider" />
                    <div className="calc-row total-row">
                      <span>Total</span>
                      <span>₹{finalTotal}</span>
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
                Your order is being processed. 
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
