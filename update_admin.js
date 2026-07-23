const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'webapp/src/components/AdminDashboard.jsx');
const backupPath = path.join(__dirname, 'webapp/src/components/AdminDashboard.jsx.backup');

let content = fs.readFileSync(filePath, 'utf8');
const backup = fs.readFileSync(backupPath, 'utf8');

// 1. Add missing states and fetch functions
const stateInjectionPoint = "  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);";
const stateToAdd = `
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
`;

content = content.replace(stateInjectionPoint, stateInjectionPoint + "\n" + stateToAdd);

// 2. Update the useEffect
const useEffectInjectionPoint = `  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'orders') fetchOrders();
    if (activeTab === 'catalog') fetchProducts();
  }, [activeTab]);`;
  
const useEffectToAdd = `  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'orders') fetchOrders();
    if (activeTab === 'catalog') fetchProducts();
    if (activeTab === 'inventory') fetchInventory();
  }, [activeTab]);`;
  
content = content.replace(useEffectInjectionPoint, useEffectToAdd);

// 3. Add Orders and Inventory Tabs
const tabInjectionPoint = `              {/* === CATALOG / LISTINGS TAB === */}`;

const tabsToAdd = `              {/* === ORDERS TAB === */}
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
                                <span className={\`admin-badge \${item.status === 'In Stock' ? 'badge-success' : item.status === 'Low Stock' ? 'badge-warning' : 'badge-error'}\`}>
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

`;

content = content.replace(tabInjectionPoint, tabsToAdd + tabInjectionPoint);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated AdminDashboard.jsx with Orders and Inventory tabs');
