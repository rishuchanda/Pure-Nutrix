import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, ShoppingBag, Minus, Plus, Gift, Truck, ShieldCheck, Tag } from 'lucide-react';
import './CartPage.css';

// Shipping rule mirrors OrderPage: free from ₹499, otherwise ₹28.
const FREE_SHIP_AT = 499;
const SHIP_FEE = 28;

const priceOf = (p) => (typeof p.price === 'number' ? p.price : Number(String(p.price).replace(/[^0-9.-]+/g, '')));

const CartPage = ({ cartItems, onUpdateQuantity, onRemoveItem, onCheckout, onBack }) => {
  useEffect(() => {
    document.body.classList.add('pn-checkout'); // hides the chatbot bubble on small screens
    return () => document.body.classList.remove('pn-checkout');
  }, []);
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + priceOf(item.product) * item.quantity, 0);
  const shipping = subtotal >= FREE_SHIP_AT || subtotal === 0 ? 0 : SHIP_FEE;
  const total = subtotal + shipping;
  const freeValue = subtotal; // every jar comes with a free one of the same product
  const toFreeShip = Math.max(0, FREE_SHIP_AT - subtotal);
  const shipProgress = Math.min(100, Math.round((subtotal / FREE_SHIP_AT) * 100));

  return (
    <div className="cart-page-wrapper">
      <div className="cart-container">
        <div className="cart-header">
          <button className="cart-back" onClick={onBack} aria-label="Continue shopping">
            <ArrowLeft size={20} /> <span>Continue Shopping</span>
          </button>
          <h1 className="cart-title">Your Cart {totalQuantity > 0 && <span className="cart-items-count">{totalQuantity * 2} items</span>}</h1>
        </div>

        {cartItems.length === 0 ? (
          <motion.div className="empty-cart" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="empty-icon"><ShoppingBag size={40} /></div>
            <h2 className="empty-cart-title">Your cart is empty</h2>
            <p>Every product is Buy 1 Get 1 FREE — add something you love.</p>
            <button className="cart-primary-btn" onClick={onBack}>Start Shopping</button>
          </motion.div>
        ) : (
          <div className="cart-grid">
            <div className="cart-items-section">
              <div className="ship-progress">
                <div className="ship-progress-text">
                  <Truck size={16} />
                  {toFreeShip > 0
                    ? <span>Add <strong>₹{toFreeShip}</strong> more for <strong>FREE shipping</strong></span>
                    : <span>You've unlocked <strong>FREE shipping</strong> 🎉</span>}
                </div>
                <div className="ship-bar"><span style={{ width: `${shipProgress}%` }} /></div>
              </div>

              <AnimatePresence initial={false}>
                {cartItems.map((item) => {
                  const p = item.product;
                  const price = priceOf(p);
                  const img = (p.image_urls || p.images || [])[0];
                  return (
                    <motion.div
                      key={p.id}
                      className="cart-line"
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                    >
                      <div className="cart-line-main">
                        <div className="cart-thumb">{img && <img src={img} alt={p.name} />}</div>
                        <div className="cart-line-info">
                          <h3 className="cart-line-name">{p.name}</h3>
                          <div className="cart-line-price">
                            <strong>₹{price}</strong>
                            {p.original_price > price && <s>₹{p.original_price}</s>}
                          </div>
                          <div className="cart-line-actions">
                            <div className="qty-stepper" role="group" aria-label="Quantity">
                              <button onClick={() => onUpdateQuantity(p.id, Math.max(1, item.quantity - 1))} aria-label="Decrease" disabled={item.quantity <= 1}><Minus size={15} /></button>
                              <span>{item.quantity}</span>
                              <button onClick={() => onUpdateQuantity(p.id, item.quantity + 1)} aria-label="Increase"><Plus size={15} /></button>
                            </div>
                            <button className="cart-remove" onClick={() => onRemoveItem(p.id)} aria-label="Remove"><Trash2 size={17} /></button>
                          </div>
                        </div>
                      </div>
                      <div className="cart-free-row">
                        <Gift size={15} />
                        <span>+{item.quantity} FREE {item.quantity > 1 ? 'jars' : 'jar'} (Buy 1 Get 1)</span>
                        <span className="cart-free-price"><s>₹{price * item.quantity}</s> ₹0</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className="cart-summary-section">
              <div className="cart-summary">
                <h3 className="cart-summary-title">Price Details</h3>
                <div className="cart-row"><span>Subtotal ({totalQuantity} paid {totalQuantity > 1 ? 'items' : 'item'})</span><span>₹{subtotal}</span></div>
                <div className="cart-row save"><span>Buy 1 Get 1 ({totalQuantity} free)</span><span>Free ₹{freeValue}</span></div>
                <div className="cart-row"><span>Shipping</span>{shipping ? <span>₹{shipping}</span> : <span className="free">Free</span>}</div>
                <div className="cart-divider" />
                <div className="cart-row total"><span>Total</span><span>₹{total}</span></div>
                <p className="cart-coupon-hint"><Tag size={14} /> Use code <strong>PUREJOY10</strong> for extra 10% off at checkout</p>
                <button className="cart-primary-btn desktop-only" onClick={onCheckout}>Proceed to Checkout</button>
                <div className="cart-trust">
                  <span><ShieldCheck size={15} /> Secure payment</span>
                  <span><Truck size={15} /> PAN India delivery</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {cartItems.length > 0 && createPortal(
        <div className="cart-sticky-bar">
          <div className="csb-total">
            <small>{totalQuantity * 2} items · incl. FREE</small>
            <strong>₹{total}</strong>
          </div>
          <button className="csb-btn" onClick={onCheckout}>Checkout</button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CartPage;
