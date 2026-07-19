import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, ShoppingBag } from 'lucide-react';
import './CartPage.css';

const CartPage = ({ cartItems, onUpdateQuantity, onRemoveItem, onCheckout, onBack }) => {
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => {
    const price = typeof item.product.price === 'number' ? item.product.price : Number(item.product.price.toString().replace(/[^0-9.-]+/g, ""));
    return acc + (price * item.quantity);
  }, 0);

  return (
    <div className="cart-page-wrapper section-padding">
      <div className="container">
        <div className="cart-header">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={20} /> Continue Shopping
          </button>
          <h1 className="cart-title">Your <span className="text-gold">Cart</span></h1>
        </div>

        {cartItems.length === 0 ? (
          <motion.div 
            className="empty-cart glass-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ShoppingBag size={64} className="text-gold" style={{ margin: '0 auto 20px', display: 'block' }} />
            <h2 className="empty-cart-title">Your cart is empty</h2>
            <p>Looks like you haven't added anything to your cart yet.</p>
            <button className="btn-primary" onClick={onBack} style={{ marginTop: '30px' }}>
              Start Shopping
            </button>
          </motion.div>
        ) : (
          <div className="cart-grid">
            <div className="cart-items-section">
              {cartItems.map((item) => {
                const basePrice = typeof item.product.price === 'number' ? item.product.price : Number(item.product.price.toString().replace(/[^0-9.-]+/g, ""));
                return (
                  <React.Fragment key={item.product.id}>
                    <motion.div 
                      className="cart-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <img src={(item.product.image_urls || item.product.images || [])[0]} alt={item.product.name} className="cart-item-image" />
                      <div className="cart-item-details">
                        <h3 className="cart-item-title">{item.product.name}</h3>
                        <p className="cart-item-price">₹{basePrice}</p>
                        <div className="cart-item-actions">
                          <div className="qty-selector" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button className="qty-btn" onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))}>-</button>
                            <span>{item.quantity}</span>
                            <button className="qty-btn" onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}>+</button>
                          </div>
                          <button className="remove-btn" onClick={() => onRemoveItem(item.product.id)}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="cart-item-total" style={{ fontWeight: 600, fontSize: '1.2rem' }}>
                        ₹{basePrice * item.quantity}
                      </div>
                    </motion.div>

                    {/* BOGO Free Item */}
                    <motion.div 
                      className="cart-item free-gift-item"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{ marginTop: '-15px', borderTop: 'none', background: 'rgba(5, 150, 105, 0.05)' }}
                    >
                      <div className="free-gift-badge" style={{ background: '#059669' }}>Buy 1 Get 1 FREE</div>
                      <img src={(item.product.image_urls || item.product.images || [])[0]} alt={item.product.name} className="cart-item-image" style={{ filter: 'grayscale(20%)', opacity: 0.9 }} />
                      <div className="cart-item-details">
                        <h3 className="cart-item-title text-emerald" style={{ color: '#059669' }}>{item.product.name} (Free)</h3>
                        <p className="cart-item-price" style={{ textDecoration: 'line-through', color: '#888' }}>₹{basePrice}</p>
                        <p className="cart-item-price text-emerald" style={{ color: '#059669', marginTop: '-5px', fontWeight: 'bold' }}>₹0</p>
                        <div className="cart-item-actions">
                          <span style={{ padding: '4px 12px', background: 'rgba(0,0,0,0.05)', borderRadius: '20px', fontSize: '0.9rem', color: '#555' }}>Qty: {item.quantity}</span>
                        </div>
                      </div>
                      <div className="cart-item-total text-emerald" style={{ fontWeight: 600, fontSize: '1.2rem', color: '#059669' }}>
                        ₹0
                      </div>
                    </motion.div>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="cart-summary-section">
              <div className="cart-summary">
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '20px' }}>Order Summary</h3>
                <div className="summary-calculations">
                  <div className="calc-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Subtotal ({totalQuantity} items)</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="calc-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Shipping</span>
                    <span className="text-emerald" style={{color: 'var(--color-accent-emerald)', fontWeight: 600}}>Free</span>
                  </div>
                  <div className="calc-divider" style={{ height: '1px', background: 'var(--color-glass-border)', margin: '15px 0' }} />
                  <div className="calc-row total-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 600 }}>
                    <span>Total</span>
                    <span>₹{subtotal}</span>
                  </div>
                </div>
                <button className="btn-primary checkout-btn" onClick={onCheckout}>
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
