import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Truck, Lock, FileText, ChevronRight } from 'lucide-react';
import './LegalPolicyPage.css';

const LegalPolicyPage = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('returns');

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const policies = [
    {
      id: 'returns',
      icon: <Shield size={24} />,
      title: 'Return, Refund & Cancellation',
      content: (
        <div className="policy-content">
          <h3>Cancellation Policy</h3>
          <p>Orders can only be cancelled before they are dispatched from our warehouse. Once an order is shipped, cancellation requests will not be accepted. To cancel an order, please email us at <strong>help@purenutrix.in</strong> with your Order ID.</p>

          <h3>Strict Non-Returnable Policy</h3>
          <p>Pure Nutrix deals in premium nutraceuticals, health supplements, and consumable products. To maintain the highest standards of hygiene, safety, and quality for all our customers, all products are strictly non-returnable and non-exchangeable. We do not accept returns for a "change of mind" or if the product seal is broken.</p>

          <h3>Exceptions (Damage / Wrong Product / Expired)</h3>
          <p>We only offer a replacement or refund in the following exceptional circumstances:</p>
          <ul>
            <li>The product delivered has crossed its expiry date.</li>
            <li>The wrong product or incorrect flavor was delivered.</li>
            <li>The product was physically damaged, unsealed, or tampered with during transit.</li>
          </ul>

          <h3>How to Claim a Replacement/Refund</h3>
          <p>If you face any of the issues mentioned above, you must raise a request within 48 hours of delivery.</p>
          <ol>
            <li>Please email <strong>help@purenutrix.in</strong> with your Order ID.</li>
            <li><strong>Mandatory:</strong> You must attach a clear, uncut unboxing video showing the damaged/incorrect item and the original shipping label.</li>
            <li>Without an unboxing video, replacement or refund requests will not be processed.</li>
          </ol>

          <h3>Refund Process</h3>
          <p>If your claim is verified and approved, and we cannot offer a replacement due to stock unavailability, a full refund will be initiated to your original payment method. The amount will reflect in your account within 5-7 business days.</p>
        </div>
      )
    },
    {
      id: 'shipping',
      icon: <Truck size={24} />,
      title: 'Shipping & Delivery Policy',
      content: (
        <div className="policy-content">
          <h3>Dispatch Time</h3>
          <p>All Pure Nutrix orders are processed and dispatched from our Jaipur warehouse within 24 to 48 hours of placing the order (excluding Sundays and public holidays).</p>

          <h3>Delivery Timelines</h3>
          <ul>
            <li><strong>Metro Cities:</strong> 2 to 5 business days after dispatch.</li>
            <li><strong>Rest of India:</strong> 5 to 7 business days after dispatch.</li>
          </ul>
          <p className="note">Please note that unforeseen circumstances like extreme weather or logistical delays may slightly extend these timelines.</p>

          <h3>Shipping Charges</h3>
          <ul>
            <li>We offer <strong>FREE shipping</strong> on all prepaid orders above ₹499.</li>
            <li>For orders below ₹499, a standard shipping fee of ₹28 will be applied at checkout.</li>
            <li>Cash on Delivery (COD) orders may incur an additional handling fee of ₹19.</li>
          </ul>

          <h3>Order Tracking</h3>
          <p>Once your order is dispatched, you will receive a tracking link via email/SMS to monitor your shipment's live status.</p>
        </div>
      )
    },
    {
      id: 'privacy',
      icon: <Lock size={24} />,
      title: 'Privacy Policy',
      content: (
        <div className="policy-content">
          <h3>Information We Collect</h3>
          <p>When you purchase something from Pure Nutrix, as part of the buying and selling process, we collect personal information you give us, such as your name, address, phone number, and email address.</p>

          <h3>How We Use Your Information</h3>
          <ul>
            <li>To process and fulfill your orders.</li>
            <li>To communicate with you regarding your shipment or customer support queries.</li>
            <li>To send promotional emails and exclusive offers (only if you have opted in).</li>
          </ul>

          <h3>Data Security</h3>
          <p>We take reasonable precautions and follow industry best practices to make sure your data is not inappropriately lost, misused, accessed, disclosed, altered, or destroyed. Our payment gateways use encrypted, secure connections compliant with PCI-DSS standards. We do not store your credit/debit card details on our servers.</p>

          <h3>Third-Party Services</h3>
          <p>We may share your delivery details strictly with our trusted logistics and courier partners to ensure successful delivery of your orders. We do not sell your personal data to third-party marketing agencies.</p>
        </div>
      )
    },
    {
      id: 'terms',
      icon: <FileText size={24} />,
      title: 'Terms of Service',
      content: (
        <div className="policy-content">
          <h3>Overview</h3>
          <p>This website is operated by Pure Nutrix, a brand of <strong>D3 PRODUCTION</strong>. By visiting our site and/or purchasing something from us, you engage in our "Service" and agree to be bound by the following terms and conditions.</p>

          <h3>Product Information & Medical Disclaimer</h3>
          <p>The products and claims made about specific products on or through this site have not been evaluated to diagnose, treat, cure, or prevent disease. The information provided on this site is for informational purposes only and is not intended as a substitute for advice from your physician or other healthcare professional. Always consult with a healthcare professional before starting any diet, exercise, or supplementation program.</p>

          <h3>Accuracy of Billing and Account Information</h3>
          <p>We reserve the right to refuse any order you place with us. You agree to provide current, complete, and accurate purchase and account information for all purchases made at our store.</p>

          <h3>Governing Law</h3>
          <p>These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of India, with jurisdiction exclusively in the courts of Jaipur, Rajasthan.</p>
        </div>
      )
    }
  ];

  return (
    <div className="legal-page">
      <div className="legal-header">
        <div className="legal-header-bg"></div>
        <div className="container relative z-10 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="legal-title"
          >
            Legal & <span className="text-gold">Policy</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="legal-subtitle"
          >
            Everything you need to know about our policies and terms.
          </motion.p>
        </div>
      </div>

      <div className="container legal-container">
        <div className="legal-layout">
          {/* Sidebar Navigation */}
          <div className="legal-sidebar">
            <h3 className="sidebar-title">Categories</h3>
            <ul className="sidebar-menu">
              {policies.map((policy) => (
                <li key={policy.id}>
                  <button 
                    className={`sidebar-btn ${activeTab === policy.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(policy.id)}
                  >
                    <span className="sidebar-icon">{policy.icon}</span>
                    <span className="sidebar-text">{policy.title}</span>
                    <ChevronRight size={16} className="sidebar-arrow" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Main Content Area */}
          <div className="legal-content-area glass-card">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="content-title text-gold">
                {policies.find(p => p.id === activeTab)?.title}
              </h2>
              {policies.find(p => p.id === activeTab)?.content}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPolicyPage;
