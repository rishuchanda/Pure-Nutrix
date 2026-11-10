import React from 'react';
import { motion } from 'framer-motion';
import { ListChecks, QrCode, Factory, BadgeCheck, CalendarCheck } from 'lucide-react';
import './WhyChooseUs.css';

// "The Pure Nutrix Standard": things a buyer can check on the pack themselves.
// Replaces the old "vs other brands" table, whose claims about competitors
// could not be backed up. Keep every line here verifiable.
const POINTS = [
  { icon: ListChecks, title: 'Every ingredient on the label', text: 'The full ingredient list is printed on every pack.', where: 'On the label' },
  { icon: QrCode, title: 'Lab report for your jar', text: 'Scan the QR on the jar to open the lab report for that product.', where: 'Scan jar QR' },
  { icon: Factory, title: 'Made in a certified facility', text: 'Manufactured by Herboplanet LLP in an ISO 22000 & GMP certified unit.', where: 'On the label' },
  { icon: BadgeCheck, title: 'FSSAI licensed', text: 'FSSAI Lic. No. 22226067002870 is printed on every pack.', where: 'On the label' },
  { icon: CalendarCheck, title: 'Batch & best-before', text: 'Batch number, manufacturing and best-before dates on every pack.', where: 'On the pack' },
];

const WhyChooseUs = () => (
  <section className="why-choose-us" id="science" aria-labelledby="wcu-title">
    <div className="wcu-wrap">
      <motion.div
        className="wcu-header"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.55 }}
      >
        <span className="wcu-eyebrow">Check it yourself</span>
        <h2 className="wcu-title" id="wcu-title">The Pure Nutrix <em className="serif-accent">Standard</em></h2>
        <p className="wcu-subtitle">No big promises — just things you can verify on every pack you get from us.</p>
      </motion.div>

      <div className="wcu-grid">
        {POINTS.map(({ icon: Icon, title, text, where }, i) => (
          <motion.article
            key={title}
            className="wcu-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
          >
            <div className="wcu-card-top">
              <span className="wcu-icon"><Icon size={20} strokeWidth={1.8} /></span>
              <span className="wcu-num">0{i + 1}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            <span className="wcu-where">{where}</span>
          </motion.article>
        ))}
      </div>
    </div>
  </section>
);

export default WhyChooseUs;
