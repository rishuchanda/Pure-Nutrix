import React from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';
import './HelpCta.css';

// Dark "talk to us" card above the footer. /whatsapp redirects to the
// business WhatsApp number (see App.jsx).
const HelpCta = () => (
  <section className="help-cta">
    <div className="help-cta-card">
      <div className="help-cta-text">
        <span className="help-cta-eyebrow">Need help choosing?</span>
        <h2>Talk to us on <em className="serif-accent">WhatsApp</em></h2>
        <p>Ask about usage, delivery or your order — our team replies on WhatsApp.</p>
      </div>
      <a className="help-cta-btn" href="/whatsapp">
        <MessageCircle size={18} /> Chat with us <ArrowRight size={16} />
      </a>
    </div>
  </section>
);

export default HelpCta;
