import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Search, Wallet, Truck, Package, 
  XSquare, Heart, Headphones, User, MapPin, 
  ChevronRight, LogOut, Camera
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './AccountPage.css';

const AccountPage = ({ user, onBack, onSignOut }) => {
  const [view, setView] = useState('dashboard'); // 'dashboard', 'orders', 'profile', 'address'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderFilter, setOrderFilter] = useState('All'); 

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

  const navigateToOrders = (filter) => {
    let internalFilter = filter;
    if (filter === 'Pending Payment') internalFilter = 'pending';
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
      className="mobile-dashboard"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      key="dashboard"
    >
      <div className="dashboard-header">
        <button className="back-btn-header" onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <span className="header-title">Profile</span>
        <div style={{ width: 24 }}></div> 
      </div>

      <div className="profile-section">
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
          <div className="avatar-circle">
            <User size={40} color="#666" strokeWidth={1.5} />
          </div>
          <button className="camera-btn">
            <Camera size={14} color="#fff" />
          </button>
        </div>
        <h2 className="profile-name">{displayUserName}</h2>
        <p className="profile-role">Customer</p>
      </div>

      <div className="dashboard-content">
        <div className="orders-summary-section">
          <h3 className="section-title">My Orders</h3>
          <div className="orders-grid">
            <div className="grid-item" onClick={() => navigateToOrders('Pending Payment')}>
              <div className="grid-icon blue"><Wallet size={26} strokeWidth={1.5} /></div>
              <span>Pending Payment</span>
            </div>
            <div className="grid-item" onClick={() => navigateToOrders('Delivered')}>
              <div className="grid-icon red"><Truck size={26} strokeWidth={1.5} /></div>
              <span>Delivered</span>
            </div>
            <div className="grid-item" onClick={() => navigateToOrders('Processing')}>
              <div className="grid-icon pink"><Package size={26} strokeWidth={1.5} /></div>
              <span>Processing</span>
            </div>
            <div className="grid-item" onClick={() => navigateToOrders('Cancelled')}>
              <div className="grid-icon green"><XSquare size={26} strokeWidth={1.5} /></div>
              <span>Cancelled</span>
            </div>
            <div className="grid-item" onClick={() => setView('wishlist')}>
              <div className="grid-icon heart-icon"><Heart size={26} fill="#ff4d79" color="#ff4d79" /></div>
              <span>Wishlist</span>
            </div>
            <div className="grid-item" onClick={() => alert('Redirecting to WhatsApp support...')}>
              <div className="grid-icon purple"><Headphones size={26} strokeWidth={1.5} /></div>
              <span>Customer Care</span>
            </div>
          </div>
        </div>

        <div className="menu-list">
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
          <span>Logout</span>
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
          <h1 className="page-main-title">My Orders</h1>
          
          <div className="order-tabs-scroll">
            {['All', 'Pending Payment', 'Delivered', 'Processing', 'Cancelled'].map(tab => (
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
              <p className="loading-text">No orders found in this category.</p>
            ) : (
              filteredOrders.map(order => {
                const dateObj = new Date(order.created_at);
                const formattedDate = `${dateObj.getDate()}-${dateObj.getMonth()+1}-${dateObj.getFullYear()}`;
                
                return (
                  <div key={order.id} className="order-card-new">
                    <div className="order-card-top">
                      <span className="order-no">Order No: {order.id.split('-')[0]}</span>
                      <span className="order-date">{formattedDate}</span>
                    </div>
                    <div className="order-card-middle">
                      <div className="tracking-row">
                        <span className="label">Tracking number:</span>
                        <span className="value">{order.tracking_id || 'Pending'}</span>
                      </div>
                      <div className="qty-amount-row">
                        <span className="label">Quantity: <span className="value">1</span></span>
                        <span className="label">Total Amount: <span className="value bold">₹{order.total_amount}</span></span>
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

  return (
    <div className="account-redesign-wrapper">
      <AnimatePresence mode="wait">
        {view === 'dashboard' && renderDashboard()}
        {view === 'orders' && renderOrdersList()}
        {(view === 'profile' || view === 'address' || view === 'wishlist') && (
          <motion.div 
            className="mobile-dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            key="placeholder"
          >
            <div className="dashboard-header">
              <button className="back-btn-header" onClick={() => setView('dashboard')}>
                <ChevronLeft size={24} />
              </button>
              <span className="header-title">{view.charAt(0).toUpperCase() + view.slice(1)}</span>
              <div style={{ width: 24 }}></div>
            </div>
            <div className="dashboard-content" style={{ marginTop: 20 }}>
              <p style={{textAlign: 'center', color: '#666'}}>This section is currently under development.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountPage;
