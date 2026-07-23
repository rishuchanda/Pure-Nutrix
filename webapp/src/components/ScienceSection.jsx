import React from 'react';
import { motion } from 'framer-motion';
import './ScienceSection.css';

const ScienceSection = () => {
  return (
    <section className="science-section section-padding" id="science">
      <div className="container">
        <div className="science-grid">
          <motion.div 
            className="science-image-container"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="science-image-glow"></div>
            {/* Using an aesthetic product image to represent the science/purity vibe */}
            <img src="./assets/products/collagen/collagen 4.jpg" alt="Science of Beauty" className="science-image" />
          </motion.div>
          <motion.div 
            className="science-content"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h4 className="science-label text-gold">OUR PHILOSOPHY</h4>
            <h2 className="science-title">The Science of True Radiance.</h2>
            <p className="science-desc">
              We believe that true beauty starts at the cellular level. Our formulations merge cutting-edge clinical research with nature's purest extracts to awaken your inner glow and restore youthful vitality from within.
            </p>
            <p className="science-desc">
              Unlike superficial treatments, our nutraceuticals deliver bioactive ingredients directly to your bloodstream for maximum absorption and visible, long-lasting results.
            </p>
            <div className="science-stats">
              <div className="stat-item">
                <span className="stat-number">100%</span>
                <span className="stat-text">Bioavailable</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">0%</span>
                <span className="stat-text">Harmful Fillers</span>
              </div>
            </div>
            <button className="btn-ag-primary mt-4">Discover Our Research</button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ScienceSection;
