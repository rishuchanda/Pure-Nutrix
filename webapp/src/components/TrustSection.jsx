import React from 'react';
import { ShieldCheck, Award, CheckCircle, Leaf, Microscope, Sprout } from 'lucide-react';
import { motion } from 'framer-motion';
import RainEffect from './RainEffect';
import './TrustSection.css';

const trustBadges = [
  {
    id: 1,
    icon: <img src="/assets/certificates/fda.png" alt="FDA" className="trust-cert-icon" />,
    title: "FDA Registered",
    desc: "Regulatory Guideline for Food and Drug Administration."
  },
  {
    id: 2,
    icon: <img src="/assets/certificates/haccp.png" alt="HACCP" className="trust-cert-icon" />,
    title: "HACCP",
    desc: "Hazard Analysis & Critical Control Points compliance."
  },
  {
    id: 3,
    icon: <img src="/assets/certificates/iso22000.png" alt="ISO 22000" className="trust-cert-icon" />,
    title: "ISO 22000:2018",
    desc: "Food Safety Management System certification."
  },
  {
    id: 4,
    icon: <img src="/assets/certificates/iso9001.png" alt="ISO 9001" className="trust-cert-icon" />,
    title: "ISO 9001:2015",
    desc: "Global standard for quality management."
  },
  {
    id: 5,
    icon: <img src="/assets/certificates/kosher.png" alt="KOSHER" className="trust-cert-icon" />,
    title: "KOSHER",
    desc: "Certified Kosher for purity and rigorous preparation."
  },
  {
    id: 6,
    icon: <img src="/assets/certificates/organic.png" alt="Organic" className="trust-cert-icon" />,
    title: "Organic Certified",
    desc: "Made with 100% organic raw materials."
  },
  {
    id: 7,
    icon: <img src="/assets/certificates/who-gmp.png" alt="WHO-GMP" className="trust-cert-icon" />,
    title: "WHO-GMP",
    desc: "World Health Organization Good Manufacturing Practice."
  },
  {
    id: 8,
    icon: <ShieldCheck size={36} className="trust-icon" />,
    title: "FSSAI Approved",
    desc: "Meeting India's highest food safety standards."
  }
];

const TrustSection = () => {
  return (
    <section className="trust-section section-padding">
      <RainEffect />
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
