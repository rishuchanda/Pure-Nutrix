import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Package, Truck, FileText, BarChart2, ShieldCheck, Lock,
  Moon, Sun, LogOut, Search, ChevronRight, ShoppingBag, Upload, Trash2, Image as ImageIcon
} from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import './AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('orders');
  const [theme, setTheme] = useState('dark');
  
  // Security
  const [isAuthenticatedAdmin, setIsAuthenticatedAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState(null); // 'super_admin', 'editor', 'viewer'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
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
  
  // Real data state for Orders
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Real data state for Users
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Real data state for Inventory
  const [inventoryList, setInventoryList] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  // Admin Management State
  const [adminsList, setAdminsList] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('editor');

  // Products Management State
  const [adminProductsList, setAdminProductsList] = useState([]);
  const [loadingAdminProducts, setLoadingAdminProducts] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  
  const [newProduct, setNewProduct] = useState({
    name: '', category: '', price: '', product_form: '', quantity: '',
    product_type: '', composition: '', pack_of: 1, usage_instructions: '',
    nutrient_content: '', short_description: ''
  });
  const [newProductImage, setNewProductImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      
      // Get all admin IDs so we can exclude them
      const { data: admins } = await supabase.from('admin_roles').select('id');
      const adminIds = (admins || []).map(a => a.id);

      const query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      const { data: usersData, error: usersError } = await query;
      if (usersError) throw usersError;

      // Filter out anyone who is an admin
      const filteredUsers = usersData.filter(u => !adminIds.includes(u.id));

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, price, qty');
      if (ordersError) throw ordersError;

      const userLTV = {};
      if (ordersData) {
        ordersData.forEach(order => {
          if (order.user_id) {
            userLTV[order.user_id] = (userLTV[order.user_id] || 0) + (order.price * order.qty);
          }
        });
      }

      const usersWithLTV = (filteredUsers || []).map(u => ({
        ...u,
        calculated_ltv: userLTV[u.id] || 0
      }));

      setUsersList(usersWithLTV);
    } catch (error) {
      console.error('Error fetching users:', error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoadingInventory(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('product_name', { ascending: true });
      if (error) throw error;
      setInventoryList(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error.message);
    } finally {
      setLoadingInventory(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAdminsList(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error.message);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const fetchAdminProducts = async () => {
    try {
      setLoadingAdminProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAdminProductsList(data || []);
    } catch (error) {
      console.error('Error fetching admin products:', error.message);
    } finally {
      setLoadingAdminProducts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'inventory') fetchInventory();
    if (activeTab === 'security') fetchAdmins();
    if (activeTab === 'products') fetchAdminProducts();
  }, [activeTab]);

  // View Profile Modal State
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [selectedUserOrders, setSelectedUserOrders] = useState([]);
  const [loadingUserProfile, setLoadingUserProfile] = useState(false);

  const handleViewProfile = async (userProfile) => {
    setSelectedUserProfile(userProfile);
    setLoadingUserProfile(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSelectedUserOrders(data || []);
    } catch (err) {
      console.error('Error fetching user orders:', err);
    } finally {
      setLoadingUserProfile(false);
    }
  };

  const closeProfileModal = () => {
    setSelectedUserProfile(null);
    setSelectedUserOrders([]);
  };

  // Grant Admin Access
  const grantAdminAccess = async (e) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword) return;
    
    // Create a temporary, unauthenticated Supabase client so it doesn't log the owner out
    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    try {
      // 1. Sign up the new user directly
      const { data: authData, error: signUpError } = await tempClient.auth.signUp({
        email: newAdminEmail.trim(),
        password: newAdminPassword
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          alert('User is already registered. If they are a customer, we cannot convert them to an admin directly using this form. Please use a fresh email.');
          return;
        }
        throw signUpError;
      }

      if (!authData.user) throw new Error("Could not create user.");

      // 2. Insert into admin_roles
      const { error: roleError } = await supabase
        .from('admin_roles')
        .insert({
          id: authData.user.id,
          email: newAdminEmail.trim(),
          role: newAdminRole
        });
        
      if (roleError) throw roleError;
      
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminRole('editor');
      fetchAdmins();
      alert(`Successfully created admin account for ${authData.user.email}! They have been sent a confirmation email.`);
    } catch (error) {
      console.error('Error granting access:', error.message);
      alert('Failed to grant admin access: ' + error.message);
    }
  };

  // Revoke Admin Access
  const revokeAdminAccess = async (userId, userEmail) => {
    if (userId === user.id) {
      alert("You cannot revoke your own admin access.");
      return;
    }
    if (!window.confirm(`Are you sure you want to completely delete the admin account for ${userEmail}?`)) return;
    
    try {
      const { error } = await supabase.rpc('delete_user', { target_user_id: userId });
      
      if (error) throw error;
      fetchAdmins();
    } catch (error) {
      console.error('Error revoking access:', error.message);
      alert('Failed to revoke admin access.');
    }
  };

  // Delete Customer
  const deleteCustomer = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to completely delete the user account for ${userName}? This action cannot be undone.`)) return;
    
    try {
      const { error } = await supabase.rpc('delete_user', { target_user_id: userId });
      
      if (error) throw error;
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error('Error deleting user:', error.message);
      alert('Failed to delete user.');
    }
  };

  // Update real order status
  const updateOrderStatus = async (orderId, newStatus) => {
    if (adminRole === 'viewer') return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
        
      if (error) throw error;
      
      // Update local state to reflect change instantly
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

      // Trigger Push Notification via Edge Function
      const order = orders.find(o => o.id === orderId);
      if (order && order.user_id) {
        // Fetch subscription for this user
        const { data: subData } = await supabase
          .from('push_subscriptions')
          .select('subscription')
          .eq('user_id', order.user_id)
          .single();

        if (subData && subData.subscription) {
          await supabase.functions.invoke('send-notification', {
            body: {
              subscription: subData.subscription,
              payload: {
                title: 'Order Status Update',
                body: `Your order for ${order.product_name} is now ${newStatus.replace(/_/g, ' ').toUpperCase()}.`
              }
            }
          });
        }
      }

    } catch (error) {
      console.error('Error updating status:', error.message);
      alert('Failed to update status');
    }
  };

  const updateUserSegment = async (userId, newSegment) => {
    if (adminRole === 'viewer') return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ segment: newSegment })
        .eq('id', userId);
      if (error) throw error;
      setUsersList(usersList.map(u => u.id === userId ? { ...u, segment: newSegment } : u));
    } catch (error) {
      console.error('Error updating segment:', error.message);
      alert('Failed to update segment');
    }
  };

  const updateInventoryStock = async (itemId, newStock) => {
    if (adminRole === 'viewer') return;
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ 
          stock_level: newStock, 
          status: newStock <= 0 ? 'Out of Stock' : newStock < 20 ? 'Low Stock' : 'In Stock' 
        })
        .eq('id', itemId);
      if (error) throw error;
      setInventoryList(inventoryList.map(i => i.id === itemId ? { 
        ...i, 
        stock_level: newStock,
        status: newStock <= 0 ? 'Out of Stock' : newStock < 20 ? 'Low Stock' : 'In Stock'
      } : i));
    } catch (error) {
      console.error('Error updating stock:', error.message);
      alert('Failed to update stock');
    }
  };

  const handleProductImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewProductImage(file);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (adminRole === 'viewer') return;
    
    try {
      setUploadingImage(true);
      let imageUrls = [];

      // 1. Upload Image to Supabase Storage if present
      if (newProductImage) {
        const fileExt = newProductImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('product-images')
          .upload(filePath, newProductImage);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
          
        imageUrls = [publicUrlData.publicUrl];
      }

      // 2. Insert Product into DB
      const { error: insertError } = await supabase
        .from('products')
        .insert({
          ...newProduct,
          price: Number(newProduct.price),
          pack_of: Number(newProduct.pack_of),
          image_urls: imageUrls
        });

      if (insertError) throw insertError;

      alert('Product listed successfully!');
      setIsAddingProduct(false);
      setNewProductImage(null);
      setNewProduct({
        name: '', category: '', price: '', product_form: '', quantity: '',
        product_type: '', composition: '', pack_of: 1, usage_instructions: '',
        nutrient_content: '', short_description: ''
      });
      fetchAdminProducts();

    } catch (error) {
      console.error('Error saving product:', error.message);
      alert('Failed to list product: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteAdminProduct = async (id, name) => {
    if (adminRole === 'viewer') return;
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      fetchAdminProducts();
    } catch (error) {
      console.error('Error deleting product:', error.message);
      alert('Failed to delete product.');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
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
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin Email"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${loginError ? '#ef4444' : 'var(--admin-border)'}`,
                background: 'var(--admin-bg)',
                color: 'var(--admin-text)',
                marginBottom: '15px',
                fontSize: '1rem'
              }}
              autoFocus
            />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${loginError ? '#ef4444' : 'var(--admin-border)'}`,
                background: 'var(--admin-bg)',
                color: 'var(--admin-text)',
                marginBottom: '20px',
                fontSize: '1rem'
              }}
            />
            {loginError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '-10px', marginBottom: '15px' }}>{loginError}</p>}
            <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Unlock Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'analytics', label: 'Advanced Analytics', icon: BarChart2 },
    { id: 'orders', label: 'Order Fulfillment', icon: Truck },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'inventory', label: 'Inventory & Supply', icon: Package },
    { id: 'products', label: 'Product Listing', icon: ShoppingBag },
    { id: 'invoicing', label: 'Automated Invoicing', icon: FileText },
    { id: 'compliance', label: 'Regulatory Compliance', icon: ShieldCheck }
  ];

  if (adminRole === 'super_admin') {
    navItems.push({ id: 'security', label: 'Security & Access', icon: Lock });
  }

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
          <button className="admin-nav-item" onClick={async () => {
            await supabase.auth.signOut();
            setIsAuthenticatedAdmin(false);
          }}>
            <LogOut size={18} />
            Logout
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
                              disabled={adminRole === 'viewer'}
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

            {/* MODULE: User Management */}
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
                    {loadingUsers ? (
                      <tr><td colSpan="5" style={{textAlign: 'center'}}>Loading users...</td></tr>
                    ) : usersList.length === 0 ? (
                      <tr><td colSpan="5" style={{textAlign: 'center'}}>No users found.</td></tr>
                    ) : (
                      usersList.map(u => (
                        <tr key={u.id}>
                          <td>{u.full_name || 'Anonymous User'}</td>
                          <td>{u.email}</td>
                          <td>
                            <select 
                              className="status-select"
                              value={u.segment}
                              onChange={(e) => updateUserSegment(u.id, e.target.value)}
                              disabled={adminRole === 'viewer'}
                            >
                              <option value="Regular">Regular</option>
                              <option value="VIP Customer">VIP Customer</option>
                              <option value="Wholesale">Wholesale</option>
                            </select>
                          </td>
                          <td>₹{(u.calculated_ltv || 0).toLocaleString()}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="admin-btn admin-btn-outline" onClick={() => handleViewProfile(u)}>View Profile</button>
                              {adminRole === 'super_admin' && (
                                <button 
                                  className="admin-btn admin-btn-outline" 
                                  style={{ borderColor: '#ef4444', color: '#ef4444' }}
                                  onClick={() => deleteCustomer(u.id, u.full_name || u.email)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* MODULE: Inventory */}
            {activeTab === 'inventory' && (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product / SKU</th>
                      <th>Batch No.</th>
                      <th>Stock Level</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingInventory ? (
                      <tr><td colSpan="5" style={{textAlign: 'center'}}>Loading inventory...</td></tr>
                    ) : inventoryList.length === 0 ? (
                      <tr><td colSpan="5" style={{textAlign: 'center'}}>No inventory found.</td></tr>
                    ) : (
                      inventoryList.map(item => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.product_name}</strong><br/>
                            <span style={{fontSize: '0.8rem', color: 'var(--admin-text-muted)'}}>{item.sku}</span>
                          </td>
                          <td>{item.batch_no}</td>
                          <td>{item.stock_level} units</td>
                          <td>
                            <span className={`admin-badge ${item.status === 'In Stock' ? 'badge-success' : item.status === 'Low Stock' ? 'badge-warning' : 'badge-error'}`}>
                              {item.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="admin-btn admin-btn-outline" 
                                onClick={() => updateInventoryStock(item.id, Math.max(0, item.stock_level - 10))}
                                disabled={adminRole === 'viewer'}
                              >-10</button>
                              <button 
                                className="admin-btn admin-btn-outline" 
                                onClick={() => updateInventoryStock(item.id, item.stock_level + 10)}
                                disabled={adminRole === 'viewer'}
                              >+10</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* MODULE: Product Listing (REAL connected to Supabase) */}
            {activeTab === 'products' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0 }}>Product Management</h2>
                  {!isAddingProduct && (
                    <button 
                      className="admin-btn admin-btn-primary" 
                      onClick={() => setIsAddingProduct(true)}
                      disabled={adminRole === 'viewer'}
                    >
                      + Add New Product
                    </button>
                  )}
                </div>

                {isAddingProduct ? (
                  <div className="admin-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 className="admin-card-title" style={{ margin: 0 }}>List New Product</h3>
                      <button className="admin-btn admin-btn-outline" onClick={() => setIsAddingProduct(false)}>Cancel</button>
                    </div>
                    
                    <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--admin-text-muted)' }}>Product Name *</label>
                          <input type="text" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="admin-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--admin-text-muted)' }}>Price (₹) *</label>
                          <input type="number" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="admin-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--admin-text-muted)' }}>Category (e.g., RADIANCE CAPSULES)</label>
                          <input type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="admin-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--admin-text-muted)' }}>Product Form (e.g., Capsule, Serum)</label>
                          <input type="text" value={newProduct.product_form} onChange={e => setNewProduct({...newProduct, product_form: e.target.value})} className="admin-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--admin-text-muted)' }}>Quantity (e.g., 30 Capsules)</label>
                          <input type="text" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} className="admin-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--admin-text-muted)' }}>Product Type (e.g., Hair supplement)</label>
                          <input type="text" value={newProduct.product_type} onChange={e => setNewProduct({...newProduct, product_type: e.target.value})} className="admin-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--admin-text-muted)' }}>Pack Of</label>
                          <input type="number" value={newProduct.pack_of} onChange={e => setNewProduct({...newProduct, pack_of: e.target.value})} className="admin-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--admin-text-muted)' }}>Composition / Ingredients</label>
                        <input type="text" value={newProduct.composition} onChange={e => setNewProduct({...newProduct, composition: e.target.value})} className="admin-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--admin-text-muted)' }}>Nutrient Content (Detailed)</label>
                        <textarea value={newProduct.nutrient_content} onChange={e => setNewProduct({...newProduct, nutrient_content: e.target.value})} className="admin-input" rows="2" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)', resize: 'vertical' }}></textarea>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--admin-text-muted)' }}>Usage Instructions</label>
                        <textarea value={newProduct.usage_instructions} onChange={e => setNewProduct({...newProduct, usage_instructions: e.target.value})} className="admin-input" rows="2" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)', resize: 'vertical' }}></textarea>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--admin-text-muted)' }}>Short Description</label>
                        <textarea value={newProduct.short_description} onChange={e => setNewProduct({...newProduct, short_description: e.target.value})} className="admin-input" rows="2" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)', resize: 'vertical' }}></textarea>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--admin-text-muted)' }}>Product Image *</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <label className="admin-btn admin-btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Upload size={16} /> Choose Image
                            <input type="file" accept="image/*" onChange={handleProductImageUpload} style={{ display: 'none' }} />
                          </label>
                          {newProductImage && <span style={{ color: 'var(--admin-accent)' }}>{newProductImage.name}</span>}
                        </div>
                      </div>

                      <div style={{ marginTop: '10px', paddingTop: '15px', borderTop: '1px solid var(--admin-border)' }}>
                        <button type="submit" className="admin-btn admin-btn-primary" disabled={uploadingImage} style={{ width: '100%', justifyContent: 'center' }}>
                          {uploadingImage ? 'Saving & Uploading...' : 'Save Product & List on Website'}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Product Name</th>
                          <th>Price</th>
                          <th>Category</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingAdminProducts ? (
                          <tr><td colSpan="5" style={{textAlign: 'center'}}>Loading products...</td></tr>
                        ) : adminProductsList.length === 0 ? (
                          <tr><td colSpan="5" style={{textAlign: 'center'}}>No products listed yet.</td></tr>
                        ) : (
                          adminProductsList.map(prod => (
                            <tr key={prod.id}>
                              <td>
                                {prod.image_urls && prod.image_urls.length > 0 ? (
                                  <img src={prod.image_urls[0]} alt={prod.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                ) : (
                                  <div style={{ width: '40px', height: '40px', background: 'var(--admin-border)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={16} color="var(--admin-text-muted)"/></div>
                                )}
                              </td>
                              <td><strong>{prod.name}</strong></td>
                              <td>₹{prod.price}</td>
                              <td>{prod.category}</td>
                              <td>
                                <button 
                                  className="admin-btn admin-btn-outline" 
                                  onClick={() => deleteAdminProduct(prod.id, prod.name)}
                                  disabled={adminRole === 'viewer'}
                                  style={{ color: adminRole === 'viewer' ? 'var(--admin-text-muted)' : '#ef4444', borderColor: adminRole === 'viewer' ? 'var(--admin-border)' : '#ef4444', padding: '6px 10px' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
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

            {/* MODULE: Security (REAL connected to Supabase) */}
            {activeTab === 'security' && (
              <div>
                <div className="admin-card" style={{ marginBottom: '20px' }}>
                  <h3 className="admin-card-title">Create Admin Account</h3>
                  <p style={{ color: 'var(--admin-text-muted)', marginBottom: '15px' }}>
                    Create a dedicated admin account. This is completely separate from customer accounts.
                  </p>
                  <form onSubmit={grantAdminAccess} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input 
                      type="email" 
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="employee@purenutrix.com"
                      required
                      style={{
                        flex: '1 1 200px',
                        padding: '10px 15px',
                        borderRadius: '6px',
                        border: '1px solid var(--admin-border)',
                        background: 'var(--admin-bg)',
                        color: 'var(--admin-text)'
                      }}
                    />
                    <input 
                      type="password" 
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="Temporary Password"
                      required
                      minLength={6}
                      style={{
                        flex: '1 1 200px',
                        padding: '10px 15px',
                        borderRadius: '6px',
                        border: '1px solid var(--admin-border)',
                        background: 'var(--admin-bg)',
                        color: 'var(--admin-text)'
                      }}
                    />
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value)}
                      style={{
                        padding: '10px 15px',
                        borderRadius: '6px',
                        border: '1px solid var(--admin-border)',
                        background: 'var(--admin-bg)',
                        color: 'var(--admin-text)'
                      }}
                    >
                      <option value="editor">Editor (Orders/Inventory)</option>
                      <option value="viewer">Viewer (Read Only)</option>
                      <option value="super_admin">Super Admin (Full Access)</option>
                    </select>
                    <button type="submit" className="admin-btn admin-btn-primary">Create Admin</button>
                  </form>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingAdmins ? (
                        <tr><td colSpan="4" style={{textAlign: 'center'}}>Loading administrators...</td></tr>
                      ) : adminsList.length === 0 ? (
                        <tr><td colSpan="4" style={{textAlign: 'center'}}>No administrators found.</td></tr>
                      ) : (
                        adminsList.map(adminUser => (
                          <tr key={adminUser.id}>
                            <td><strong>Admin User</strong> {adminUser.id === user.id && <span style={{fontSize: '0.8rem', color: 'var(--admin-accent)', marginLeft: '5px'}}>(You)</span>}</td>
                            <td>{adminUser.email}</td>
                            <td>
                              <span className={`admin-badge ${adminUser.role === 'super_admin' ? 'badge-error' : adminUser.role === 'editor' ? 'badge-warning' : 'badge-success'}`}>
                                {adminUser.role === 'super_admin' ? 'Super Admin' : adminUser.role === 'editor' ? 'Editor' : 'Viewer'}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="admin-btn admin-btn-outline" 
                                onClick={() => revokeAdminAccess(adminUser.id, adminUser.email)}
                                disabled={adminUser.id === user.id}
                                style={{ borderColor: adminUser.id === user.id ? 'transparent' : '#ef4444', color: adminUser.id === user.id ? 'var(--admin-text-muted)' : '#ef4444' }}
                              >
                                Delete Account
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* View Profile Modal */}
        <AnimatePresence>
          {selectedUserProfile && (
            <motion.div 
              className="admin-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeProfileModal}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', 
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              <motion.div 
                className="admin-card"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0 }}>User Profile</h2>
                  <button onClick={closeProfileModal} style={{ background: 'transparent', border: 'none', color: 'var(--admin-text)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                  <div>
                    <p style={{ margin: 0, color: 'var(--admin-text-muted)' }}>Name</p>
                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>{selectedUserProfile.full_name || 'Anonymous User'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: 'var(--admin-text-muted)' }}>Email</p>
                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>{selectedUserProfile.email}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: 'var(--admin-text-muted)' }}>Segment</p>
                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      <span className="admin-badge badge-warning">{selectedUserProfile.segment}</span>
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: 'var(--admin-text-muted)' }}>Lifetime Value</p>
                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: 'var(--admin-accent)', fontSize: '1.1rem' }}>₹{(selectedUserProfile.calculated_ltv || 0).toLocaleString()}</p>
                  </div>
                </div>

                <h3 style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px', marginBottom: '15px' }}>Order History</h3>
                
                {loadingUserProfile ? (
                  <p style={{ textAlign: 'center', padding: '20px 0' }}>Loading orders...</p>
                ) : selectedUserOrders.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--admin-text-muted)', padding: '20px 0' }}>No orders found for this user.</p>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Product</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUserOrders.map(order => (
                          <tr key={order.id}>
                            <td style={{fontFamily: 'monospace', fontSize: '0.9rem'}}>{order.id.split('-')[0]}</td>
                            <td>{order.product_name} <span style={{color: 'var(--admin-text-muted)', fontSize: '0.8rem'}}>x{order.qty}</span></td>
                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                            <td>
                              <span className={`admin-badge ${order.status === 'delivered' ? 'badge-success' : 'badge-warning'}`}>
                                {order.status.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </td>
                            <td style={{fontWeight: 'bold'}}>₹{(order.price * order.qty).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AdminDashboard;
