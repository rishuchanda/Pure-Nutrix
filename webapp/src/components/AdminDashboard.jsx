import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Package, Truck, BarChart2, ShieldCheck, Lock,
  Moon, Sun, LogOut, Search, ChevronRight, ShoppingBag, 
  Upload, Trash2, Image as ImageIcon, Bell, Settings, Edit,
  ArrowUpRight, ArrowDownRight, RefreshCcw, Plus, Save, Menu, X, MessageCircle, FileText, Star, Globe
} from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import CRMTab from './CRMTab';
import GSTModule from './GSTModule';
import ReviewsTab from './ReviewsTab';
import SEOTab from './SEOTab';
import './AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Security
  const [isAuthenticatedAdmin, setIsAuthenticatedAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Real data state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderFilter, setOrderFilter] = useState('pending');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Inventory State
  const [inventoryList, setInventoryList] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  // Customers State
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Modal State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [newProduct, setNewProduct] = useState({
    name: '', category: '', price: '', quantity: '', stock: '',
    sku: '', brand: 'Pure Nutrix', tax: '18%', 
    short_description: '', nutrient_content: '', composition: '',
    weight: '', dimensions: '', product_form: 'Capsules', original_price: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);

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

  // Fetch Data Functions
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
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
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoadingInventory(true);
      const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
      if (error) throw error;
      setInventoryList(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error.message);
    } finally {
      setLoadingInventory(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data: admins } = await supabase.from('admin_roles').select('id');
      const adminIds = (admins || []).map(a => a.id);

      const { data: usersData, error: usersError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (usersError) throw usersError;

      const filteredUsers = usersData.filter(u => !adminIds.includes(u.id));

      const { data: ordersData } = await supabase.from('orders').select('user_id, price, qty');
      const userLTV = {};
      if (ordersData) {
        ordersData.forEach(order => {
          if (order.user_id) userLTV[order.user_id] = (userLTV[order.user_id] || 0) + (order.price * order.qty);
        });
      }

      setUsersList(filteredUsers.map(u => ({ ...u, calculated_ltv: userLTV[u.id] || 0 })));
    } catch (error) {
      console.error('Error fetching users:', error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'orders' || activeTab === 'gst') fetchOrders();
    if (activeTab === 'catalog' || activeTab === 'gst') fetchProducts();
    if (activeTab === 'inventory') fetchInventory();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  // Handlers
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
      setLoginError(error.message || 'Login failed.'); alert('Login Failed: ' + (error.message || 'Login failed.'));
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    if (adminRole === 'viewer') return;
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

      // Send WhatsApp Notification for Shipped or Delivered statuses
      if (newStatus.toLowerCase() === 'shipped' || newStatus.toLowerCase() === 'delivered') {
        const order = orders.find(o => o.id === orderId);
        try {
          if (order && order.customer_mobile) {
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                phone_number: '91' + order.customer_mobile.replace(/[^0-9]/g, ''),
                type: 'template',
                template_name: 'order_update',
                template_components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: order.customer_name },
                      { type: "text", text: newStatus.toUpperCase() }
                    ]
                  }
                ]
              }
            });
          }
          
          // Send Email Notification
          if (order && order.customer_email) {
            await supabase.functions.invoke('send-email', {
              body: {
                to: order.customer_email,
                subject: `Order Update: ${newStatus.toUpperCase()}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #D4AF37;">Pure Nutrix Order Update</h2>
                    <p>Hi ${order.customer_name},</p>
                    <p>Your order status has been updated to: <strong>${newStatus.toUpperCase()}</strong>.</p>
                    <p>If you have any questions, please contact our support team.</p>
                    <p>Stay Healthy,<br/>The Pure Nutrix Team</p>
                  </div>
                `
              }
            });
          }
        } catch (commError) {
          console.error('Failed to send status update messages:', commError);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const updateInventoryStock = async (productId, newQuantity) => {
    if (adminRole === 'viewer') return;
    try {
      const qty = parseInt(newQuantity, 10);
      if (isNaN(qty)) return;
      const { error } = await supabase.from('products').update({ stock: qty }).eq('id', productId);
      if (error) throw error;
      setInventoryList(inventoryList.map(p => p.id === productId ? { ...p, stock: qty } : p));
    } catch (error) {
      alert('Failed to update stock');
    }
  };

  const handleEditProductClick = (product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name || '',
      category: product.category || '',
      price: product.price || '',
      quantity: product.quantity || '',
      sku: product.sku || '',
      brand: product.brand || 'Pure Nutrix',
      tax: product.tax || '18%',
      short_description: product.short_description || '',
      nutrient_content: product.nutrient_content || '',
      composition: product.composition || '',
      weight: product.weight || '',
      dimensions: product.dimensions || '',
      stock: product.stock || 0,
      product_form: product.product_form || 'Capsules',
      original_price: product.original_price || ''
    });
    setIsAddProductModalOpen(true);
  };

  const handleAddNewProductClick = () => {
    setEditingProduct(null);
    setNewProduct({
      name: '', category: '', price: '', quantity: '', stock: '', sku: '', brand: 'Pure Nutrix', tax: '18%', 
      short_description: '', nutrient_content: '', composition: '', weight: '', dimensions: '',
      product_form: 'Capsules', original_price: ''
    });
    setIsAddProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (adminRole === 'viewer') return;
    
    try {
      setUploadingImage(true);
      // In a real app we would upload the image to storage here.
      
      // Remove fields that do not exist in the database schema to prevent errors
      const { brand, sku, tax, weight, dimensions, ...validFields } = newProduct;

      const productPayload = {
        ...validFields,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        original_price: newProduct.original_price ? Number(newProduct.original_price) : null
      };

      if (editingProduct) {
        const { error } = await supabase.from('products').update(productPayload).eq('id', editingProduct.id);
        if (error) throw error;
        alert('Product updated successfully!');
      } else {
        const { error } = await supabase.from('products').insert(productPayload);
        if (error) throw error;
        alert('Product added successfully!');
      }

      setIsAddProductModalOpen(false);
      fetchProducts();
      if (activeTab === 'inventory') fetchInventory();

    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteProduct = async (id, name) => {
    if (adminRole === 'viewer') return;
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      fetchProducts();
    } catch (error) {
      alert('Failed to delete product.');
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
    { id: 'users', label: 'Registered Users', icon: Users },
    { id: 'crm', label: 'WhatsApp CRM', icon: MessageCircle },
    { id: 'gst', label: 'GST & Tax Module', icon: FileText },
    { id: 'reviews', label: 'Product Reviews & Ratings', icon: Star },
    { id: 'seo', label: 'Google SEO & Rankings', icon: Globe },
  ];

  if (adminRole === 'super_admin') {
    navItems.push({ id: 'settings', label: 'Settings & Security', icon: Settings });
  }

  // Calculations for KPIs
  const totalRevenue = orders.reduce((acc, order) => acc + (order.price || 0), 0);
  const activeOrders = orders.filter(o => o.status && o.status.toLowerCase() !== 'delivered').length;
  
  return (
    <div 
      className={`admin-dashboard-wrapper admin-theme-${theme}`}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {/* Standalone Fullscreen CRM Tab */}
      {activeTab === 'crm' && (
        <CRMTab onBack={() => setActiveTab('dashboard')} />
      )}

      {/* Standalone Fullscreen GST Tab */}
      {activeTab === 'gst' && (
        <GSTModule orders={orders} products={products} onBack={() => setActiveTab('dashboard')} />
      )}

      {/* Standard Admin Layout */}
      {activeTab !== 'crm' && activeTab !== 'gst' && (
        <>
          {/* Sidebar */}
          <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <h2>PURE <span className="gold-text">NUTRIX</span></h2>
          <button className="header-icon-btn hide-on-desktop" onClick={() => setMobileMenuOpen(false)} style={{ marginLeft: 'auto', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="admin-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="header-icon-btn hide-on-desktop mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="admin-search-container">
              <Search size={18} color="var(--admin-text-muted)" />
              <input type="text" placeholder="Search orders, SKUs..." />
            </div>
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
                    <div className="admin-kpi-card" onClick={() => setActiveTab('orders')} style={{ cursor: 'pointer' }}>
                      <div className="kpi-header">
                        <h3 className="kpi-title">Total Sales</h3>
                        <div className="kpi-icon"><ShoppingBag size={20} /></div>
                      </div>
                      <p className="kpi-value">{orders.length}</p>
                      <div className="kpi-trend trend-up">
                        <ArrowUpRight size={16} /> <span>12.5% vs last week</span>
                      </div>
                    </div>
                    <div className="admin-kpi-card" onClick={() => setActiveTab('orders')} style={{ cursor: 'pointer' }}>
                      <div className="kpi-header">
                        <h3 className="kpi-title">Active Orders</h3>
                        <div className="kpi-icon"><Truck size={20} /></div>
                      </div>
                      <p className="kpi-value">{activeOrders}</p>
                      <div className="kpi-trend trend-down">
                        <ArrowDownRight size={16} /> <span>2.1% vs last week</span>
                      </div>
                    </div>
                    <div className="admin-kpi-card" onClick={() => setActiveTab('orders')} style={{ cursor: 'pointer' }}>
                      <div className="kpi-header">
                        <h3 className="kpi-title">Total Revenue</h3>
                        <div className="kpi-icon"><BarChart2 size={20} /></div>
                      </div>
                      <p className="kpi-value">₹{(totalRevenue / 1000).toFixed(1)}k</p>
                      <div className="kpi-trend trend-up">
                        <ArrowUpRight size={16} /> <span>8.4% vs last week</span>
                      </div>
                    </div>
                    <div className="admin-kpi-card" onClick={() => setActiveTab('inventory')} style={{ cursor: 'pointer' }}>
                      <div className="kpi-header">
                        <h3 className="kpi-title">Low Stock Alerts</h3>
                        <div className="kpi-icon" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)' }}><Package size={20} /></div>
                      </div>
                      <p className="kpi-value">{inventoryList.filter(p => p.quantity < 10).length}</p>
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
                        </tr>
                      </thead>
                      <tbody>
                        {loadingOrders ? (
                          <tr><td colSpan="6" style={{textAlign: 'center'}}>Loading live orders...</td></tr>
                        ) : orders.slice(0, 10).map(order => (
                          <tr key={order.id} onClick={() => setActiveTab('orders')} style={{ cursor: 'pointer', transition: 'background 0.2s' }} className="hover-row">
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
                              <span className={`admin-badge ${(order.status || 'pending').toLowerCase() === 'delivered' ? 'badge-success' : (order.status || 'pending').toLowerCase() === 'pending' ? 'badge-error' : 'badge-info'}`}>
                                {(order.status || 'pending').toUpperCase()}
                              </span>
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
                      <p>Manage and track all customer orders through the fulfillment pipeline.</p>
                    </div>
                  </div>

                  <div className="order-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'].map(status => (
                      <button 
                        key={status}
                        onClick={() => setOrderFilter(status)}
                        className={`admin-btn ${orderFilter === status ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                        style={{ textTransform: 'capitalize', padding: '8px 16px' }}
                      >
                        {status.replace('_', ' ')} ({orders.filter(o => (o.status || 'pending').toLowerCase() === status).length})
                      </button>
                    ))}
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Product Details</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th>Status / Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingOrders ? (
                          <tr><td colSpan="5" style={{textAlign: 'center'}}>Loading live orders...</td></tr>
                        ) : orders.filter(o => (o.status || 'pending').toLowerCase() === orderFilter).length === 0 ? (
                          <tr><td colSpan="5" style={{textAlign: 'center'}}>No {orderFilter.replace('_', ' ')} orders found.</td></tr>
                        ) : (
                          orders.filter(o => (o.status || 'pending').toLowerCase() === orderFilter).map(order => (
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
                                {orderFilter === 'pending' && (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button className="admin-btn admin-btn-primary" onClick={() => updateOrderStatus(order.id, 'processing')} disabled={adminRole === 'viewer'} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                                      Accept & Process
                                    </button>
                                    <button className="admin-btn admin-btn-secondary" onClick={() => updateOrderStatus(order.id, 'cancelled')} disabled={adminRole === 'viewer'} style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#ef4444' }}>
                                      Cancel
                                    </button>
                                  </div>
                                )}
                                {orderFilter === 'processing' && (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button className="admin-btn admin-btn-primary" onClick={() => updateOrderStatus(order.id, 'shipped')} disabled={adminRole === 'viewer'} style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#3b82f6', borderColor: '#3b82f6' }}>
                                      Mark as Shipped
                                    </button>
                                    <button className="admin-btn admin-btn-secondary" onClick={() => updateOrderStatus(order.id, 'cancelled')} disabled={adminRole === 'viewer'} style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#ef4444' }}>
                                      Cancel
                                    </button>
                                  </div>
                                )}
                                {orderFilter === 'shipped' && (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button className="admin-btn admin-btn-primary" onClick={() => updateOrderStatus(order.id, 'out_for_delivery')} disabled={adminRole === 'viewer'} style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#f59e0b', borderColor: '#f59e0b' }}>
                                      Out for Delivery
                                    </button>
                                    <button className="admin-btn admin-btn-secondary" onClick={() => updateOrderStatus(order.id, 'returned')} disabled={adminRole === 'viewer'} style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#ef4444' }}>
                                      Return
                                    </button>
                                  </div>
                                )}
                                {orderFilter === 'out_for_delivery' && (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button className="admin-btn admin-btn-primary" onClick={() => updateOrderStatus(order.id, 'delivered')} disabled={adminRole === 'viewer'} style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#10b981', borderColor: '#10b981' }}>
                                      Mark as Delivered
                                    </button>
                                    <button className="admin-btn admin-btn-secondary" onClick={() => updateOrderStatus(order.id, 'returned')} disabled={adminRole === 'viewer'} style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#ef4444' }}>
                                      Return
                                    </button>
                                  </div>
                                )}
                                {orderFilter === 'delivered' && (
                                  <span className="admin-badge badge-success">Completed</span>
                                )}
                                {orderFilter === 'cancelled' && (
                                  <span className="admin-badge badge-error">Cancelled</span>
                                )}
                                {orderFilter === 'returned' && (
                                  <span className="admin-badge badge-warning" style={{ background: '#ffedd5', color: '#ea580c' }}>Returned</span>
                                )}
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
                      <p>Track stock levels and easily update quantities inline.</p>
                    </div>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product / SKU</th>
                          <th>Status</th>
                          <th>Stock Level</th>
                          <th>Quick Update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingInventory ? (
                          <tr><td colSpan="4" style={{textAlign: 'center'}}>Loading inventory...</td></tr>
                        ) : inventoryList.length === 0 ? (
                          <tr><td colSpan="4" style={{textAlign: 'center'}}>No inventory found.</td></tr>
                        ) : (
                          inventoryList.map(item => {
                            const stockLevel = item.stock || 0;
                            const status = stockLevel <= 0 ? 'Out of Stock' : (stockLevel < 10 ? 'Low Stock' : 'In Stock');
                            return (
                              <tr key={item.id}>
                                <td>
                                  <div style={{ fontWeight: 500 }}>{item.name}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>{item.sku || 'N/A'}</div>
                                </td>
                                <td>
                                  <span className={`admin-badge ${status === 'In Stock' ? 'badge-success' : status === 'Low Stock' ? 'badge-warning' : 'badge-error'}`}>
                                    {status}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600 }}>{stockLevel} units</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                      type="number" 
                                      className="admin-input" 
                                      style={{ width: '80px', padding: '6px 10px' }} 
                                      defaultValue={stockLevel}
                                      id={`stock-input-${item.id}`}
                                    />
                                    <button 
                                      className="admin-btn admin-btn-primary" 
                                      style={{ padding: '6px 12px' }}
                                      onClick={() => {
                                        const newVal = document.getElementById(`stock-input-${item.id}`).value;
                                        updateInventoryStock(item.id, newVal);
                                      }}
                                    >
                                      <Save size={16} /> Update
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* === CRM TAB MOVED TO FULLSCREEN === */}

              {/* === USERS / CUSTOMERS TAB === */}
              {activeTab === 'users' && (
                <div>
                  <div className="admin-page-header">
                    <div>
                      <h1>Customer Management</h1>
                      <p>View registered customers and their lifetime value.</p>
                    </div>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Registered</th>
                          <th>Lifetime Value (LTV)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingUsers ? (
                          <tr><td colSpan="4" style={{textAlign: 'center'}}>Loading users...</td></tr>
                        ) : usersList.length === 0 ? (
                          <tr><td colSpan="4" style={{textAlign: 'center'}}>No users found.</td></tr>
                        ) : (
                          usersList.map(u => (
                            <tr key={u.id}>
                              <td style={{ fontWeight: 500 }}>{u.full_name || 'Anonymous User'}</td>
                              <td style={{ color: 'var(--admin-text-muted)' }}>{u.email}</td>
                              <td style={{ color: 'var(--admin-text-muted)' }}>{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                              <td style={{ fontWeight: 600 }}>₹{(u.calculated_ltv || 0).toLocaleString()}</td>
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
                      <button className="admin-btn admin-btn-primary" onClick={handleAddNewProductClick}><Plus size={18} /> Add New Listing</button>
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
                            <td style={{ color: 'var(--admin-text-muted)', textDecoration: 'line-through' }}>₹{product.original_price || (Number(product.price) * 1.2).toFixed(0)}</td>
                            <td style={{ fontWeight: 600 }}>₹{product.price}</td>
                            <td>
                              <span className={`admin-badge ${(product.stock || 0) > 10 ? 'badge-success' : (product.stock || 0) > 0 ? 'badge-warning' : 'badge-error'}`}>
                                {product.stock || 0} left
                              </span>
                              <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--admin-text-muted)' }}>
                                {product.quantity || 0} per unit
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="header-icon-btn" onClick={() => handleEditProductClick(product)}><Edit size={18} /></button>
                                <button className="header-icon-btn" style={{ color: '#ef4444' }} onClick={() => deleteProduct(product.id, product.name)}><Trash2 size={18} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* === REVIEWS & RATINGS MODERATION TAB === */}
              {activeTab === 'reviews' && (
                <ReviewsTab showNotification={(msg) => alert(msg)} />
              )}

              {/* === GOOGLE SEO & RANKINGS TAB === */}
              {activeTab === 'seo' && (
                <SEOTab showNotification={(msg) => alert(msg)} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Add / Edit Listing Modal */}
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
                <h2>{editingProduct ? 'Edit Product Listing' : 'Add New Product Listing'}</h2>
                <button className="header-icon-btn" onClick={() => setIsAddProductModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveProduct} className="admin-modal-body">
                
                <h3 className="form-section-title">Basic Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Product Title *</label>
                    <input type="text" required className="admin-input" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. Premium 100% Whey Protein" />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <input type="text" required className="admin-input" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} placeholder="e.g. Whey Protein" />
                  </div>
                  <div className="form-group">
                    <label>Brand</label>
                    <input type="text" className="admin-input" value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>SKU (Stock Keeping Unit)</label>
                    <input type="text" className="admin-input" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} placeholder="e.g. PN-WHEY-CHOC-2KG" />
                  </div>
                </div>

                <h3 className="form-section-title">Product Format</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Number of Capsules / Tablets / Pack Size</label>
                    <input type="text" className="admin-input" value={newProduct.quantity} onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} placeholder="e.g. 30, 60, 500g" />
                  </div>
                  <div className="form-group">
                    <label>Form (e.g. Capsules, Powder)</label>
                    <input type="text" className="admin-input" value={newProduct.product_form} onChange={(e) => setNewProduct({...newProduct, product_form: e.target.value})} placeholder="Capsules" />
                  </div>
                </div>

                <h3 className="form-section-title">Pricing & Stock</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Maximum Retail Price (MRP) (₹)</label>
                    <input type="number" className="admin-input" placeholder="e.g. 599" value={newProduct.original_price} onChange={(e) => setNewProduct({...newProduct, original_price: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Selling Price (₹) *</label>
                    <input type="number" required className="admin-input" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Tax / GST %</label>
                    <select className="admin-select" value={newProduct.tax} onChange={(e) => setNewProduct({...newProduct, tax: e.target.value})}>
                      <option>18% (Standard)</option>
                      <option>12%</option>
                      <option>5%</option>
                      <option>Exempt</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Inventory Stock *</label>
                    <input type="number" required className="admin-input" value={newProduct.stock} onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} placeholder="0" />
                  </div>
                </div>

                <h3 className="form-section-title">Product Details</h3>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>Full Description</label>
                  <textarea className="admin-textarea" rows="4" value={newProduct.short_description} onChange={(e) => setNewProduct({...newProduct, short_description: e.target.value})} placeholder="Detailed product description..."></textarea>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nutritional Information</label>
                    <textarea className="admin-textarea" rows="3" value={newProduct.nutrient_content} onChange={(e) => setNewProduct({...newProduct, nutrient_content: e.target.value})} placeholder="e.g. 24g Protein, 5.5g BCAAs per scoop..."></textarea>
                  </div>
                  <div className="form-group">
                    <label>Ingredients</label>
                    <textarea className="admin-textarea" rows="3" value={newProduct.composition} onChange={(e) => setNewProduct({...newProduct, composition: e.target.value})} placeholder="Whey Protein Isolate, Cocoa Powder..."></textarea>
                  </div>
                </div>

                <div className="admin-modal-footer" style={{ border: 'none', padding: '20px 0 0 0', marginTop: '20px' }}>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setIsAddProductModalOpen(false)}>Cancel</button>
                  <button type="submit" className="admin-btn admin-btn-primary" disabled={uploadingImage}>
                    {uploadingImage ? 'Saving...' : (editingProduct ? 'Save Changes' : 'Save Product Listing')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
