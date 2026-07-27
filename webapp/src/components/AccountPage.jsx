import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Search, Package, CheckCircle, Layers, 
  Tag, Gift, Star, Heart, Headphones, User, MapPin, 
  ChevronRight, LogOut, Camera, Copy
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './AccountPage.css';

const AccountPage = ({ user, onBack, onSignOut }) => {
  const [view, setView] = useState('dashboard'); // dashboard, orders, routine, stacks, offers, refer, reviews, profile, address, wishlist
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderFilter, setOrderFilter] = useState('All'); 

  // Mock states for new features
  const [routineChecked, setRoutineChecked] = useState({ morning: false, workout: false, night: false });

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setOrders(data);
      } catch (error) {
        console.error('Error fetching orders:', error.message);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, [user]);

  const userEmail = user?.email || 'premium.member@purenutrix.com';
  const userName = userEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ') || 'Valued Member';
  const displayUserName = userName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  const navigateToOrders = (filter = 'All') => {
    setOrderFilter(filter);
    setView('orders');
  };

  const getFilteredOrders = () => {
    if (orderFilter === 'All') return orders;
    let filterTerm = orderFilter.toLowerCase();
    if (filterTerm === 'pending payment') filterTerm = 'pending';
    return orders.filter(o => o.status.toLowerCase().includes(filterTerm));
  };

  const renderDashboard = () => (
    <motion.div 
      className="mobile-dashboard premium-dashboard"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      key="dashboard"
    >
      <div className="dashboard-header">
        <button className="back-btn-header" onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <span className="header-title">My Account</span>
        <div style={{ width: 24 }}></div> 
      </div>

      <div className="profile-section clean-profile">
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
        {/* Removed "Customer" tag as requested */}
      </div>

      <div className="dashboard-content premium-content">
        
        {/* 1:1 Square Grid for Core Features */}
        <div className="premium-grid">
          <div className="premium-grid-card" onClick={() => navigateToOrders('All')}>
            <div className="grid-icon-wrap"><Package size={28} strokeWidth={1.5} color="#333" /></div>
            <span>My Orders</span>
          </div>
          <div className="premium-grid-card" onClick={() => setView('routine')}>
            <div className="grid-icon-wrap"><CheckCircle size={28} strokeWidth={1.5} color="#333" /></div>
            <span>Daily Routine</span>
          </div>
          <div className="premium-grid-card" onClick={() => setView('stacks')}>
            <div className="grid-icon-wrap"><Layers size={28} strokeWidth={1.5} color="#333" /></div>
            <span>Saved Stacks</span>
          </div>
          <div className="premium-grid-card" onClick={() => setView('offers')}>
            <div className="grid-icon-wrap"><Tag size={28} strokeWidth={1.5} color="#333" /></div>
            <span>Offers for You</span>
          </div>
          <div className="premium-grid-card" onClick={() => setView('refer')}>
            <div className="grid-icon-wrap"><Gift size={28} strokeWidth={1.5} color="#333" /></div>
            <span>Refer & Earn</span>
          </div>
          <div className="premium-grid-card" onClick={() => setView('reviews')}>
            <div className="grid-icon-wrap"><Star size={28} strokeWidth={1.5} color="#333" /></div>
            <span>My Reviews</span>
          </div>
        </div>

        {/* Vertical Menu List for Secondary Actions */}
        <div className="premium-menu-list">
          <div className="menu-item" onClick={() => setView('wishlist')}>
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
          <div className="menu-item" onClick={() => setView('profile')}>
            <div className="menu-left">
              <div className="menu-icon"><User size={20} color="#555" /></div>
              <span className="menu-text">Edit Profile</span>
            </div>
            <ChevronRight size={20} color="#ccc" />
          </div>
          <div className="menu-item" onClick={() => setView('address')}>
            <div className="menu-left">
              <div className="menu-icon"><MapPin size={20} color="#555" /></div>
              <span className="menu-text">Shipping Address</span>
            </div>
            <ChevronRight size={20} color="#ccc" />
          </div>
        </div>
      </div>

      <div className="logout-wrapper">
        <button className="logout-btn" onClick={onSignOut}>
          <LogOut size={20} />
          <span>Logout securely</span>
        </button>
      </div>
    </motion.div>
  );

  const renderOrdersList = () => {
    const filteredOrders = getFilteredOrders();
    
    return (
      <motion.div 
        className="mobile-orders"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        key="orders"
      >
        <div className="dashboard-header orders-header">
          <button className="back-btn-header" onClick={() => setView('dashboard')}>
            <ChevronLeft size={24} />
          </button>
          <button className="search-btn-header">
            <Search size={24} />
          </button>
        </div>

        <div className="orders-page-content">
          <h1 className="page-main-title">Order History</h1>
          
          <div className="order-tabs-scroll">
            {['All', 'Pending Payment', 'Processing', 'Delivered', 'Cancelled'].map(tab => (
              <button 
                key={tab}
                className={`order-tab ${orderFilter === tab ? 'active' : ''}`}
                onClick={() => setOrderFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="orders-list-cards">
            {loadingOrders ? (
              <p className="loading-text">Loading orders...</p>
            ) : filteredOrders.length === 0 ? (
              <div className="premium-empty-state">
                <Package size={40} color="#ccc" />
                <p>No orders found in this category.</p>
              </div>
            ) : (
              filteredOrders.map(order => {
                const dateObj = new Date(order.created_at);
                const formattedDate = `${dateObj.getDate()}-${dateObj.getMonth()+1}-${dateObj.getFullYear()}`;
                
                return (
                  <div key={order.id} className="order-card-new premium-shadow">
                    <div className="order-card-top">
                      <span className="order-no">Order No: {order.id.split('-')[0]}</span>
                      <span className="order-date">{formattedDate}</span>
                    </div>
                    <div className="order-card-middle">
                      <div className="tracking-row">
                        <span className="label">Tracking:</span>
                        <span className="value">{order.tracking_id || 'Pending'}</span>
                      </div>
                      <div className="qty-amount-row">
                        <span className="label">Quantity: <span className="value">1</span></span>
                        <span className="label">Total: <span className="value bold">₹{order.total_amount}</span></span>
                      </div>
                    </div>
                    <div className="order-card-bottom">
                      <button className="details-btn">Details</button>
                      <span className={`status-text ${order.status.toLowerCase()}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase()}
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
  };

  // Placeholder renderers for new premium features
  const renderRoutineTracker = () => (
    <motion.div className="mobile-orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="routine">
      <div className="dashboard-header orders-header">
        <button className="back-btn-header" onClick={() => setView('dashboard')}><ChevronLeft size={24} /></button>
      </div>
      <div className="orders-page-content">
        <h1 className="page-main-title">Daily Routine</h1>
        <p className="premium-subtitle">Track your supplement intake to stay consistent.</p>
        
        <div className="routine-list">
          <div className={`routine-card premium-shadow ${routineChecked.morning ? 'completed' : ''}`} onClick={() => setRoutineChecked({...routineChecked, morning: !routineChecked.morning})}>
            <div className="routine-info">
              <h3>Morning Dosage</h3>
              <p>L-Glutathione 1000mg + Vitamin C</p>
            </div>
            <div className="check-circle-ui">{routineChecked.morning && <CheckCircle size={20} color="#fff" />}</div>
          </div>
          
          <div className={`routine-card premium-shadow ${routineChecked.workout ? 'completed' : ''}`} onClick={() => setRoutineChecked({...routineChecked, workout: !routineChecked.workout})}>
            <div className="routine-info">
              <h3>Post-Workout</h3>
              <p>100% Whey Protein Isolate (1 Scoop)</p>
            </div>
            <div className="check-circle-ui">{routineChecked.workout && <CheckCircle size={20} color="#fff" />}</div>
          </div>
          
          <div className={`routine-card premium-shadow ${routineChecked.night ? 'completed' : ''}`} onClick={() => setRoutineChecked({...routineChecked, night: !routineChecked.night})}>
            <div className="routine-info">
              <h3>Night Recovery</h3>
              <p>Ashwagandha KSM-66</p>
            </div>
            <div className="check-circle-ui">{routineChecked.night && <CheckCircle size={20} color="#fff" />}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderReferAndEarn = () => (
    <motion.div className="mobile-orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="refer">
      <div className="dashboard-header orders-header">
        <button className="back-btn-header" onClick={() => setView('dashboard')}><ChevronLeft size={24} /></button>
      </div>
      <div className="orders-page-content" style={{textAlign: 'center'}}>
        <div className="referral-icon-large"><Gift size={48} color="#ff0055" /></div>
        <h1 className="page-main-title" style={{textAlign: 'center', marginTop: 20}}>Refer & Earn ₹500</h1>
        <p className="premium-subtitle">Give your friends ₹300 off their first order, and you get ₹500 when they buy.</p>
        
        <div className="referral-code-box premium-shadow">
          <span className="code-text">NUTRIX-{user?.id?.substring(0,6).toUpperCase() || 'VIP26'}</span>
          <button className="copy-btn"><Copy size={18} /> Copy</button>
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
        <button className="back-btn-header" onClick={() => setView('dashboard')}><ChevronLeft size={24} /></button>
      </div>
      <div className="orders-page-content">
        <h1 className="page-main-title">Offers for You</h1>
        
        <div className="offer-card premium-shadow">
          <div className="offer-badge">FLAT 20% OFF</div>
          <h3>Monsoon VIP Discount</h3>
          <p>Use code <strong>MONSOON20</strong> at checkout on orders above ₹1499.</p>
          <button className="btn-outline-premium">Copy Code</button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="account-redesign-wrapper">
      <AnimatePresence mode="wait">
        {view === 'dashboard' && renderDashboard()}
        {view === 'orders' && renderOrdersList()}
        {view === 'routine' && renderRoutineTracker()}
        {view === 'refer' && renderReferAndEarn()}
        {view === 'offers' && renderOffers()}
        
        {(view === 'profile' || view === 'address' || view === 'wishlist' || view === 'stacks' || view === 'reviews') && (
          <motion.div 
            className="mobile-orders"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            key="placeholder"
          >
            <div className="dashboard-header orders-header">
              <button className="back-btn-header" onClick={() => setView('dashboard')}>
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
  );
};

export default AccountPage;
