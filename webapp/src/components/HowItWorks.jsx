import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Wallet, PackageCheck } from 'lucide-react';
import './HowItWorks.css';

// Three-step "how ordering works". Facts match checkout and the shipping
// policy: BOGO added in cart, online pay or COD (+₹19), dispatch from Jaipur
// in 24–48h, delivery 2–7 business days.
const STEPS = [
  { icon: ShoppingBag, title: 'Pick your product', text: 'Add to cart — your free Buy 1 Get 1 jar is added automatically.' },
  { icon: Wallet, title: 'Pay your way', text: 'UPI, card or net banking. Or Cash on Delivery (+₹19).' },
  { icon: PackageCheck, title: 'Delivered to your door', text: 'Dispatched from Jaipur in 24–48 hrs. Arrives in 2–7 business days.' },
];

const HowItWorks = () => (
  <section className="how-works" aria-labelledby="hw-title">
    <div className="hw-wrap">
      <div className="hw-head">
        <h2 id="hw-title">Ordering is <em className="serif-accent">easy</em></h2>
        <p>Free shipping on orders of ₹499 and above.</p>
      </div>
      <ol className="hw-steps">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <motion.li
            key={title}
            className="hw-step"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
          >
            <span className="hw-badge">{i + 1}</span>
            <span className="hw-icon"><Icon size={22} strokeWidth={1.8} /></span>
            <span className="hw-text">
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </motion.li>
        ))}
      </ol>
    </div>
  </section>
);

export default HowItWorks;
