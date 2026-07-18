import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Package, Truck, FileText, BarChart2, ShieldCheck, Lock,
  Moon, Sun, LogOut, Search, ChevronRight
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('orders');
  const [theme, setTheme] = useState('dark');
  
  // Security
  const [isAuthenticatedAdmin, setIsAuthenticatedAdmin] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  
  // Real data state for Orders
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Toggle Theme
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Fetch real orders from Supabase
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  // Update real order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
        
      if (error) throw error;
      
      // Update local state to reflect change instantly
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
      console.error('Error updating status:', error.message);
      alert('Failed to update status');
    }
  };

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (passcode === 'pure2026') {
      setIsAuthenticatedAdmin(true);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
      setPasscode('');
    }
  };

  if (!isAuthenticatedAdmin) {
    return (
      <div className={`admin-dashboard-wrapper admin-theme-dark`} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <motion.div 
          className="admin-card" 
          style={{ maxWidth: '400px', width: '90%', textAlign: 'center' }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Lock size={48} color="var(--admin-accent)" style={{ marginBottom: '20px' }} />
          <h2 style={{ marginBottom: '10px' }}>Admin Access Restricted</h2>
          <p style={{ color: 'var(--admin-text-muted)', marginBottom: '30px' }}>Enter the master passcode to access the dashboard.</p>
          <form onSubmit={handlePasscodeSubmit}>
            <input 
              type="password" 
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${passcodeError ? '#ef4444' : 'var(--admin-border)'}`,
                background: 'var(--admin-bg)',
                color: 'var(--admin-text)',
                marginBottom: '20px',
                textAlign: 'center',
                letterSpacing: '4px',
                fontSize: '1.2rem'
              }}
              autoFocus
            />
            {passcodeError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '-10px', marginBottom: '15px' }}>Incorrect passcode</p>}
            <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Unlock Dashboard
            </button>
          </form>
          <button onClick={onBack} className="admin-btn admin-btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
            Return to Store
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'analytics', label: 'Advanced Analytics', icon: BarChart2 },
    { id: 'orders', label: 'Order Fulfillment', icon: Truck },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'inventory', label: 'Inventory & Supply', icon: Package },
    { id: 'invoicing', label: 'Automated Invoicing', icon: FileText },
    { id: 'compliance', label: 'Regulatory Compliance', icon: ShieldCheck },
    { id: 'security', label: 'Security & Access', icon: Lock },
  ];

  return (
    <div className={`admin-dashboard-wrapper admin-theme-${theme}`}>
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h2>PURE <span className="gold-text">NUTRIX</span></h2>
        </div>
        
        <nav className="admin-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-nav-item" onClick={onBack}>
            <LogOut size={18} />
            Exit Admin Panel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <h1>{navItems.find(i => i.id === activeTab)?.label}</h1>
          
          <div className="admin-actions">
            <button className="theme-toggle-btn" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* MODULE: Analytics (Mock) */}
            {activeTab === 'analytics' && (
              <div>
                <div className="admin-grid">
                  <div className="admin-card">
                    <h3 className="admin-card-title">Total Revenue</h3>
                    <p className="admin-card-value">₹24.5M</p>
                    <span className="admin-badge badge-success">+12.5% this month</span>
                  </div>
                  <div className="admin-card">
                    <h3 className="admin-card-title">Active Customers</h3>
                    <p className="admin-card-value">12,450</p>
                    <span className="admin-badge badge-success">+8.2% this month</span>
                  </div>
                  <div className="admin-card">
                    <h3 className="admin-card-title">Conversion Rate</h3>
                    <p className="admin-card-value">4.2%</p>
                    <span className="admin-badge badge-warning">-0.4% this month</span>
                  </div>
                </div>
                <div className="admin-card">
                  <h3 className="admin-card-title">Sales Overview (Mock)</h3>
                  <div className="analytics-chart-placeholder">
                    Interactive Chart Area
                  </div>
                </div>
              </div>
            )}

            {/* MODULE: Order Fulfillment (REAL connected to Supabase) */}
            {activeTab === 'orders' && (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Product</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingOrders ? (
                      <tr><td colSpan="5" style={{textAlign: 'center'}}>Loading live orders...</td></tr>
                    ) : orders.length === 0 ? (
                      <tr><td colSpan="5" style={{textAlign: 'center'}}>No orders found in database.</td></tr>
                    ) : (
                      orders.map(order => (
                        <tr key={order.id}>
                          <td style={{fontFamily: 'monospace'}}>{order.id.split('-')[0]}</td>
                          <td>
                            <strong>{order.customer_name}</strong><br/>
                            <span style={{fontSize: '0.8rem', color: 'var(--admin-text-muted)'}}>{order.city}</span>
                          </td>
                          <td>{order.product_name}</td>
                          <td>{new Date(order.created_at).toLocaleDateString()}</td>
                          <td>
                            <select 
                              className="status-select"
                              value={order.status.toLowerCase()}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            >
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="out_for_delivery">Out for Delivery</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* MODULE: User Management (Mock) */}
            {activeTab === 'users' && (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Segment</th>
                      <th>Lifetime Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Sarah Jenkins</td>
                      <td>sarah.j@example.com</td>
                      <td><span className="admin-badge badge-success">VIP Customer</span></td>
                      <td>₹42,500</td>
                      <td><button className="admin-btn admin-btn-outline">View Profile</button></td>
                    </tr>
                    <tr>
                      <td>Michael Chen</td>
                      <td>m.chen@example.com</td>
                      <td><span className="admin-badge badge-info">Regular</span></td>
                      <td>₹12,400</td>
                      <td><button className="admin-btn admin-btn-outline">View Profile</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* MODULE: Inventory (Mock) */}
            {activeTab === 'inventory' && (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product / SKU</th>
                      <th>Batch No.</th>
                      <th>Stock Level</th>
                      <th>Status</th>
                      <th>Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Ultra L-Glutathione 500mg</td>
                      <td>B-99201</td>
                      <td>4,250 units</td>
                      <td><span className="admin-badge badge-success">Healthy</span></td>
                      <td>Oct 2028</td>
                    </tr>
                    <tr>
                      <td>Advanced Collagen & Biotin</td>
                      <td>B-88312</td>
                      <td>124 units</td>
                      <td><span className="admin-badge badge-error">Low Stock</span></td>
                      <td>Dec 2027</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* MODULE: Invoicing (Mock) */}
            {activeTab === 'invoicing' && (
              <div className="admin-card">
                <h3 className="admin-card-title">Automated Invoice Settings</h3>
                <p>Invoices are automatically generated and emailed to customers upon order confirmation.</p>
                <br/>
                <button className="admin-btn admin-btn-primary"><FileText size={16}/> Preview Default Invoice Template</button>
              </div>
            )}

            {/* MODULE: Compliance (Mock) */}
            {activeTab === 'compliance' && (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Document Type</th>
                      <th>Batch Reference</th>
                      <th>Upload Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>3rd Party Lab Test (Heavy Metals)</td>
                      <td>B-99201</td>
                      <td>May 14, 2026</td>
                      <td><span className="admin-badge badge-success">Passed</span></td>
                    </tr>
                    <tr>
                      <td>FSSAI Compliance Audit</td>
                      <td>All Batches</td>
                      <td>Jan 02, 2026</td>
                      <td><span className="admin-badge badge-success">Verified</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* MODULE: Security (Mock) */}
            {activeTab === 'security' && (
              <div className="admin-card">
                <h3 className="admin-card-title">Access Logs</h3>
                <p>System is operating normally. No unauthorized login attempts detected.</p>
                <br/>
                <button className="admin-btn admin-btn-outline"><Lock size={16}/> Manage Admin Roles</button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AdminDashboard;
