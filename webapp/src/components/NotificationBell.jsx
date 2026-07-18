import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './NotificationBell.css';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, prompt, success, denied

  useEffect(() => {
    // Check system notification permission
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setStatus('success');
      } else if (Notification.permission === "denied") {
        setStatus('denied');
      } else {
        // Not asked yet
        const savedStatus = localStorage.getItem('pureNutrixNotifsPrompted');
        if (!savedStatus) {
          const timer = setTimeout(() => {
            setStatus('prompt');
            setIsOpen(true);
          }, 5000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, []);

  const togglePrompt = () => {
    if (status === 'success' || status === 'denied') return; // Do nothing if already decided
    setIsOpen(!isOpen);
    if (!isOpen && status === 'idle') setStatus('prompt');
  };

  const requestSystemNotification = () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }

    Notification.requestPermission().then((permission) => {
      localStorage.setItem('pureNutrixNotifsPrompted', 'true');
      if (permission === "granted") {
        setStatus('success');
        // Send a test notification immediately
        new Notification("Pure Nutrix", {
          body: "You're all set! We'll notify you of new product launches and exclusive offers.",
          icon: "/vite.svg" // Placeholder icon, replace with actual logo later
        });
        setTimeout(() => {
          setIsOpen(false);
        }, 2000);
      } else if (permission === "denied") {
        setStatus('denied');
        setIsOpen(false);
      }
    });
  };

  const handleDecline = () => {
    localStorage.setItem('pureNutrixNotifsPrompted', 'true');
    setIsOpen(false);
  };

  return (
    <div className="notification-wrapper">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="notification-popup"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {status === 'prompt' && (
              <div className="prompt-content">
                <div className="prompt-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>
                <h3>Never Miss an Offer!</h3>
                <p>Enable system notifications to receive alerts on your computer or mobile whenever we launch new products or exclusive offers.</p>
                <div className="prompt-actions">
                  <button className="btn-decline" onClick={handleDecline}>Not Now</button>
                  <button className="btn-allow" onClick={requestSystemNotification}>Allow</button>
                </div>
              </div>
            )}
            
            {status === 'success' && (
              <div className="success-content">
                <div className="success-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3>Notifications Enabled!</h3>
                <p>You'll receive alerts directly to your device.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        className={`bell-button ${status === 'success' ? 'success' : ''}`}
        onClick={togglePrompt}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={status === 'prompt' && !isOpen ? { y: [0, -10, 0] } : {}}
        transition={status === 'prompt' && !isOpen ? { repeat: Infinity, duration: 2 } : {}}
        title={status === 'success' ? "Notifications Enabled" : "Enable Notifications"}
      >
        {status === 'success' ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            <path d="M9 13l2 2 4-4"></path>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        )}
        {status === 'prompt' && <span className="notification-dot"></span>}
      </motion.button>
    </div>
  );
};

export default NotificationBell;
