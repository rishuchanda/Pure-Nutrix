import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, User, Package, MapPin, CreditCard, 
  Settings, LogOut, CheckCircle2, Truck, Box, Calendar
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './AccountPage.css';

const TRACKING_STEPS = [
  { id: 'placed', label: 'Order Placed', icon: Box },
  { id: 'processing', label: 'Processing', icon: Settings },
  { id: 'shipped', label: 'Shipped', icon: Truck },
  { id: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle2 }
];

const OrderTracking = ({ status }) => {
  const currentStepIndex = TRACKING_STEPS.findIndex(s => s.id === status);
  
  return (
    <div className="tracking-container">
      <div className="tracking-progress-bar">
        <motion.div 
          className="tracking-progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStepIndex / (TRACKING_STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      <div className="tracking-steps">
        {TRACKING_STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className={`tracking-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="step-icon-wrapper">
                <Icon size={20} />
              </div>
              <span className="step-label">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AccountPage = ({ user, onBack, onSignOut }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // If no user is passed (edge case), just use mock details
  const userEmail = user?.email || 'premium.member@purenutrix.com';
  const userName = userEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ') || 'Valued Member';

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

    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [user, activeTab]);

  return (
    <div className="account-page-wrapper">
      <div className="account-container container">
        <div className="account-header">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={20} />
            <span>Back to Store</span>
          </button>
          <h1 className="account-page-title">My <span className="text-gold">Account</span></h1>
        </div>

        <div className="account-layout">
          {/* Sidebar Navigation */}
          <div className="account-sidebar glass-card">
            <div className="user-profile-summary">
              <div className="avatar-circle">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info-text">
                <h3>{userName}</h3>
                <p>Premium Member</p>
              </div>
            </div>

            <nav className="account-nav">
              <button 
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <User size={20} />
                <span>My Profile</span>
              </button>
              <button 
                className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                <Package size={20} />
                <span>Order History</span>
              </button>
              <button 
                className={`nav-item ${activeTab === 'addresses' ? 'active' : ''}`}
                onClick={() => setActiveTab('addresses')}
              >
                <MapPin size={20} />
                <span>Saved Addresses</span>
              </button>
              <button 
                className={`nav-item ${activeTab === 'payment' ? 'active' : ''}`}
                onClick={() => setActiveTab('payment')}
              >
                <CreditCard size={20} />
                <span>Payment Methods</span>
              </button>
            </nav>

            <button className="sign-out-btn" onClick={onSignOut}>
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="account-content glass-card">
            <AnimatePresence mode="wait">
              
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="tab-content"
                >
                  <h2 className="tab-title">Personal Details</h2>
                  <div className="profile-form">
                    <div className="input-row">
                      <div className="input-group">
                        <label>Full Name</label>
                        <input type="text" defaultValue={userName} readOnly />
                      </div>
                      <div className="input-group">
                        <label>Email Address</label>
                        <input type="email" defaultValue={userEmail} readOnly />
                      </div>
                    </div>
                    <div className="input-row">
                      <div className="input-group">
                        <label>Mobile Number</label>
                        <input type="tel" defaultValue="9876543210" placeholder="10-digit mobile number" maxLength="10" />
                      </div>
                      <div className="input-group">
                        <label>Date of Birth</label>
                        <input type="date" />
                      </div>
                    </div>
                    <button className="btn-primary update-btn">Update Profile</button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'orders' && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="tab-content"
                >
                  <h2 className="tab-title">Order History & Tracking</h2>
                  <div className="orders-list">
                    {loadingOrders ? (
                      <p>Loading your orders...</p>
                    ) : orders.length === 0 ? (
                      <div className="empty-state">
                        <Package size={48} />
                        <h3>No Orders Found</h3>
                        <p>You haven't placed any orders yet.</p>
                        <button className="btn-outline add-new-btn" onClick={onBack}>Shop Now</button>
                      </div>
                    ) : (
                      orders.map((order) => (
                        <div key={order.id} className="order-history-card">
                          <div className="order-card-header">
                            <div className="order-meta">
                              <span className="order-id">Order {order.id.split('-')[0]}</span>
                              <span className="order-date">
                                <Calendar size={14}/> 
                                {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                            </div>
                            <span className={`order-status-badge ${order.status.toLowerCase() === 'delivered' ? 'success' : 'pending'}`}>
                              {order.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>

                          <div className="order-product-details">
                            <img src={order.image} alt={order.product_name} className="order-product-img" />
                            <div className="product-info">
                              <h4>{order.product_name}</h4>
                              <p>Qty: {order.qty}</p>
                              <span className="product-price">₹{order.price}</span>
                            </div>
                          </div>

                          <div className="order-tracking-section">
                            <OrderTracking status={order.status.toLowerCase()} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'addresses' && (
                <motion.div
                  key="addresses"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="tab-content"
                >
                  <div className="address-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2 className="tab-title" style={{ marginBottom: 0 }}>Saved Addresses</h2>
                    <button className="btn-outline add-new-btn">Add New Address</button>
                  </div>
                  
                  <div className="addresses-list" style={{ display: 'grid', gap: '20px' }}>
                    <div className="address-card" style={{ padding: '25px', border: '1px solid var(--glass-border)', borderRadius: '16px', background: 'var(--color-bg-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span style={{ background: '#e2e8f0', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>HOME</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button style={{ background: 'none', border: 'none', color: 'var(--color-accent-gold)', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                          <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                        </div>
                      </div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '5px' }}>{userName}</h4>
                      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '5px' }}>Flat No. 402, Sai Apartment</p>
                      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '5px' }}>Main Road, Andheri West</p>
                      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '5px' }}>Landmark: near Apollo Hospital</p>
                      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '15px' }}>Mumbai, Maharashtra - 400053</p>
                      <p style={{ fontWeight: 600 }}>Mobile: 9876543210</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="tab-content empty-state"
                >
                  <div className="empty-icon-wrapper">
                    <CreditCard size={48} />
                  </div>
                  <h2 className="tab-title">No Payment Methods Saved</h2>
                  <p>You haven't saved any payment methods yet. Adding them makes checkout faster!</p>
                  <button className="btn-outline add-new-btn">Add New</button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
