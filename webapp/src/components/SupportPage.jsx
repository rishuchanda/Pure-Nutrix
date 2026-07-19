import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, MapPin, MessageSquare, Truck, HelpCircle, ChevronDown, Send } from 'lucide-react';
import './SupportPage.css';

const SupportPage = ({ initialTab = 'contact', onBack }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const faqs = [
    {
      category: "About the Products",
      questions: [
        {
          q: "Are Pure Nutrix products safe and tested?",
          a: "Absolutely. All our products are manufactured in FSSAI, GMP, and ISO-certified facilities. We use premium ingredients and conduct strict third-party lab testing for heavy metals and banned substances to ensure 100% safety."
        },
        {
          q: "How do I know if my product is authentic?",
          a: "Every Pure Nutrix product comes with a unique tamper-proof seal and a scannable QR code/scratch code to verify its authenticity instantly."
        },
        {
          q: "Can I take these supplements if I have a medical condition?",
          a: "While our products are strictly dietary supplements and nutraceuticals, we highly recommend consulting your physician or a certified nutritionist before starting any new supplement regimen if you have pre-existing medical conditions."
        }
      ]
    },
    {
      category: "Shipping & Orders",
      questions: [
        {
          q: "How long does delivery take?",
          a: "Orders are dispatched from our Jaipur warehouse within 24-48 hours. Depending on your location, delivery typically takes 3 to 7 business days."
        },
        {
          q: "Do you offer Cash on Delivery (COD)?",
          a: "Yes, COD is available across most pin codes in India. A nominal handling fee may apply at checkout for COD orders."
        }
      ]
    },
    {
      category: "Returns & Cancellations",
      questions: [
        {
          q: "Can I return a supplement if I don't like the taste?",
          a: "Due to strict hygiene protocols and the consumable nature of nutraceuticals, we have a strict No-Return Policy once the order is shipped. We do not accept returns for change of mind or taste preferences."
        },
        {
          q: "What if I receive a damaged or incorrect product?",
          a: "In the rare event of transit damage or receiving a wrong item, please email us within 48 hours of delivery with a clear unboxing video and your Order ID. We will resolve the issue and provide a replacement at the earliest."
        }
      ]
    }
  ];

  const handleFaqToggle = (idx) => {
    if (openFaq === idx) {
      setOpenFaq(null);
    } else {
      setOpenFaq(idx);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'contact':
        return (
          <motion.div
            key="contact"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="support-content"
          >
            <h2 className="content-title text-gold">We're Here to Help!</h2>
            <p className="content-desc">
              Got a question about our supplements? Need help with an order? Our support team at Pure Nutrix is always ready to assist you.
            </p>

            <div className="contact-grid">
              <div className="contact-info-cards">
                <div className="contact-card">
                  <div className="contact-icon"><Phone size={24} /></div>
                  <div className="contact-details">
                    <h3>Customer Care</h3>
                    <p>+91-7976979355</p>
                    <span>Mon-Sat, 10:00 AM to 6:00 PM</span>
                  </div>
                </div>

                <div className="contact-card">
                  <div className="contact-icon"><MessageSquare size={24} /></div>
                  <div className="contact-details">
                    <h3>WhatsApp Support</h3>
                    <p>+91-7976979355</p>
                    <span>Fastest way to reach us!</span>
                  </div>
                </div>

                <div className="contact-card">
                  <div className="contact-icon"><Mail size={24} /></div>
                  <div className="contact-details">
                    <h3>Email Support</h3>
                    <p>help@purenutrix.com</p>
                    <span>We typically reply within 24 hours</span>
                  </div>
                </div>

                <div className="contact-card">
                  <div className="contact-icon"><MapPin size={24} /></div>
                  <div className="contact-details">
                    <h3>Our Headquarters</h3>
                    <p>Pure Nutrix<br />99, Keshar Vihar, Goner Road,<br />Jaipur, Rajasthan - 303012, India.</p>
                  </div>
                </div>
              </div>

              <div className="contact-form-container glass-card">
                <h3>Send us a Message</h3>
                <form className="contact-form" onSubmit={(e) => { e.preventDefault(); alert("Thanks for your message! We will get back to you soon."); }}>
                  <div className="input-group">
                    <input type="text" placeholder="Full Name" required />
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <input type="email" placeholder="Email Address" required />
                    </div>
                    <div className="input-group">
                      <input type="tel" placeholder="Phone Number" required />
                    </div>
                  </div>
                  <div className="input-group">
                    <input type="text" placeholder="Order ID (Optional)" />
                  </div>
                  <div className="input-group">
                    <textarea placeholder="How can we help you?" rows="4" required></textarea>
                  </div>
                  <button type="submit" className="btn-primary form-submit-btn">
                    <span>Submit</span>
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        );
      
      case 'track':
        return (
          <motion.div
            key="track"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="support-content"
          >
            <h2 className="content-title text-gold">Track Your Journey to Better Health</h2>
            <p className="content-desc">
              Excited for your Pure Nutrix order? We are too! You can easily track the live status of your shipment right here.
            </p>

            <div className="track-card glass-card">
              <div className="track-icon-wrapper">
                <Truck size={48} />
              </div>
              <h3>How to Track:</h3>
              <ul className="track-steps">
                <li>Keep your <strong>Order ID</strong> or <strong>AWB (Tracking Number)</strong> handy.</li>
                <li>You can find this number in the dispatch confirmation email or SMS we sent you.</li>
                <li>Click the link below to go to our courier partner's tracking page and enter your details.</li>
              </ul>
              
              <button 
                className="btn-primary track-btn" 
                onClick={() => window.open('https://www.shiprocket.in/shipment-tracking/', '_blank')}
              >
                Track My Order
              </button>

              <div className="track-help">
                <p>Having trouble tracking? Reach out to us at <strong>help@purenutrix.com</strong> with your Order ID.</p>
              </div>
            </div>
          </motion.div>
        );

      case 'faq':
        let qIndex = 0;
        return (
          <motion.div
            key="faq"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="support-content"
          >
            <h2 className="content-title text-gold">Got Questions? We've Got Answers.</h2>
            
            <div className="faq-container">
              {faqs.map((category, catIdx) => (
                <div key={catIdx} className="faq-category">
                  <h3 className="faq-cat-title">{category.category}</h3>
                  <div className="faq-list">
                    {category.questions.map((faq, i) => {
                      const currentIdx = qIndex++;
                      const isOpen = openFaq === currentIdx;
                      
                      return (
                        <div 
                          key={currentIdx} 
                          className={`faq-item glass-card ${isOpen ? 'open' : ''}`}
                          onClick={() => handleFaqToggle(currentIdx)}
                        >
                          <div className="faq-q">
                            <h4>{faq.q}</h4>
                            <ChevronDown size={20} className={`faq-arrow ${isOpen ? 'rotated' : ''}`} />
                          </div>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="faq-a"
                              >
                                <p>{faq.a}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="support-page">
      <div className="support-header">
        <div className="support-header-bg"></div>
        <div className="container relative z-10 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="support-title"
          >
            Customer <span className="text-gold">Support</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="support-subtitle"
          >
            Always here to help you on your health journey.
          </motion.p>
        </div>
      </div>

      <div className="container support-container">
        <div className="support-tabs">
          <button 
            className={`support-tab ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
          >
            <Phone size={18} />
            Contact Us
          </button>
          <button 
            className={`support-tab ${activeTab === 'track' ? 'active' : ''}`}
            onClick={() => setActiveTab('track')}
          >
            <Truck size={18} />
            Track Order
          </button>
          <button 
            className={`support-tab ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            <HelpCircle size={18} />
            FAQs
          </button>
        </div>

        <div className="support-content-area">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
