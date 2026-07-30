import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import './LegalPolicyPage.css'; // Reusing the same CSS for consistent styling

const PrivacyPolicyPage = () => {
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
            Privacy <span className="text-gold">Policy</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="legal-subtitle"
          >
            How we protect and manage your data at Pure Nutrix.
          </motion.p>
        </div>
      </div>

      <div className="container" style={{ padding: '4rem 1rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#1c1c1c', padding: '3rem', borderRadius: '15px', border: '1px solid #333' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
            <Shield size={32} color="#D4AF37" />
            <h2 style={{ fontSize: '2rem', color: '#fff', margin: 0 }}>Privacy Policy</h2>
          </div>
          
          <div className="policy-content" style={{ color: '#aaa', lineHeight: '1.8' }}>
            <h3 style={{ color: '#fff', fontSize: '1.3rem', marginTop: '2rem', marginBottom: '1rem' }}>Information We Collect</h3>
            <p>When you purchase something from Pure Nutrix, as part of the buying and selling process, we collect personal information you give us, such as your name, address, phone number, and email address.</p>

            <h3 style={{ color: '#fff', fontSize: '1.3rem', marginTop: '2rem', marginBottom: '1rem' }}>How We Use Your Information</h3>
            <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginBottom: '1.5rem' }}>
              <li>To process and fulfill your orders.</li>
              <li>To communicate with you regarding your shipment or customer support queries.</li>
              <li>To send promotional emails and exclusive offers (only if you have opted in).</li>
            </ul>

            <h3 style={{ color: '#fff', fontSize: '1.3rem', marginTop: '2rem', marginBottom: '1rem' }}>Data Security</h3>
            <p>We take reasonable precautions and follow industry best practices to make sure your data is not inappropriately lost, misused, accessed, disclosed, altered, or destroyed. Our payment gateways use encrypted, secure connections compliant with PCI-DSS standards. We do not store your credit/debit card details on our servers.</p>

            <h3 style={{ color: '#fff', fontSize: '1.3rem', marginTop: '2rem', marginBottom: '1rem' }}>Third-Party Services</h3>
            <p>We may share your delivery details strictly with our trusted logistics and courier partners to ensure successful delivery of your orders. We do not sell your personal data to third-party marketing agencies.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
