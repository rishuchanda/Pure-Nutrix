import React from 'react';
import { motion } from 'framer-motion';
import { Award, ShieldCheck, CheckCircle, FileText, Settings, Microscope, Box, Check, ArrowRight } from 'lucide-react';
import './QualityStandardsPage.css';

const QualityStandardsPage = ({ onBack, onExplore }) => {
  const certifications = [
    {
      id: 1,
      title: 'HACCP',
      desc: 'Hazard Analysis & Critical Control Points compliance for food safety.',
      icon: <ShieldCheck size={40} className="cert-icon" />
    },
    {
      id: 2,
      title: 'FDA',
      desc: 'Regulatory Guideline for Food and Drug Administration.',
      icon: <FileText size={40} className="cert-icon" />
    },
    {
      id: 3,
      title: 'KOSHER',
      desc: 'Certified Kosher for purity and rigorous preparation standards.',
      icon: <CheckCircle size={40} className="cert-icon" />
    },
    {
      id: 4,
      title: 'ISO 22000:2018',
      desc: 'Food Safety Management System certification.',
      icon: <Award size={40} className="cert-icon" />
    },
    {
      id: 5,
      title: 'ISO 9001:2015',
      desc: 'Quality Management Systems certification.',
      icon: <Award size={40} className="cert-icon" />
    }
  ];

  const checklists = [
    {
      title: 'No Banned Substances',
      desc: '100% dope-free and safe for competitive athletes.'
    },
    {
      title: 'Heavy Metal Tested',
      desc: 'Rigorously screened for lead, arsenic, cadmium, and mercury.'
    },
    {
      title: 'Zero Harmful Fillers',
      desc: 'No unnecessary artificial thickeners or cheap spiking.'
    },
    {
      title: 'Authentic Raw Materials',
      desc: 'We source our premium whey, vitamins, and herbal extracts only from trusted, verified global and local suppliers.'
    }
  ];

  const processes = [
    {
      title: 'Quarantine & Testing',
      desc: 'Every batch of raw material is quarantined and tested before entering the production floor.',
      icon: <Microscope size={32} />
    },
    {
      title: 'Precision Blending',
      desc: 'Advanced micro-blending technology ensures every scoop gives you the exact nutritional value stated on the box.',
      icon: <Settings size={32} />
    },
    {
      title: 'Sealed for Freshness',
      desc: 'Airtight, moisture-resistant packaging with tamper-proof seals guarantees that the product reaches you as fresh as the day it was made.',
      icon: <Box size={32} />
    }
  ];

  return (
    <div className="quality-page">
      {/* Section 1: Hero */}
      <section className="quality-hero">
        <div className="quality-hero-bg"></div>
        <div className="quality-hero-content container">
          <motion.h1 
            className="quality-hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Uncompromising Quality.<br />
            <span className="text-gold">Absolute Transparency.</span>
          </motion.h1>
          <motion.p 
            className="quality-hero-subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            At Pure Nutrix, we believe you deserve to know exactly what goes into your body. That is why our commitment to quality goes beyond the label.
          </motion.p>
          <motion.p 
            className="quality-hero-body"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Your health is not a guessing game. From the moment our raw ingredients are sourced to the second the final scoop reaches your shaker, we maintain the highest industry standards for purity, safety, and potency. We don't just promise results; we engineer them safely.
          </motion.p>
        </div>
      </section>

      {/* Section 2: Trust Pillars / Certifications */}
      <section className="quality-section bg-dark">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Backed by Science, <span className="text-gold">Certified by Experts</span></h2>
            <p className="section-subtitle">
              Every Pure Nutrix product is manufactured in state-of-the-art facilities that comply with strict regulatory guidelines.
            </p>
            <p className="manufacturing-notice text-gold mt-2" style={{ fontSize: '1.2rem', marginTop: '15px' }}>
              <strong>Manufacturing Certifications</strong>
            </p>
          </div>

          <div className="cert-grid">
            {certifications.map((cert, index) => (
              <motion.div 
                key={cert.id}
                className="cert-card glass-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="cert-icon-wrapper">
                  {cert.icon}
                </div>
                <h3 className="cert-title">{cert.title}</h3>
                <p className="cert-desc">{cert.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: What You See Is What You Get */}
      <section className="quality-section bg-light">
        <div className="container">
          <div className="split-layout">
            <div className="split-content">
              <motion.h2 
                className="section-title text-dark"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                What You See <br /><span className="text-gold">Is What You Get</span>
              </motion.h2>
              <motion.p 
                className="section-body text-dark-muted"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                We are strictly against hidden blends and adulteration. Our formulas are transparent, safe, and designed for peak performance without the junk.
              </motion.p>
            </div>
            
            <div className="checklist-container">
              {checklists.map((item, index) => (
                <motion.div 
                  key={index}
                  className="check-item"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                >
                  <div className="check-icon-wrapper">
                    <Check size={24} className="text-green" />
                  </div>
                  <div className="check-text">
                    <h4 className="check-title text-dark">{item.title}</h4>
                    <p className="check-desc text-dark-muted">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Our Manufacturing Process */}
      <section className="quality-section bg-dark">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Crafted with <span className="text-gold">Precision</span></h2>
            <p className="section-subtitle">
              Great supplements start with a great environment. Our manufacturing process minimizes human intervention to eliminate contamination risks.
            </p>
          </div>

          <div className="process-timeline">
            {processes.map((proc, index) => (
              <motion.div 
                key={index}
                className="process-step"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <div className="process-icon-container">
                  <div className="process-icon">
                    {proc.icon}
                  </div>
                  {index < processes.length - 1 && <div className="process-connector"></div>}
                </div>
                <div className="process-content">
                  <h3 className="process-title">{proc.title}</h3>
                  <p className="process-desc">{proc.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Complete Transparency (Lab Reports) */}
      <section className="quality-section bg-gradient">
        <div className="container text-center">
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Don't Just Take Our Word for It.<br />
            <span className="text-gold">Check the Proof.</span>
          </motion.h2>
          <motion.p 
            className="section-body mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            style={{ maxWidth: '800px', margin: '20px auto' }}
          >
            Trust is built on proof. We subject our finished products to strict independent third-party lab testing. This ensures that the protein percentage, ingredient profile, and safety metrics perfectly match our nutritional label.
          </motion.p>
          <motion.button 
            className="btn-primary"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            onClick={() => alert("Lab Reports / COA feature coming soon!")}
            style={{ marginTop: '30px' }}
          >
            View Our Latest Lab Reports / COA
          </motion.button>
        </div>
      </section>

      {/* Footer / Call to Action */}
      <section className="quality-cta bg-dark text-center">
        <div className="container" style={{ padding: '80px 0' }}>
          <h2 className="cta-title section-title">Fuel Your Fitness with Confidence.</h2>
          <p className="cta-desc section-subtitle" style={{ marginBottom: '40px' }}>Join the community of fitness enthusiasts who trust Pure Nutrix for their daily nutrition.</p>
          <div className="cta-actions">
            <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }} onClick={onExplore}>
              Explore Our Products <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QualityStandardsPage;
