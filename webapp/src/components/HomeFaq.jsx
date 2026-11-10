import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import './HomeFaq.css';

// Home FAQ. Answers follow the live checkout and the Shipping / Returns
// policy (LegalPolicyPage). The same questions are in the FAQPage schema in
// index.html — change both together.
export const FAQS = [
  {
    q: 'How soon will my order arrive?',
    a: 'We dispatch from our Jaipur warehouse within 24–48 hours (except Sundays and public holidays). Delivery takes 2–5 business days in metro cities and 5–7 business days elsewhere in India.',
  },
  {
    q: 'Is Cash on Delivery available?',
    a: 'Yes. Choose Cash on Delivery at checkout — a ₹19 handling fee applies. You can also pay online with UPI, card or net banking.',
  },
  {
    q: 'How does Buy 1 Get 1 work?',
    a: 'For every jar you buy, one more of the same product is added free. It is applied automatically in your cart — no code needed.',
  },
  {
    q: 'Is shipping free?',
    a: 'Shipping is free on orders of ₹499 and above. Below ₹499, a ₹28 shipping fee is added at checkout.',
  },
  {
    q: 'How do I check the lab report?',
    a: 'Scan the QR code on your jar. It opens the lab report page for that product on purenutrix.in.',
  },
  {
    q: 'Can I return a product?',
    a: 'Supplements are not returnable once delivered, for hygiene reasons. If your parcel arrives damaged, expired or with the wrong product, message us within 48 hours of delivery with an uncut unboxing video and we will replace it or refund you.',
  },
  {
    q: 'How should I take it?',
    a: 'Follow the dose printed on the label. If you are pregnant, breastfeeding, taking medicines or have a medical condition, please ask your doctor before starting any supplement.',
  },
];

const HomeFaq = () => {
  const [open, setOpen] = useState(0);
  return (
    <section className="home-faq" aria-labelledby="faq-title">
      <div className="faq-wrap">
        <div className="faq-side">
          <span className="faq-eyebrow">FAQ</span>
          <h2 id="faq-title">Questions, <em className="serif-accent">answered</em></h2>
          <p>Still unsure? <a href="/whatsapp">Ask us on WhatsApp</a> or visit <a href="/support">Support</a>.</p>
        </div>
        <div className="faq-list">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className={`faq-item ${isOpen ? 'is-open' : ''}`}>
                <h3>
                  <button
                    type="button"
                    className="faq-q"
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    id={`faq-q-${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                  >
                    <span>{f.q}</span>
                    <Plus size={18} className="faq-plus" aria-hidden="true" />
                  </button>
                </h3>
                <div className="faq-a" id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`}>
                  <div className="faq-a-inner"><p>{f.a}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeFaq;
