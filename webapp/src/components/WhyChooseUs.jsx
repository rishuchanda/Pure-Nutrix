import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import RainEffect from './RainEffect';
import './WhyChooseUs.css';

const comparisons = [
  {
    feature: 'Ingredient Transparency',
    pureNutrix: '100% Transparent, no proprietary blends.',
    otherBrands: 'Hidden formulas and proprietary blends.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    )
  },
  {
    feature: 'Ingredient Quality',
    pureNutrix: 'Premium, clinically tested raw materials.',
    otherBrands: 'Cheap, unverified, or synthetic ingredients.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
      </svg>
    )
  },
  {
    feature: 'Bioavailability',
    pureNutrix: 'Optimized for maximum absorption.',
    otherBrands: 'Poor absorption, leading to waste.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20"></path>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    )
  },
  {
    feature: 'Purity & Cleanliness',
    pureNutrix: 'Zero artificial fillers, binders, or colors.',
    otherBrands: 'Loaded with artificial additives and fillers.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    )
  },
  {
    feature: 'Scientific Backing',
    pureNutrix: 'Formulated based on latest clinical research.',
    otherBrands: 'Based on fads or outdated science.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2v10.5L3 21h18l-6-8.5V2"></path>
        <path d="M9 10h6"></path>
      </svg>
    )
  }
];

const CheckIcon = () => (
  <motion.svg 
    initial={{ scale: 0 }}
    whileInView={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    viewport={{ once: true }}
    className="wcu-check-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </motion.svg>
);

const CrossIcon = () => (
  <motion.svg 
    initial={{ scale: 0, rotate: -45 }}
    whileInView={{ scale: 1, rotate: 0 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    viewport={{ once: true }}
    className="wcu-cross-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </motion.svg>
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const rowVariants = {
  hidden: { opacity: 0, x: -30, scale: 0.95 },
  visible: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

const WhyChooseUs = () => {
  return (
    <section className="why-choose-us section-padding" id="science">
      <RainEffect />
      <div className="container">
        <motion.div 
          className="wcu-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="wcu-title">
            <span className="wcu-title-highlight">The Pure Nutrix</span> Difference
          </h2>
          <p className="wcu-subtitle">
            See how we stack up against the competition. We don't just meet standards, we redefine them.
          </p>
        </motion.div>

        <motion.div 
          className="wcu-table-container"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, type: "spring", bounce: 0.2 }}
        >
          <table className="wcu-table">
            <thead>
              <tr>
                <th className="wcu-th-feature">Feature</th>
                <th className="wcu-th-other">Other Brands</th>
                <th className="wcu-th-pure">Pure Nutrix</th>
              </tr>
            </thead>
            <motion.tbody
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              {comparisons.map((item, index) => (
                <motion.tr 
                  key={index}
                  variants={rowVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <td className="wcu-td-feature">
                    <div className="wcu-feature-inner">
                      {item.icon}
                      <span>{item.feature}</span>
                    </div>
                  </td>
                  <td className="wcu-td-other">
                    <div className="wcu-td-content">
                      <CrossIcon />
                      <span>{item.otherBrands}</span>
                    </div>
                  </td>
                  <td className="wcu-td-pure">
                    <div className="wcu-td-content">
                      <CheckIcon />
                      <span>{item.pureNutrix}</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
