import React from 'react';
import { ShieldCheck, Award, CheckCircle, Leaf, Microscope, Sprout } from 'lucide-react';
import { motion } from 'framer-motion';
import './TrustSection.css';

const trustBadges = [
  {
    id: 1,
    icon: <ShieldCheck size={36} className="trust-icon" />,
    title: "FSSAI Approved",
    desc: "Meeting India's highest food safety standards."
  },
  {
    id: 2,
    icon: <Award size={36} className="trust-icon" />,
    title: "GMP Certified",
    desc: "Good Manufacturing Practice for consistent quality."
  },
  {
    id: 3,
    icon: <CheckCircle size={36} className="trust-icon" />,
    title: "ISO 9001:2015",
    desc: "Global standard for quality management."
  },
  {
    id: 4,
    icon: <Leaf size={36} className="trust-icon" />,
    title: "100% Vegan & Natural",
    desc: "Plant-based, cruelty-free ingredients."
  },
  {
    id: 5,
    icon: <Microscope size={36} className="trust-icon" />,
    title: "Clinically Tested",
    desc: "Backed by science and tested for purity."
  },
  {
    id: 6,
    icon: <Sprout size={36} className="trust-icon" />,
    title: "Non-GMO",
    desc: "Free from genetically modified organisms."
  }
];

const TrustSection = () => {
  return (
    <section className="trust-section section-padding">
      <div className="container">
          <motion.div 
          className="trust-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-50px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="trust-title">Trusted by Science. Certified for You.</h2>
          <p className="trust-subtitle">
            We never compromise on quality. Every Pure Nutrix product undergoes rigorous testing to ensure it is safe, effective, and pure.
          </p>
        </motion.div>
        
        <div className="trust-grid">
          {trustBadges.map((badge, idx) => (
            <motion.div 
              key={badge.id} 
              className="trust-card glass-card"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              <div className="icon-wrapper">
                {badge.icon}
              </div>
              <h3 className="badge-title">{badge.title}</h3>
              <p className="badge-desc">{badge.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
