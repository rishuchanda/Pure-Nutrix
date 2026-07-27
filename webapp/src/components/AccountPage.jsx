import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfessionalInvoice from './ProfessionalInvoice';
import { 
  ChevronLeft, Search, Package, CheckCircle, Layers, 
  Tag, Gift, Star, Heart, Headphones, User, MapPin, 
  ChevronRight, LogOut, Camera, Copy, Plus, XCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './AccountPage.css';

const AccountPage = ({ user, onBack, onSignOut }) => {
  const [view, setView] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [allProducts, setAllProducts] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [showInvoiceForOrder, setShowInvoiceForOrder] = useState(null);

  // Persistent Routine State
  const [routineChecked, setRoutineChecked] = useState({});

  // Load routing from URL on mount and listen to popstate
  useEffect(() => {
    const handlePopState = () => {
      const hashPath = window.location.hash.replace('#', '');
      const [mainView, subView] = hashPath.split('/');
      
      if (mainView === 'account') {
        setView(subView || 'dashboard');
        if (subView !== 'order-details') setActiveOrder(null);
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newView) => {
    setView(newView);
    if (newView === 'dashboard') {
      window.history.pushState({ view: 'account' }, '', '#account');
    } else {
      window.history.pushState({ view: 'account', subView: newView }, '', `#account/${newView}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderDetails = (order) => {
    setActiveOrder(order);
    navigateTo('order-details');
  };

  const handleDownloadInvoice = (orderItem, e) => {
    if (e) e.stopPropagation();
    setShowInvoiceForOrder(orderItem);
  };

  // Routine Persistence
  useEffect(() => {
    const storedRoutine = localStorage.getItem('purenutrix_routine');
    if (storedRoutine) {
      try {
        setRoutineChecked(JSON.parse(storedRoutine));
      } catch (e) {
        console.error("Could not parse routine");
      }
    }
  }, []);

  const toggleRoutine = (key) => {
    const updated = { ...routineChecked, [key]: !routineChecked[key] };
    setRoutineChecked(updated);
    localStorage.setItem('purenutrix_routine', JSON.stringify(updated));
  };

  // Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [ordersRes, productsRes] = await Promise.all([
          supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('products').select('*')
        ]);
        if (ordersRes.error) throw ordersRes.error;
        if (productsRes.error) throw productsRes.error;
        
        setOrders(ordersRes.data || []);
        setAllProducts(productsRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error.message);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchData();
  }, [user]);

  const userEmail = user?.email || 'premium.member@purenutrix.com';
  const userName = userEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ') || 'Valued Member';
  const displayUserName = userName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  const handleCopyReferral = () => {
    const code = `NUTRIX-${user?.id?.substring(0,6).toUpperCase() || 'VIP26'}`;
    navigator.clipboard.writeText(code);
    alert('Referral Code Copied: ' + code);
  };

  // Extract unique products bought by user for the Routine
  const getRoutineItems = () => {
    const uniqueProductNames = [...new Set(orders.map(o => o.product_name))].filter(Boolean);
    return uniqueProductNames;
  };

  const renderDashboardGrid = () => (
    <motion.div 
      className="mobile-dashboard premium-dashboard"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      key="dashboard"
    >
      <div className="dashboard-header mobile-only">
        <button className="back-btn-header" onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <span className="header-title">My Account</span>
        <div style={{ width: 24 }}></div> 
      </div>

      <div className="profile-section clean-profile mobile-only">
        <div className="wave-bg">
          <svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path fill="url(#grad1)" fillOpacity="1" d="M0,128L48,138.7C96,149,192,171,288,160C384,149,480,107,576,96C672,85,768,107,864,133.3C960,160,1056,192,1152,192C1248,192,1344,160,1392,144L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#e6004c', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#ff0055', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        <div className="avatar-wrapper">
          <div className="avatar-circle premium-shadow">
            <User size={40} color="#333" strokeWidth={1.5} />
          </div>
          <button className="camera-btn">
            <Camera size={14} color="#fff" />
          </button>
        </div>
        <h2 className="profile-name">{displayUserName}</h2>
      </div>

      <div className="dashboard-content premium-content">
        <div className="premium-grid">
          <div className="premium-grid-card" onClick={() => navigateTo('orders')}>
            <div className="grid-icon-wrap"><Package size={28} strokeWidth={1.5} color="#333" /></div>
            <span>My Orders</span>
          </div>
          <div className="premium-grid-card" onClick={() => navigateTo('routine')}>
            <div className="grid-icon-wrap"><CheckCircle size={28} strokeWidth={1.5} color="#333" /></div>
            <span>Daily Routine</span>
          </div>
          <div className="premium-grid-card" onClick={() => navigateTo('stacks')}>
            <div className="grid-icon-wrap"><Layers size={28} strokeWidth={1.5} color="#333" /></div>
            <span>Saved Stacks</span>
          </div>
          <div className="premium-grid-card" onClick={() => navigateTo('offers')}>
            <div className="grid-icon-wrap"><Tag size={28} strokeWidth={1.5} color="#333" /></div>
            <span>Offers for You</span>
          </div>
          <div className="premium-grid-card" onClick={() => navigateTo('refer')}>
            <div className="grid-icon-wrap"><Gift size={28} strokeWidth={1.5} color="#333" /></div>
            <span>Refer & Earn</span>
          </div>
          <div className="premium-grid-card" onClick={() => navigateTo('reviews')}>
            <div className="grid-icon-wrap"><Star size={28} strokeWidth={1.5} color="#333" /></div>
            <span>My Reviews</span>
          </div>
        </div>

        <div className="premium-menu-list mobile-only">
          <div className="menu-item" onClick={() => navigateTo('wishlist')}>
            <div className="menu-left">
              <div className="menu-icon"><Heart size={20} color="#555" /></div>
              <span className="menu-text">Wishlist</span>
            </div>
            <ChevronRight size={20} color="#ccc" />
          </div>
          <div className="menu-item" onClick={() => alert('Redirecting to Customer Care...')}>
            <div className="menu-left">
              <div className="menu-icon"><Headphones size={20} color="#555" /></div>
              <span className="menu-text">Customer Care</span>
            </div>
            <ChevronRight size={20} color="#ccc" />
          </div>
          <div className="menu-item" onClick={() => navigateTo('profile')}>
            <div className="menu-left">
              <div className="menu-icon"><User size={20} color="#555" /></div>
              <span className="menu-text">Edit Profile</span>
            </div>
            <ChevronRight size={20} color="#ccc" />
          </div>
          <div className="menu-item" onClick={() => navigateTo('address')}>
            <div className="menu-left">
              <div className="menu-icon"><MapPin size={20} color="#555" /></div>
              <span className="menu-text">Shipping Address</span>
            </div>
            <ChevronRight size={20} color="#ccc" />
          </div>
        </div>
      </div>

      <div className="logout-wrapper mobile-only">
        <button className="logout-btn" onClick={onSignOut}>
          <LogOut size={20} />
          <span>Logout securely</span>
        </button>
      </div>
    </motion.div>
  );

  const renderOrdersList = () => (
    <motion.div 
      className="mobile-orders"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      key="orders"
    >
      <div className="dashboard-header orders-header">
        <button className="back-btn-header" onClick={() => navigateTo('dashboard')}>
          <ChevronLeft size={24} />
        </button>
        <button className="search-btn-header">
          <Search size={24} />
        </button>
      </div>

      <div className="orders-page-content">
        <h1 className="page-main-title">All Orders</h1>
        
        <div className="orders-list-cards" style={{marginTop: 20}}>
          {loadingOrders ? (
            <p className="loading-text">Loading orders...</p>
          ) : orders.length === 0 ? (
            <div className="premium-empty-state">
              <Package size={40} color="#ccc" />
              <p>No orders found.</p>
            </div>
          ) : (
            orders.map(order => {
              const dateObj = new Date(order.created_at);
              const formattedDate = `${dateObj.getDate()}-${dateObj.getMonth()+1}-${dateObj.getFullYear()}`;
              const isDelivered = order.status.toLowerCase() === 'delivered';
              const isCancelled = order.status.toLowerCase() === 'cancelled';
              const isReturned = order.status.toLowerCase() === 'returned';
              
              let statusMsg = "Order Processing";
              if (isDelivered) statusMsg = "Order Delivered";
              else if (isCancelled) statusMsg = "Order Cancelled";
              else if (isReturned) statusMsg = "Order Returned";
              
              return (
                <div key={order.id} className="order-card-new premium-shadow">
                  <div className="order-card-top">
                    <span className="order-no">Order No: {order.id.split('-')[0].toUpperCase()}</span>
                    <span className="order-date">{formattedDate}</span>
                  </div>
                  <div className="order-card-middle">
                    <div className="tracking-row" style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                      {order.image ? (
                        <img src={order.image} alt="product" style={{width: 56, height: 56, borderRadius: 12, objectFit: 'cover'}} />
                      ) : (
                        <div style={{width: 56, height: 56, borderRadius: 12, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Package size={24} color="#ccc" /></div>
                      )}
                      <div>
                        <span className="label">Item:</span>
                        <span className="value" style={{display: 'block', marginTop: 4, lineHeight: 1.3}}>{order.product_name}</span>
                      </div>
                    </div>
                    <div className="qty-amount-row" style={{marginTop: 12}}>
                      <span className="label">Quantity: <span className="value">{order.qty || 1}</span></span>
                      <span className="label">Total: <span className="value bold">₹{order.price || order.total_amount || '0'}</span></span>
                    </div>
                  </div>
                  <div className="order-card-bottom" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="details-btn" onClick={() => handleOrderDetails(order)}>Details</button>
                    <button 
                      className="details-btn" 
                      style={{ background: '#f8f9fa', color: '#111', border: '1px solid #ddd' }}
                      onClick={(e) => handleDownloadInvoice(order, e)}
                    >
                      Invoice
                    </button>
                    <span className={`status-text ${order.status.toLowerCase()}`} style={{ marginLeft: 'auto' }}>
                      {statusMsg}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderOrderDetails = () => {
    if (!activeOrder) return null;
    const dateObj = new Date(activeOrder.created_at);
    const formattedDate = `${dateObj.getDate()}-${dateObj.getMonth()+1}-${dateObj.getFullYear()}`;
    const status = activeOrder.status.toLowerCase();
    
    const isCancelled = status === 'cancelled';
    const isReturned = status === 'returned';
    const isProcessing = status === 'processing' || status === 'shipped' || status === 'out_for_delivery' || status === 'delivered';
    const isShipped = status === 'shipped' || status === 'out_for_delivery' || status === 'delivered';
    const isOutForDelivery = status === 'out_for_delivery' || status === 'delivered';
    const isDelivered = status === 'delivered';

    const orderAddress = activeOrder.shipping_address 
      ? `${activeOrder.shipping_address}, ${activeOrder.city || ''}, ${activeOrder.state || ''} - ${activeOrder.pincode || ''}`
      : "No address provided";

    return (
      <motion.div 
        className="mobile-orders"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        key="order-details"
      >
        <div className="dashboard-header orders-header">
          <button className="back-btn-header" onClick={() => navigateTo('orders')}>
            <ChevronLeft size={24} />
          </button>
          <span className="header-title">Order Details</span>
          <div style={{ width: 24 }}></div> 
        </div>

        <div className="orders-page-content">
          <div className="order-detail-header premium-shadow">
            <div className="odh-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Order ID: {activeOrder.id.split('-')[0].toUpperCase()}</h3>
                <p>Placed on {formattedDate}</p>
              </div>
              <button 
                className="print-hide" 
                style={{ background: '#111', color: '#fff', border: 'none', padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={(e) => handleDownloadInvoice(activeOrder, e)}
              >
                View Invoice
              </button>
            </div>
            <div className="odh-item" style={{display: 'flex', gap: 16, marginTop: 16}}>
              {activeOrder.image ? (
                <img src={activeOrder.image} alt="product" style={{width: 64, height: 64, borderRadius: 12, objectFit: 'cover'}} />
              ) : (
                <div style={{width: 64, height: 64, borderRadius: 12, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Package size={24} color="#ccc" /></div>
              )}
              <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                <p className="odh-name">{activeOrder.product_name}</p>
                <p className="odh-price">₹{activeOrder.price || activeOrder.total_amount || '0'}</p>
              </div>
            </div>
          </div>

          <div className="tracking-container premium-shadow print-hide">
            <h3 className="tracking-title">Track Order</h3>
            
            <div className="tracking-timeline">
              {/* Step 1: Order Placed */}
              <div className="tracking-step">
                <div className={`t-icon active`}>
                  <CheckCircle size={16} />
                </div>
                <div className="t-content">
                  <h4>Order Placed</h4>
                  <p>We have received your order</p>
                </div>
              </div>
              <div className={`t-line ${isProcessing || isCancelled || isReturned ? 'active' : ''}`}></div>

              {/* Step 2: Processing */}
              <div className="tracking-step">
                <div className={`t-icon ${isProcessing || isCancelled || isReturned ? 'active' : ''}`}>
                  <CheckCircle size={16} />
                </div>
                <div className="t-content">
                  <h4>Order Processing</h4>
                  <p>Your items are being prepared</p>
                </div>
              </div>
              <div className={`t-line ${isShipped || isCancelled || isReturned ? 'active' : ''}`}></div>

              {/* Step 3: Shipped / Cancelled / Returned */}
              {isCancelled ? (
                <div className="tracking-step">
                  <div className="t-icon active red">
                    <XCircle size={16} />
                  </div>
                  <div className="t-content">
                    <h4 className="red-text">Order Cancelled</h4>
                    <p>This order was cancelled.</p>
                  </div>
                </div>
              ) : isReturned ? (
                <div className="tracking-step">
                  <div className="t-icon active yellow">
                    <XCircle size={16} />
                  </div>
                  <div className="t-content">
                    <h4 className="yellow-text">Order Returned</h4>
                    <p>Order has been returned.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="tracking-step">
                    <div className={`t-icon ${isShipped ? 'active' : ''}`}>
                      <CheckCircle size={16} />
                    </div>
                    <div className="t-content">
                      <h4>Shipped</h4>
                      <p>Package handed to courier</p>
                    </div>
                  </div>
                  <div className={`t-line ${isOutForDelivery ? 'active' : ''}`}></div>

                  {/* Step 4: Out for Delivery */}
                  <div className="tracking-step">
                    <div className={`t-icon ${isOutForDelivery ? 'active' : ''}`}>
                      <CheckCircle size={16} />
                    </div>
                    <div className="t-content">
                      <h4>Out for Delivery</h4>
                      <p>Package is on the way</p>
                    </div>
                  </div>
                  <div className={`t-line ${isDelivered ? 'active' : ''}`}></div>

                  {/* Step 5: Delivered */}
                  <div className="tracking-step">
                    <div className={`t-icon ${isDelivered ? 'active' : ''}`}>
                      <CheckCircle size={16} />
                    </div>
                    <div className="t-content">
                      <h4>Delivered</h4>
                      <p>Package handed to customer</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="order-address-box premium-shadow">
            <h4>Shipping Information</h4>
            <p className="address-text">{orderAddress}</p>
            {activeOrder.tracking_id && (
              <div className="tracking-id-box">
                <strong>Courier Tracking ID:</strong> {activeOrder.tracking_id}
              </div>
            )}
          </div>

          {isDelivered && (
            <div className="order-address-box premium-shadow print-hide" style={{marginTop: 24}}>
              <h4>Rate this Product</h4>
              <p className="address-text" style={{marginBottom: 12}}>How was your experience with {activeOrder.product_name}?</p>
              <button 
                className="btn-outline-premium" 
                style={{ background: '#111', color: '#fff', border: 'none', padding: '12px' }}
                onClick={() => alert('Review prompt opened!')}
              >
                Write a Review
              </button>
            </div>
          )}

          {allProducts.length > 0 && (
            <div className="order-address-box premium-shadow print-hide" style={{marginTop: 24, paddingBottom: 16}}>
              <h4>You might also like</h4>
              <div style={{display: 'flex', gap: 12, overflowX: 'auto', paddingTop: 8, paddingBottom: 8}}>
                {allProducts.slice(0, 4).map(p => (
                  <div key={p.id} style={{minWidth: 120, border: '1px solid #eee', borderRadius: 12, padding: 8, cursor: 'pointer'}} onClick={() => alert('Redirect to product!')}>
                    <div style={{height: 80, background: '#f8f9fa', borderRadius: 8, marginBottom: 8}}>
                      {/* image placeholder */}
                    </div>
                    <p style={{margin: '0 0 4px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{p.name}</p>
                    <p style={{margin: 0, fontSize: 13, color: '#ff0055', fontWeight: 700}}>₹{p.price}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }} className="print-hide">
            <button 
              style={{ padding: '14px 32px', fontSize: '15px', borderRadius: '12px', background: '#111', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
              onClick={(e) => handleDownloadInvoice(activeOrder, e)}
            >
              📄 View Full GST Invoice
            </button>
          </div>

        </div>
      </motion.div>
    );
  };

  const renderRoutineTracker = () => {
    const routineItems = getRoutineItems();
    
    return (
      <motion.div className="mobile-orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="routine">
        <div className="dashboard-header orders-header">
          <button className="back-btn-header" onClick={() => navigateTo('dashboard')}><ChevronLeft size={24} /></button>
        </div>
        <div className="orders-page-content">
          <h1 className="page-main-title">Daily Routine</h1>
          <p className="premium-subtitle">Track your actual supplement intake based on your past orders.</p>
          
          <div className="routine-list">
            {routineItems.length === 0 ? (
              <div className="premium-empty-state">
                <CheckCircle size={40} color="#ccc" />
                <p>Buy products to build your daily routine!</p>
              </div>
            ) : (
              routineItems.map((item, idx) => {
                const key = `routine_${idx}`;
                return (
                  <div key={idx} className={`routine-card premium-shadow ${routineChecked[key] ? 'completed' : ''}`} onClick={() => toggleRoutine(key)}>
                    <div className="routine-info">
                      <h3>Daily Dosage</h3>
                      <p>{item}</p>
                    </div>
                    <div className="check-circle-ui">{routineChecked[key] && <CheckCircle size={20} color="#fff" />}</div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderReferAndEarn = () => (
    <motion.div className="mobile-orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="refer">
      <div className="dashboard-header orders-header">
        <button className="back-btn-header" onClick={() => navigateTo('dashboard')}><ChevronLeft size={24} /></button>
      </div>
      <div className="orders-page-content" style={{textAlign: 'center'}}>
        <div className="referral-icon-large"><Gift size={48} color="#ff0055" /></div>
        <h1 className="page-main-title" style={{textAlign: 'center', marginTop: 20}}>Refer & Earn ₹100</h1>
        <p className="premium-subtitle">Give your friends ₹100 off their first order, and you get ₹100 when they buy.</p>
        
        <div className="referral-code-box premium-shadow">
          <span className="code-text">NUTRIX-{user?.id?.substring(0,6).toUpperCase() || 'VIP26'}</span>
          <button className="copy-btn" onClick={handleCopyReferral}><Copy size={18} /> Copy</button>
        </div>
        
        <div className="referral-stats premium-shadow">
          <div className="stat-item">
            <h4>0</h4>
            <p>Friends Joined</p>
          </div>
          <div className="stat-item">
            <h4>₹0</h4>
            <p>Earned</p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderOffers = () => (
    <motion.div className="mobile-orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="offers">
      <div className="dashboard-header orders-header">
        <button className="back-btn-header" onClick={() => navigateTo('dashboard')}><ChevronLeft size={24} /></button>
      </div>
      <div className="orders-page-content">
        <h1 className="page-main-title">Offers for You</h1>
        
        <div className="offer-card premium-shadow">
          <div className="offer-badge">FLAT 20% OFF</div>
          <h3>Monsoon VIP Discount</h3>
          <p>Use code <strong>MONSOON20</strong> at checkout on orders above ₹1499.</p>
          <button className="btn-outline-premium" onClick={() => { navigator.clipboard.writeText('MONSOON20'); alert('Code MONSOON20 copied!'); }}>Copy Code</button>
        </div>
      </div>
    </motion.div>
  );

  const renderSavedStacks = () => {
    // Take real products from allProducts. 
    // We will build a couple of mock stacks using actual names and prices from DB if they exist.
    const product1 = allProducts[0];
    const product2 = allProducts[1];
    
    return (
      <motion.div className="mobile-orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="stacks">
        <div className="dashboard-header orders-header">
          <button className="back-btn-header" onClick={() => navigateTo('dashboard')}><ChevronLeft size={24} /></button>
        </div>
        <div className="orders-page-content">
          <h1 className="page-main-title">Saved Stacks</h1>
          <p className="premium-subtitle">Bundle your favorite supplements for 1-click checkout.</p>
          
          <div className="orders-list-cards">
            {product1 && (
              <div className="stack-card premium-shadow">
                <div className="stack-header">
                  <h3>Essential Stack</h3>
                  <span className="stack-price">₹{product1.price}</span>
                </div>
                <p className="stack-desc">{product1.name} - {product1.description?.substring(0, 50)}...</p>
                <button className="btn-primary stack-add-btn" onClick={() => alert('Stack added to cart!')}>
                  <Plus size={16} /> Add Stack to Cart
                </button>
              </div>
            )}

            {product2 && (
              <div className="stack-card premium-shadow">
                <div className="stack-header">
                  <h3>Pro Performance Stack</h3>
                  <span className="stack-price">₹{product2.price}</span>
                </div>
                <p className="stack-desc">{product2.name} - {product2.description?.substring(0, 50)}...</p>
                <button className="btn-primary stack-add-btn" onClick={() => alert('Stack added to cart!')}>
                  <Plus size={16} /> Add Stack to Cart
                </button>
              </div>
            )}
            
            {!product1 && !product2 && (
              <p className="loading-text">No active products to build stacks.</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="account-redesign-wrapper">
      
      {/* Desktop Sidebar */}
      <div className="desktop-sidebar">
        <div className="desktop-profile-card premium-shadow">
          <div className="avatar-circle">
            <User size={50} color="#333" strokeWidth={1.5} />
          </div>
          <h2>{displayUserName}</h2>
        </div>
        
        <div className="premium-menu-list desktop-menu">
          <div className={`menu-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => navigateTo('dashboard')}>
            <div className="menu-left">
              <div className="menu-icon"><Package size={20} color={view === 'dashboard' ? '#ff0055' : '#555'} /></div>
              <span className="menu-text">Dashboard</span>
            </div>
          </div>
          <div className={`menu-item ${view === 'wishlist' ? 'active' : ''}`} onClick={() => navigateTo('wishlist')}>
            <div className="menu-left">
              <div className="menu-icon"><Heart size={20} color={view === 'wishlist' ? '#ff0055' : '#555'} /></div>
              <span className="menu-text">Wishlist</span>
            </div>
          </div>
          <div className="menu-item" onClick={() => alert('Redirecting to Customer Care...')}>
            <div className="menu-left">
              <div className="menu-icon"><Headphones size={20} color="#555" /></div>
              <span className="menu-text">Customer Care</span>
            </div>
          </div>
          <div className={`menu-item ${view === 'profile' ? 'active' : ''}`} onClick={() => navigateTo('profile')}>
            <div className="menu-left">
              <div className="menu-icon"><User size={20} color={view === 'profile' ? '#ff0055' : '#555'} /></div>
              <span className="menu-text">Edit Profile</span>
            </div>
          </div>
          <div className={`menu-item ${view === 'address' ? 'active' : ''}`} onClick={() => navigateTo('address')}>
            <div className="menu-left">
              <div className="menu-icon"><MapPin size={20} color={view === 'address' ? '#ff0055' : '#555'} /></div>
              <span className="menu-text">Shipping Address</span>
            </div>
          </div>
          <div className="menu-item" onClick={onSignOut}>
            <div className="menu-left">
              <div className="menu-icon"><LogOut size={20} color="#555" /></div>
              <span className="menu-text">Logout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="desktop-main-content">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && renderDashboardGrid()}
          {view === 'orders' && renderOrdersList()}
          {view === 'order-details' && renderOrderDetails()}
          {view === 'routine' && renderRoutineTracker()}
          {view === 'refer' && renderReferAndEarn()}
          {view === 'offers' && renderOffers()}
          {view === 'stacks' && renderSavedStacks()}
          
          {(view === 'profile' || view === 'address' || view === 'wishlist' || view === 'reviews') && (
            <motion.div 
              className="mobile-orders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="placeholder"
            >
              <div className="dashboard-header orders-header">
                <button className="back-btn-header" onClick={() => navigateTo('dashboard')}>
                  <ChevronLeft size={24} />
                </button>
              </div>
              <div className="orders-page-content" style={{textAlign: 'center', paddingTop: 60}}>
                <h1 className="page-main-title">{view.charAt(0).toUpperCase() + view.slice(1)}</h1>
                <p className="premium-subtitle">This premium feature is currently being tailored for you.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showInvoiceForOrder && (
        <ProfessionalInvoice 
          order={showInvoiceForOrder} 
          onClose={() => setShowInvoiceForOrder(null)} 
        />
      )}

    </div>
  );
};

export default AccountPage;
