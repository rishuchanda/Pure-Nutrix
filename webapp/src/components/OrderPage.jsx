import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, CreditCard, Wallet, Truck, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './OrderPage.css';

const OrderPage = ({ product, cartItems, onBack }) => {
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

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
      
      const saveOrderToDB = async (user, addressString, finalProductName, firstProductImage) => {
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

        setTimeout(() => {
          setIsProcessing(false);
          setIsSuccess(true);
        }, 500);
      };

      if (paymentMethod === 'razorpay') {
        const res = await loadRazorpayScript();
        if (!res) {
          throw new Error('Razorpay SDK failed to load. Are you online?');
        }

        // 1. Create order using standard fetch with automatic retry loop for 100% resilience against Razorpay test environment dropouts
        let orderResponse;
        let orderData;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            orderResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-create-order`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({ amount: Math.round(finalTotal * 100), receipt: `rcpt_${Date.now()}_${attempt}` })
            });
            orderData = await orderResponse.json();
            if (orderResponse.ok && orderData && orderData.id) {
              break;
            }
          } catch (e) {
            console.warn(`Order creation attempt ${attempt} failed:`, e);
          }
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 800));
          }
        }

        if (!orderResponse.ok || !orderData || !orderData.id) {
          const errMsg = (orderData && orderData.error) 
            ? (typeof orderData.error === 'object' ? JSON.stringify(orderData.error) : orderData.error) 
            : `Server returned ${orderResponse.status}: ${orderText.substring(0, 50)}`;
          throw new Error(errMsg);
        }

        // 2. Open modal
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TIX7LEtvaUL7xC',
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Pure Nutrix",
          description: "Premium Product Purchase",
          order_id: orderData.id,
          handler: async function (response){
            // 3. Verify Payment using standard fetch
            const verifyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyResponse.json().catch(() => ({}));

            if (!verifyResponse.ok || !verifyData || !verifyData.success) {
               alert(`Payment verification failed. Please contact support.`);
               setIsProcessing(false);
               return;
            }
            
            // Payment verified! Proceed to save order.
            await saveOrderToDB(user, addressString, finalProductName, firstProductImage);
          },
          prefill: {
            name: formData.name,
            contact: formData.mobile
          },
          theme: {
            color: "#D4AF37"
          },
          modal: {
            ondismiss: function() {
              setIsProcessing(false);
            }
          }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function (response){
          alert("Payment failed: " + response.error.description);
          setIsProcessing(false);
        });
        paymentObject.open();

      } else {
        await saveOrderToDB(user, addressString, finalProductName, firstProductImage);
      }
      
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order: ' + (error.message || JSON.stringify(error)));
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
                <form onSubmit={handlePayment}>
                  <div className="form-step">
                    <h2 className="step-title">Shipping Details</h2>
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
                      {authError && <div className="error-message" style={{ color: 'red', margin: '15px 0' }}>{authError}</div>}

                      <button type="submit" className="btn-primary continue-btn pay-btn" disabled={isProcessing} style={{ marginTop: '20px' }}>
                        {isProcessing ? 'Processing Securely...' : `Pay Online ₹${finalTotal}`}
                      </button>

                      <div className="secure-badge" style={{ marginTop: '15px', justifyContent: 'center' }}>
                        <ShieldCheck size={16} />
                        <span>256-bit SSL Secure Checkout</span>
                      </div>
                    </div>

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
