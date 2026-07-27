import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import './WhatsAppWidget.css';

const WhatsAppWidget = ({ phoneNumber, message }) => {
  // Obfuscated personal WhatsApp number fallback until official API is verified
  const defaultPhone = atob('OTE5MDU3NjA3MDMw'); 
  const defaultMessage = 'Hi Pure-Nutrix! I would like to know more about your products.';

  const targetPhone = phoneNumber || defaultPhone;
  const targetMessage = message || defaultMessage;

  const handleClick = () => {
    const encodedMessage = encodeURIComponent(targetMessage);
    const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <motion.button
      className="whatsapp-widget"
      onClick={handleClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 1 }}
      aria-label="Chat with us on WhatsApp"
    >
      <div className="whatsapp-icon-wrapper">
        <MessageCircle size={32} />
        <div className="pulse-ring"></div>
      </div>
    </motion.button>
  );
};

export default WhatsAppWidget;
