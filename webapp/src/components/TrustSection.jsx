import React from 'react';
import { ShieldCheck, Award, CheckCircle, Leaf, Microscope, FileText, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';

import './TrustSection.css';

// Certificates held by our manufacturer, Herboplanet LLP (Jaipur), issued by
// EU Certification Ltd, valid till 17 Feb 2028. Each card opens the real
// certificate. Wording follows what each certificate actually says.
const CERT = '/assets/certificates/';
const trustBadges = [
  { id: 'iso22000', icon: <Award size={36} className="trust-icon" />, title: 'ISO 22000:2018', desc: 'Food safety management system.', file: 'iso22000.pdf' },
  { id: 'who-gmp', icon: <Microscope size={36} className="trust-icon" />, title: 'WHO-GMP', desc: 'Good Manufacturing Practice as per WHO norms.', file: 'who-gmp.pdf' },
  { id: 'haccp', icon: <CheckCircle size={36} className="trust-icon" />, title: 'HACCP', desc: 'Hazard Analysis & Critical Control Points.', file: 'haccp.pdf' },
  { id: 'iso9001', icon: <Award size={36} className="trust-icon" />, title: 'ISO 9001:2015', desc: 'Quality management system.', file: 'iso9001.pdf' },
  { id: 'kosher', icon: <CheckSquare size={36} className="trust-icon" />, title: 'KOSHER', desc: 'Kosher compliance certificate.', file: 'kosher.pdf' },
  { id: 'fda', icon: <FileText size={36} className="trust-icon" />, title: 'FDA guidelines', desc: 'Facility audited against FDA regulatory guidelines.', file: 'fda.pdf' },
  { id: 'organic', icon: <Leaf size={36} className="trust-icon" />, title: 'Organic', desc: 'Facility compliance audit for organic guidelines.', file: 'organic.pdf' },
  { id: 'fssai', icon: <ShieldCheck size={36} className="trust-icon" />, title: 'FSSAI licensed', desc: 'Lic. No. 22226067002870, printed on every pack.', file: null },
];

const TrustSection = () => {
  return (
    <section className="trust-section section-padding">
      <div className="container">
        <motion.div
          className="trust-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="trust-title">Made in a <em className="serif-accent">certified</em> facility.</h2>
          <p className="trust-subtitle">
            Pure Nutrix products are made by Herboplanet LLP, Jaipur. Tap a badge to open the real certificate.
          </p>
        </motion.div>

        <div className="trust-grid">
          {trustBadges.map((badge, idx) => {
            const Tag = badge.file ? 'a' : 'div';
            const linkProps = badge.file ? { href: CERT + badge.file, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${badge.title} certificate (PDF)` } : {};
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: Math.min(idx, 4) * 0.06 }}
              >
                <Tag className={`trust-card glass-card${badge.file ? ' is-link' : ''}`} {...linkProps}>
                  <div className="icon-wrapper">{badge.icon}</div>
                  <h3 className="badge-title">{badge.title}</h3>
                  <p className="badge-desc">{badge.desc}</p>
                  {badge.file && <span className="trust-view">View certificate →</span>}
                </Tag>
              </motion.div>
            );
          })}
        </div>
        <p className="trust-footnote">Certificates issued to Herboplanet LLP by EU Certification Ltd, valid till Feb 2028.</p>
      </div>
    </section>
  );
};

export default TrustSection;
