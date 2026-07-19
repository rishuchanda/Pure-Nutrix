import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Package, Truck, BarChart2, ShieldCheck, Lock,
  Moon, Sun, LogOut, Search, ChevronRight, ShoppingBag, 
  Upload, Trash2, Image as ImageIcon, Bell, Settings, Edit,
  ArrowUpRight, ArrowDownRight, RefreshCcw, Plus
} from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import './AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  
  // Security
  const [isAuthenticatedAdmin, setIsAuthenticatedAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Real data state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Modal State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  // Inventory State
  const [inventoryList, setInventoryList] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  
  // Handlers
  const updateOrderStatus = async (orderId, newStatus) => {
    if (adminRole === 'viewer') return;
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
      console.error('Error updating status:', error.message);
      alert('Failed to update status');
    }
  };

  const fetchInventory = async () => {
    try {
      setLoadingInventory(true);
      const { data, error } = await supabase.from('inventory').select('*').order('product_name', { ascending: true });
      if (error) throw error;
      setInventoryList(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error.message);
    } finally {
      setLoadingInventory(false);
    }
  };


  // Check if already logged in as admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const { data } = await supabase
            .from('admin_roles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (data) {
            setIsAuthenticatedAdmin(true);
            setAdminRole(data.role);
          }
        } catch (err) {
          console.error("Admin check failed", err);
        }
      }
    };
    checkAdminStatus();
  }, [user]);

  // Toggle Theme
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  // Fetch Data
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

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'orders') fetchOrders();
    if (activeTab === 'catalog') fetchProducts();
    if (activeTab === 'inventory') fetchInventory();
  }, [activeTab]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('id', authData.user.id)
        .single();
        
      if (profileError || !profile) {
        await supabase.auth.signOut();
        setLoginError('Access Denied: You do not have an administrator account.');
        return;
      }
      setIsAuthenticatedAdmin(true);
      setAdminRole(profile.role);
    } catch (error) {
      setLoginError(error.message || 'Login failed.');
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
          <p style={{ color: 'var(--admin-text-muted)', marginBottom: '30px' }}>Sign in to your administrator account.</p>
          <form onSubmit={handleLoginSubmit}>
            <input 
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin Email" className="admin-input" style={{ marginBottom: '15px' }} autoFocus
            />
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" className="admin-input" style={{ marginBottom: '20px' }}
            />
            {loginError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '-10px', marginBottom: '15px' }}>{loginError}</p>}
            <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%' }}>
              Unlock Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'catalog', label: 'Catalog / Listings', icon: ShoppingBag },
    { id: 'orders', label: 'Orders', icon: Truck },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'returns', label: 'Returns', icon: RefreshCcw },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'users', label: 'Customers', icon: Users },
  ];

  if (adminRole === 'super_admin') {
    navItems.push({ id: 'settings', label: 'Settings & Security', icon: Settings });
  }

  // Calculations for KPIs
  const totalRevenue = orders.reduce((acc, order) => acc + (order.price || 0), 0);
  const activeOrders = orders.filter(o => o.status && o.status.toLowerCase() !== 'delivered').length;
  
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
          <div className="admin-profile-snippet">
            <div className="admin-avatar">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="admin-profile-info">
              <span className="admin-profile-email">{user?.email}</span>
              <span className="admin-profile-role">{adminRole?.replace('_', ' ')}</span>
            </div>
          </div>
          <button className="admin-nav-item" onClick={async () => {
            await supabase.auth.signOut();
            setIsAuthenticatedAdmin(false);
          }}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        {/* Top Header */}
        <header className="admin-top-header">
          <div className="admin-search-container">
            <Search size={18} color="var(--admin-text-muted)" />
            <input type="text" placeholder="Search orders, SKUs, or products..." />
          </div>
          
          <div className="admin-header-actions">
            <button className="header-icon-btn" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="header-icon-btn">
              <Bell size={20} />
              <span className="badge-dot"></span>
            </button>
            <div className="admin-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem', cursor: 'pointer' }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* === DASHBOARD TAB === */}
              {activeTab === 'dashboard' && (
                <div>
                  <div className="admin-page-header">
                    <div>
                      <h1>Overview Dashboard</h1>
                      <p>Welcome back, here's what's happening with your store today.</p>
                    </div>
                  </div>

                  {/* KPIs */}
                  <div className="admin-grid">
                    <div className="admin-kpi-card">
                      <div className="kpi-header">
                        <h3 className="kpi-title">Total Sales</h3>
                        <div className="kpi-icon"><ShoppingBag size={20} /></div>
                      </div>
                      <p className="kpi-value">{orders.length}</p>
                      <div className="kpi-trend trend-up">
                        <ArrowUpRight size={16} /> <span>12.5% vs last week</span>
                      </div>
                    </div>
                    <div className="admin-kpi-card">
                      <div className="kpi-header">
                        <h3 className="kpi-title">Active Orders</h3>
                        <div className="kpi-icon"><Truck size={20} /></div>
                      </div>
                      <p className="kpi-value">{activeOrders}</p>
                      <div className="kpi-trend trend-down">
                        <ArrowDownRight size={16} /> <span>2.1% vs last week</span>
                      </div>
                    </div>
                    <div className="admin-kpi-card">
                      <div className="kpi-header">
                        <h3 className="kpi-title">Total Revenue</h3>
                        <div className="kpi-icon"><BarChart2 size={20} /></div>
                      </div>
                      <p className="kpi-value">₹{(totalRevenue / 1000).toFixed(1)}k</p>
                      <div className="kpi-trend trend-up">
                        <ArrowUpRight size={16} /> <span>8.4% vs last week</span>
                      </div>
                    </div>
                    <div className="admin-kpi-card">
                      <div className="kpi-header">
                        <h3 className="kpi-title">Low Stock Alerts</h3>
                        <div className="kpi-icon" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)' }}><Package size={20} /></div>
                      </div>
                      <p className="kpi-value">4</p>
                      <div className="kpi-trend" style={{ color: 'var(--admin-text-muted)' }}>
                        <span>Items need restocking</span>
                      </div>
                    </div>
                  </div>

                  {/* Sales Graph Mock */}
                  <div className="admin-chart-card">
                    <h3>Revenue Trends (Past 7 Days)</h3>
                    <div className="css-mock-chart">
                      {[40, 60, 45, 80, 55, 90, 75].map((val, idx) => (
                        <div key={idx} className="chart-bar" style={{ height: `${val}%` }} data-val={`₹${val * 1000}`}></div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                      <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                  </div>

                  {/* Recent Orders Table */}
                  <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Recent Orders</h3>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Product Details</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th>Payment</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingOrders ? (
                          <tr><td colSpan="7" style={{textAlign: 'center'}}>Loading live orders...</td></tr>
                        ) : orders.slice(0, 10).map(order => (
                          <tr key={order.id}>
                            <td style={{fontFamily: 'monospace', color: 'var(--admin-text-muted)'}}>#{order.id.split('-')[0].toUpperCase()}</td>
                            <td>
                              <div className="table-product-cell">
                                {order.image && <img src={order.image} alt="product" className="table-product-img" />}
                                <div>
                                  <div style={{ fontWeight: 500 }}>{order.product_name}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Qty: {order.qty}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{order.customer_name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{order.customer_mobile}</div>
                            </td>
                            <td style={{ color: 'var(--admin-text-muted)' }}>{new Date(order.created_at).toLocaleDateString('en-GB')}</td>
                            <td><span className="admin-badge badge-success">Paid</span></td>
                            <td>
                              <span className={`admin-badge ${order.status?.toLowerCase() === 'delivered' ? 'badge-success' : order.status?.toLowerCase() === 'processing' ? 'badge-warning' : 'badge-info'}`}>
                                {order.status || 'Processing'}
                              </span>
                            </td>
                            <td>
                              <button className="admin-btn admin-btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* === ORDERS TAB === */}
              {activeTab === 'orders' && (
                <div>
                  <div className="admin-page-header">
                    <div>
                      <h1>Order Fulfillment</h1>
                      <p>Manage and track all customer orders.</p>
                    </div>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Product Details</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingOrders ? (
                          <tr><td colSpan="5" style={{textAlign: 'center'}}>Loading live orders...</td></tr>
                        ) : orders.length === 0 ? (
                          <tr><td colSpan="5" style={{textAlign: 'center'}}>No orders found.</td></tr>
                        ) : (
                          orders.map(order => (
                            <tr key={order.id}>
                              <td style={{fontFamily: 'monospace', color: 'var(--admin-text-muted)'}}>#{order.id.split('-')[0].toUpperCase()}</td>
                              <td>
                                <div className="table-product-cell">
                                  {order.image && <img src={order.image} alt="product" className="table-product-img" />}
                                  <div>
                                    <div style={{ fontWeight: 500 }}>{order.product_name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Qty: {order.qty}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 500 }}>{order.customer_name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{order.city}</div>
                              </td>
                              <td style={{ color: 'var(--admin-text-muted)' }}>{new Date(order.created_at).toLocaleDateString('en-GB')}</td>
                              <td>
                                <select 
                                  className="admin-select"
                                  value={order.status ? order.status.toLowerCase() : 'processing'}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                  disabled={adminRole === 'viewer'}
                                  style={{ width: '150px' }}
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
                </div>
              )}

              {/* === INVENTORY TAB === */}
              {activeTab === 'inventory' && (
                <div>
                  <div className="admin-page-header">
                    <div>
                      <h1>Inventory Management</h1>
                      <p>Track stock levels across all your products.</p>
                    </div>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product / SKU</th>
                          <th>Batch No.</th>
                          <th>Stock Level</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingInventory ? (
                          <tr><td colSpan="4" style={{textAlign: 'center'}}>Loading inventory...</td></tr>
                        ) : inventoryList.length === 0 ? (
                          <tr><td colSpan="4" style={{textAlign: 'center'}}>No inventory found.</td></tr>
                        ) : (
                          inventoryList.map(item => (
                            <tr key={item.id}>
                              <td>
                                <div style={{ fontWeight: 500 }}>{item.product_name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>{item.sku}</div>
                              </td>
                              <td>{item.batch_no}</td>
                              <td style={{ fontWeight: 600 }}>{item.stock_level} units</td>
                              <td>
                                <span className={`admin-badge ${item.status === 'In Stock' ? 'badge-success' : item.status === 'Low Stock' ? 'badge-warning' : 'badge-error'}`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* === CATALOG / LISTINGS TAB === */}
              {activeTab === 'catalog' && (
                <div>
                  <div className="admin-page-header">
                    <div>
                      <h1>Product Catalog</h1>
                      <p>Manage your store listings, pricing, and stock.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="admin-btn admin-btn-secondary"><Upload size={18} /> Bulk Upload (CSV)</button>
                      <button className="admin-btn admin-btn-primary" onClick={() => setIsAddProductModalOpen(true)}><Plus size={18} /> Add New Listing</button>
                    </div>
                  </div>

                  <div className="admin-table-container">
                    <div className="admin-table-toolbar">
                      <div className="admin-search-container" style={{ width: '300px' }}>
                        <Search size={16} color="var(--admin-text-muted)" />
                        <input type="text" placeholder="Search products..." />
                      </div>
                      <div className="toolbar-filters">
                        <select className="admin-select" style={{ width: '150px' }}>
                          <option>All Categories</option>
                          <option>Whey Protein</option>
                          <option>Vitamins</option>
                        </select>
                        <select className="admin-select" style={{ width: '150px' }}>
                          <option>All Status</option>
                          <option>Active</option>
                          <option>Out of Stock</option>
                        </select>
                      </div>
                    </div>

                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>SKU</th>
                          <th>Category</th>
                          <th>MRP</th>
                          <th>Selling Price</th>
                          <th>Stock</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingProducts ? (
                          <tr><td colSpan="8" style={{textAlign: 'center'}}>Loading catalog...</td></tr>
                        ) : products.map(product => (
                          <tr key={product.id}>
                            <td>
                              <div className="table-product-cell">
                                <img src={(product.image_urls || product.images || [])[0] || 'https://via.placeholder.com/40'} alt="product" className="table-product-img" />
                                <div style={{ fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                              </div>
                            </td>
                            <td style={{ color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>{product.sku || 'N/A'}</td>
                            <td>{product.category || 'General'}</td>
                            <td style={{ color: 'var(--admin-text-muted)', textDecoration: 'line-through' }}>₹{(Number(product.price) * 1.2).toFixed(0)}</td>
                            <td style={{ fontWeight: 600 }}>₹{product.price}</td>
                            <td>
                              <span className={product.quantity > 10 ? 'text-green-500' : 'text-red-500'}>{product.quantity || 0} in stock</span>
                            </td>
                            <td>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={true} readOnly style={{ accentColor: 'var(--admin-accent)' }} /> Active
                              </label>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="header-icon-btn"><Edit size={18} /></button>
                                <button className="header-icon-btn" style={{ color: '#ef4444' }}><Trash2 size={18} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Add New Listing Modal */}
      <AnimatePresence>
        {isAddProductModalOpen && (
          <div className="admin-modal-overlay">
            <motion.div 
              className="admin-modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div className="admin-modal-header">
                <h2>Add New Product Listing</h2>
                <button className="header-icon-btn" onClick={() => setIsAddProductModalOpen(false)}>✕</button>
              </div>
              <div className="admin-modal-body">
                
                <h3 className="form-section-title">Basic Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Product Title *</label>
                    <input type="text" className="admin-input" placeholder="e.g. Premium 100% Whey Protein" />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select className="admin-select">
                      <option>Select Category...</option>
                      <option>Whey Protein</option>
                      <option>Vitamins & Supplements</option>
                      <option>Pre-Workout</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Brand</label>
                    <input type="text" className="admin-input" defaultValue="Pure Nutrix" />
                  </div>
                  <div className="form-group">
                    <label>SKU (Stock Keeping Unit)</label>
                    <input type="text" className="admin-input" placeholder="e.g. PN-WHEY-CHOC-2KG" />
                  </div>
                </div>

                <h3 className="form-section-title">Pricing & Stock</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Maximum Retail Price (MRP) (₹) *</label>
                    <input type="number" className="admin-input" placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Selling Price (₹) *</label>
                    <input type="number" className="admin-input" placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Tax / GST %</label>
                    <select className="admin-select">
                      <option>18% (Standard)</option>
                      <option>12%</option>
                      <option>5%</option>
                      <option>Exempt</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Available Quantity *</label>
                    <input type="number" className="admin-input" placeholder="0" />
                  </div>
                </div>

                <h3 className="form-section-title">Product Media</h3>
                <div className="drag-drop-zone">
                  <ImageIcon size={32} style={{ marginBottom: '10px' }} />
                  <p style={{ margin: '0 0 5px 0', fontWeight: 500, color: 'var(--admin-text)' }}>Drag and drop product images here</p>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>or click to browse files (JPEG, PNG, WebP up to 5MB)</p>
                </div>

                <h3 className="form-section-title">Product Details</h3>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>Full Description</label>
                  <textarea className="admin-textarea" rows="4" placeholder="Detailed product description..."></textarea>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nutritional Information</label>
                    <textarea className="admin-textarea" rows="3" placeholder="e.g. 24g Protein, 5.5g BCAAs per scoop..."></textarea>
                  </div>
                  <div className="form-group">
                    <label>Ingredients</label>
                    <textarea className="admin-textarea" rows="3" placeholder="Whey Protein Isolate, Cocoa Powder..."></textarea>
                  </div>
                </div>

                <h3 className="form-section-title">Shipping & Logistics</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Package Weight (kg)</label>
                    <input type="number" step="0.1" className="admin-input" placeholder="e.g. 2.5" />
                  </div>
                  <div className="form-group">
                    <label>Dimensions (L x W x H cm)</label>
                    <input type="text" className="admin-input" placeholder="e.g. 30 x 20 x 20" />
                  </div>
                </div>

              </div>
              <div className="admin-modal-footer">
                <button className="admin-btn admin-btn-secondary" onClick={() => setIsAddProductModalOpen(false)}>Cancel</button>
                <button className="admin-btn admin-btn-primary">Save Product Listing</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AdminDashboard;
