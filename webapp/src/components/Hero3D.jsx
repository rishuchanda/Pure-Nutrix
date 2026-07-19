import React from 'react';
import { motion } from 'framer-motion';
import RainEffect from './RainEffect';
import './Hero3D.css';

const Hero3D = () => {
  return (
    <section className="hero-section-interactive" id="home">
      <RainEffect />

      {/* Foreground Content */}
      <div className="hero-content-interactive container">
        <motion.div
          className="interactive-text-wrapper"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <motion.div
            className="sale-badge"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, type: 'spring' }}
          >
            <span className="sale-icon">🌧️</span>
            Buy 1 Get 1 Free — Monsoon Sale
          </motion.div>

          <motion.h1
            className="interactive-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Awaken Your <br />
            Pure Radiance.
          </motion.h1>

          <motion.div
            className="interactive-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <button 
              className="btn-ag-primary" 
              onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="btn-icon">✨</span>
              Shop The Collection
            </button>
            <button 
              className="btn-ag-secondary"
              onClick={() => document.getElementById('science')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Discover Our Science
            </button>
          </motion.div>
        </motion.div>
      </div>

    </section>
  );
};

export default Hero3D;
