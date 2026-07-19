import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CloudRain, ShoppingBag } from 'lucide-react';
import './MonsoonSalePopup.css';

const MonsoonSalePopup = ({ onShopClick }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show popup after 2 seconds
    const timer = setTimeout(() => {
      // Check if already seen in this session
      const hasSeen = sessionStorage.getItem('hasSeenMonsoonSale');
      if (!hasSeen) {
        setIsVisible(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('hasSeenMonsoonSale', 'true');
  };

  const handleShopNow = () => {
    handleClose();
    if (onShopClick) {
      onShopClick();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="sale-popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div 
            className="sale-popup-card glass-card"
            initial={{ scale: 0.9, opacity: 0, x: 50, y: 50 }}
            animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, x: 50, y: 50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="sale-popup-close" onClick={handleClose}>
              <X size={18} />
            </button>
            
            <div className="sale-popup-content">
              <div className="sale-popup-header-row">
                <div className="sale-popup-icon">
                  <CloudRain size={24} color="var(--color-accent-emerald)" />
                </div>
                <div>
                  <h2 className="sale-popup-title text-gradient">Monsoon Sale</h2>
                  <h3 className="sale-popup-subtitle text-gold">Buy 1 Get 1 FREE</h3>
                </div>
              </div>
              <p className="sale-popup-desc">
                Buy any Pure Nutrix product, get another one absolutely free. Automatically applied at checkout!
              </p>
              <button className="btn-primary sale-popup-btn" onClick={handleShopNow}>
                <ShoppingBag size={18} /> Shop Now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MonsoonSalePopup;
