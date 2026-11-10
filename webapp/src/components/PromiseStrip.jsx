import React from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, ShieldCheck, Gift, Truck } from 'lucide-react';
import './PromiseStrip.css';

// Four short promises. Keep them true: lab report QR (lab_reports), FSSAI
// licence on the label, BOGO in cart, COD + free shipping from ₹499 at checkout.
const ITEMS = [
  { icon: FlaskConical, title: 'Lab-tested', sub: 'Report on the jar QR' },
  { icon: ShieldCheck, title: 'FSSAI licensed', sub: 'Made in India' },
  { icon: Gift, title: 'Buy 1 Get 1', sub: 'On every product' },
  { icon: Truck, title: 'COD available', sub: 'Free shipping ₹499+' },
];

const PromiseStrip = () => (
  <section className="promise-strip" aria-label="Our promise">
    <div className="ps-wrap">
      {ITEMS.map(({ icon: Icon, title, sub }, i) => (
        <motion.div
          key={title}
          className="ps-item"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.45, delay: i * 0.06 }}
        >
          <span className="ps-icon"><Icon size={20} strokeWidth={1.8} /></span>
          <span className="ps-text">
            <strong>{title}</strong>
            <small>{sub}</small>
          </span>
        </motion.div>
      ))}
    </div>
  </section>
);

export default PromiseStrip;
