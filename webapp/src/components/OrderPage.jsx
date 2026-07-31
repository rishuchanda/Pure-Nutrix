import React, { useState, useEffect } from 'react';
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
    email: '',
    mobile: '',
    pincode: '',
    flat: '',
    area: '',
    landmark: '',
    city: '',
    state: ''
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('new');

  useEffect(() => {
    const fetchUserAndAddresses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        setFormData(prev => ({ ...prev, email: user.email }));
        const { data } = await supabase.from('user_addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data && data.length > 0) {
          setSavedAddresses(data);
          handleSelectSavedAddress(data[0]);
        }
      }
    };
    fetchUserAndAddresses();
  }, []);

  const handleSelectSavedAddress = (addr) => {
    if (addr === 'new') {
      setSelectedAddressId('new');
      setFormData({ name: '', email: currentUser?.email || '', mobile: '', flat: '', area: '', landmark: '', city: '', state: '', pincode: '' });
    } else {
      setSelectedAddressId(addr.id);
      setFormData({
        name: addr.name,
        email: addr.email || currentUser?.email || '',
        mobile: addr.mobile,
        flat: addr.flat,
        area: addr.area,
        landmark: addr.landmark || '',
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode
      });
    }
  };

  const [isCheckoutOtpSent, setIsCheckoutOtpSent] = useState(false);
  const [checkoutOtp, setCheckoutOtp] = useState('');
  const [showOtpChoice, setShowOtpChoice] = useState(false);
  const [otpMethod, setOtpMethod] = useState('email');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [authError, setAuthError] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const sendOtp = async (method) => {
    setOtpMethod(method);
    setIsProcessing(true);
    setAuthError(null);
    try {
      if (method === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: formData.email,
          options: { data: { full_name: formData.name } }
        });
        if (error) { alert('DB Error: ' + JSON.stringify(error)); throw error; }
      } else {
        const res = await supabase.functions.invoke('send-whatsapp-otp', {
          body: { phone_number: formData.mobile }
        });
        if (res.error || !res.data?.success) {
          throw new Error(res.data?.error || res.error?.message || 'Failed to send WhatsApp OTP.');
        }
      }
      setIsCheckoutOtpSent(true);
      setShowOtpChoice(false);
      setResendTimer(30);
    } catch (err) {
      setAuthError(err.message || 'Failed to send OTP.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendOtp = async () => {
    sendOtp(otpMethod);
  };

    // Normalization: if cartItems is provided, use it. Otherwise, use the single product with quantity state.
    const [singleProductQty, setSingleProductQty] = useState(1);
    
    const orderItems = cartItems || (product ? [{ product, quantity: singleProductQty }] : []);
    
    const totalQuantity = orderItems.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = orderItems.reduce((acc, item) => {
      const price = typeof item.product.price === 'number' ? item.product.price : Number(item.product.price.toString().replace(/[^0-9.-]+/g, ""));
      return acc + (price * item.quantity);
    }, 0);
    
    const isTestOrder = orderItems.some(item => String(item.product.category).toUpperCase() === 'TEST' || Number(item.product.price) === 10);
    const shippingFee = (totalPrice < 499 && !isTestOrder) ? 28 : 0;
    const codFee = paymentMethod === 'cod' ? 19 : 0;
    const finalTotal = totalPrice + shippingFee + codFee;
    
    // BOGO: Every item gets a free copy.

    const handlePayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setAuthError(null);
    
    try {
      // Get current user
      let { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        if (!isCheckoutOtpSent) {
          if (!showOtpChoice) {
            setShowOtpChoice(true);
            setIsProcessing(false);
            return;
          }
          setIsProcessing(false);
          return;
        } else {
          if (otpMethod === 'email') {
            const { data, error } = await supabase.auth.verifyOtp({
              email: formData.email,
              token: checkoutOtp,
              type: 'email'
            });
            if (error) {
              setAuthError('Invalid OTP. Please check the code sent to your email.');
              setIsProcessing(false);
              return;
            }
            user = data.user;
          } else {
            const res = await supabase.functions.invoke('verify-whatsapp-otp', {
              body: { phone_number: formData.mobile, otp: checkoutOtp, full_name: formData.name }
            });
            if (res.error || !res.data?.success) {
              setAuthError(res.data?.error || res.error?.message || 'Invalid WhatsApp OTP.');
              setIsProcessing(false);
              return;
            }
            const creds = res.data.credentials;
            const { data, error } = await supabase.auth.signInWithPassword({
              email: creds.email,
              password: creds.password
            });
            if (error) {
              setAuthError('Login failed after verification.');
              setIsProcessing(false);
              return;
            }
            user = data.user;
          }
        }
      }

      // Save new address if applicable
      if (user && selectedAddressId === 'new') {
        const { error: addressError } = await supabase.from('user_addresses').insert([{
          user_id: user.id,
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          flat: formData.flat,
          area: formData.area,
          landmark: formData.landmark,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        }]);
        if (addressError) console.error('Failed to save new address:', addressError.message);
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
              customer_email: user.email,
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

        
        // Try sending WhatsApp and Email order confirmations asynchronously
        try {
          const parsedMobile = '91' + formData.mobile.replace(/[^0-9]/g, '');

          // Ensure contact exists for CRM
          const { data: existing } = await supabase.from('whatsapp_contacts').select('id').eq('phone_number', parsedMobile).maybeSingle();
          let contactError = null;
          if (!existing) {
             const res = await supabase.from('whatsapp_contacts').insert({
               phone_number: parsedMobile,
               name: formData.name,
               last_message_at: new Date().toISOString()
             });
             contactError = res.error;
          } else {
             const res = await supabase.from('whatsapp_contacts').update({
               name: formData.name,
               last_message_at: new Date().toISOString()
             }).eq('phone_number', parsedMobile);
             contactError = res.error;
          }
          
          if (contactError) {
             alert('CRM Contact Error: ' + JSON.stringify(contactError));
          }

          // WhatsApp Confirmation
          const { data: waData } = await supabase.functions.invoke('send-whatsapp', {
            body: {
              phone_number: parsedMobile,
              type: 'template',
              template_name: 'order_confirmation',
              template_language: 'en_US',
              template_components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: formData.name },
                    { type: "text", text: finalProductName },
                    { type: "text", text: finalTotal.toString() }
                  ]
                }
              ]
            }
          });

          if (waData?.success) {
            const metaMsgId = waData?.data?.messages?.[0]?.id || null;
            const { error: msgError } = await supabase.from('whatsapp_messages').insert({
              contact_phone: parsedMobile,
              direction: 'outbound',
              message_body: `[Template Sent: order_confirmation] Hi ${formData.name}, your order for ${finalProductName} (₹${finalTotal}) is confirmed.`,
              status: 'sent',
              meta_message_id: metaMsgId
            });
            
            if (msgError) {
               alert('CRM Message Error: ' + JSON.stringify(msgError));
            }
          }
// Email Confirmation
          if (user.email) {
            await supabase.functions.invoke('send-email', {
              body: {
                to: user.email,
                subject: `Order Confirmed: ${finalProductName}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #D4AF37;">Pure Nutrix Order Confirmation</h2>
                    <p>Hi ${formData.name},</p>
                    <p>Thank you for your order! We have successfully received it and are preparing it for shipment.</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <strong>Order Details:</strong><br/>
                      Items: ${finalProductName}<br/>
                      Total Amount: ₹${finalTotal}<br/>
                      Shipping Address: ${addressString}
                    </div>
                    <p>We'll notify you once your order is dispatched.</p>
                    <p>Stay Healthy,<br/>The Pure Nutrix Team</p>
                  </div>
                `
              }
            });
          }
        } catch (commError) {
          console.error('Failed to send confirmation messages:', commError);
        }

        // Meta Pixel Purchase Event
        if (window.fbq) {
          window.fbq('track', 'Purchase', {
            content_name: finalProductName,
            content_type: 'product',
            value: finalTotal,
            currency: 'INR'
          });
        }

        setTimeout(() => {
          setIsProcessing(false);
          setIsSuccess(true);
        }, 500);
      };

      if (paymentMethod === 'razorpay' && !isTestOrder) {
        const res = await loadRazorpayScript();
        if (!res) {
          throw new Error('Razorpay SDK failed to load. Are you online?');
        }

        // 1. Create order — retry up to 5 times (each call internally retries 25x on the server side)
        let orderResponse;
        let orderData;
        for (let attempt = 1; attempt <= 5; attempt++) {
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
          if (attempt < 5) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        if (!orderData || !orderData.id) {
          const errMsg = (orderData && orderData.error)
            ? (typeof orderData.error === 'object' ? orderData.error.description || JSON.stringify(orderData.error) : orderData.error)
            : 'Could not create order. Please try again.';
          throw new Error(errMsg);
        }

        // 2. Open modal
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_TIXt8mFw0gXlPJ',
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
                    {savedAddresses.length > 0 && (
                      <div className="saved-addresses-section" style={{ marginBottom: 24 }}>
                        <h2 className="step-title" style={{ fontSize: '1.2rem', marginBottom: 12 }}>Select Delivery Address</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {savedAddresses.map(addr => (
                            <label key={addr.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', border: selectedAddressId === addr.id ? '2px solid #ff0055' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: selectedAddressId === addr.id ? '#fff9fa' : '#fff' }}>
                              <input type="radio" name="selected_address" checked={selectedAddressId === addr.id} onChange={() => handleSelectSavedAddress(addr)} style={{ marginTop: '4px', accentColor: '#ff0055' }} />
                              <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{addr.name}</h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#555', lineHeight: '1.4' }}>
                                  {addr.flat}, {addr.area}<br/>
                                  {addr.landmark && <>{addr.landmark}<br/></>}
                                  {addr.city}, {addr.state} - {addr.pincode}<br/>
                                  📞 {addr.mobile}
                                </p>
                              </div>
                            </label>
                          ))}
                          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: selectedAddressId === 'new' ? '2px solid #ff0055' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: selectedAddressId === 'new' ? '#fff9fa' : '#fff' }}>
                            <input type="radio" name="selected_address" checked={selectedAddressId === 'new'} onChange={() => handleSelectSavedAddress('new')} style={{ accentColor: '#ff0055' }} />
                            <span style={{ fontWeight: 500 }}>Add a new address</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div style={{ display: selectedAddressId === 'new' ? 'block' : 'none' }}>
                      <h2 className="step-title">Shipping Details</h2>
                        <div className="input-group">
                          <label>Full Name</label>
                          <input type="text" name="name" value={formData.name} onChange={handleInputChange} required={selectedAddressId === 'new'} placeholder="Raman Sharma" />
                        </div>
                        <div className="input-group">
                          <label>Email Address</label>
                          <input type="email" name="email" value={formData.email} onChange={handleInputChange} required={selectedAddressId === 'new'} placeholder="raman@example.com" disabled={isCheckoutOtpSent} />
                        </div>
                        <div className="input-group">
                          <label>Mobile Number</label>
                          <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} required={selectedAddressId === 'new'} placeholder="10-digit mobile number" maxLength="10" disabled={isCheckoutOtpSent} />
                        </div>
                        <div className="input-row">
                          <div className="input-group">
                            <label>PIN Code</label>
                            <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} required={selectedAddressId === 'new'} placeholder="6 digits [0-9] PIN code" maxLength="6" />
                          </div>
                          <div className="input-group">
                            <label>State</label>
                            <input type="text" name="state" value={formData.state} onChange={handleInputChange} required={selectedAddressId === 'new'} placeholder="Maharashtra" />
                          </div>
                        </div>
                        <div className="input-group">
                          <label>Flat, House no., Building, Company, Apartment</label>
                          <input type="text" name="flat" value={formData.flat} onChange={handleInputChange} required={selectedAddressId === 'new'} placeholder="Flat No. 402, Sai Apartment" />
                        </div>
                        <div className="input-group">
                          <label>Area, Street, Sector, Village</label>
                          <input type="text" name="area" value={formData.area} onChange={handleInputChange} required={selectedAddressId === 'new'} placeholder="Main Road, Andheri West" />
                        </div>
                        <div className="input-row">
                          <div className="input-group">
                            <label>Landmark</label>
                            <input type="text" name="landmark" value={formData.landmark} onChange={handleInputChange} placeholder="E.g. near Apollo Hospital" />
                          </div>
                          <div className="input-group">
                            <label>Town/City</label>
                            <input type="text" name="city" value={formData.city} onChange={handleInputChange} required={selectedAddressId === 'new'} placeholder="Mumbai" />
                          </div>
                        </div>
                    </div>
                      {authError && <div className="error-message" style={{ color: 'red', margin: '15px 0' }}>{authError}</div>}

                      {isCheckoutOtpSent && (
                        <div className="input-group" style={{ marginTop: '15px', background: '#fff', padding: '15px', borderRadius: '8px', border: '2px solid #D4AF37', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                          <label style={{ color: '#1a1a1a', fontWeight: 'bold' }}>Enter 6-Digit OTP sent to {otpMethod === 'email' ? formData.email : 'WhatsApp'}</label>
                          <input type="text" value={checkoutOtp} onChange={(e) => setCheckoutOtp(e.target.value.replace(/\D/g, '').slice(0,6))} required maxLength="6" style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', background: '#f9f9f9', border: '1px solid #ccc' }} placeholder="------" />
                        </div>
                      )}

                      {!showOtpChoice && !isCheckoutOtpSent && (
                        <button type="submit" className="btn-primary continue-btn pay-btn" disabled={isProcessing} style={{ marginTop: '20px' }}>
                          {isProcessing ? 'Processing...' : `Pay Online ₹${finalTotal}`}
                        </button>
                      )}

                      {showOtpChoice && !isCheckoutOtpSent && (
                        <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <p style={{ textAlign: 'center', marginBottom: '15px', fontWeight: 'bold', color: '#1e293b' }}>Where would you like to receive the verification OTP?</p>
                          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                            <button type="button" onClick={() => sendOtp('whatsapp')} className="btn-primary" style={{ background: '#25D366', color: '#fff', border: 'none', padding: '12px' }} disabled={isProcessing}>
                              {isProcessing ? 'Sending...' : 'Send OTP to WhatsApp (Fast)'}
                            </button>
                            <button type="button" onClick={() => sendOtp('email')} className="btn-outline" style={{ padding: '12px' }} disabled={isProcessing}>
                              {isProcessing ? 'Sending...' : 'Send OTP to Email'}
                            </button>
                          </div>
                        </div>
                      )}

                      {isCheckoutOtpSent && (
                        <button type="submit" className="btn-primary continue-btn pay-btn" disabled={isProcessing || checkoutOtp.length < 6} style={{ marginTop: '20px' }}>
                          {isProcessing ? 'Processing Securely...' : 'Verify OTP & Place Order'}
                        </button>
                      )}

                      {isCheckoutOtpSent && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <button type="button" className="btn-outline" onClick={() => setIsCheckoutOtpSent(false)} style={{ flex: 1 }} disabled={isProcessing}>
                            Change Details
                          </button>
                          <button type="button" className="btn-outline" onClick={handleResendOtp} style={{ flex: 1, opacity: resendTimer > 0 ? 0.6 : 1 }} disabled={isProcessing || resendTimer > 0}>
                            {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP'}
                          </button>
                        </div>
                      )}

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
