import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { X, Download, ShieldCheck, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const ProfessionalInvoice = ({ order, onClose }) => {
  const invoiceRef = useRef(null);

  const handleDownload = () => {
    const element = invoiceRef.current;
    const opt = {
      margin:       [0, 0, 0, 0],
      filename:     `PureNutrix_Invoice_${order.id.split('-')[0].toUpperCase()}.pdf`,
      image:        { type: 'jpeg', quality: 1.0 },
      html2canvas:  { scale: 3, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const dateObj = new Date(order.created_at);
  const formattedDate = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getFullYear()}`;
  
  const price = order.price || order.total_amount || 0;
  const qty = order.qty || 1;
  const basePrice = (price / 1.18).toFixed(2);
  const gstAmount = (price - basePrice).toFixed(2);
  
  const address = order.shipping_address 
    ? `${order.shipping_address}, ${order.city || ''}, ${order.state || ''} - ${order.pincode || ''}` 
    : 'No Address Provided';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        style={{ background: '#f5f5f7', width: '100%', maxWidth: '900px', height: '90vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Top Action Bar */}
        <div style={{ background: '#111', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Invoice Viewer</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleDownload}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', color: '#111', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
            >
              <Download size={16} /> Download PDF
            </button>
            <button 
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Scrollable Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', justifyContent: 'center' }}>
          
          {/* A4 Paper Container */}
          <div 
            ref={invoiceRef}
            style={{ 
              background: '#fff', 
              width: '210mm', 
              minHeight: '297mm', 
              padding: '40mm 20mm', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
              fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #111', paddingBottom: '24px', marginBottom: '32px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Activity size={28} color="#111" />
                  <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', color: '#111' }}>PURE NUTRIX</h1>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>Science. Nature. Health.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ margin: 0, fontSize: '32px', fontWeight: 300, color: '#111', letterSpacing: '1px' }}>TAX INVOICE</h2>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666' }}>GSTIN: <strong style={{ color: '#111' }}>07AAACA1234A1Z5</strong></p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>Invoice No: <strong style={{ color: '#111' }}>INV-{order.id.split('-')[0].toUpperCase()}</strong></p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>Date: <strong style={{ color: '#111' }}>{formattedDate}</strong></p>
              </div>
            </div>

            {/* Addresses */}
            <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Billed To</h3>
                <p style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#111' }}>{order.customer_name || 'Esteemed Customer'}</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#444', lineHeight: 1.5, maxWidth: '250px' }}>{address}</p>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Dispatched From</h3>
                <p style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#111' }}>Pure Nutrix Global Healthcare</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#444', lineHeight: 1.5 }}>Sector 42, DLF Cyber City,<br/>Gurugram, Haryana 122002<br/>India</p>
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
              <thead>
                <tr>
                  <th style={{ background: '#111', color: '#fff', padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Description</th>
                  <th style={{ background: '#111', color: '#fff', padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Qty</th>
                  <th style={{ background: '#111', color: '#fff', padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Base Price</th>
                  <th style={{ background: '#111', color: '#fff', padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>GST (18%)</th>
                  <th style={{ background: '#111', color: '#fff', padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '20px 16px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#111', fontWeight: 500 }}>
                    {order.product_name}
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', fontWeight: 400 }}>HSN/SAC: 21069099</div>
                  </td>
                  <td style={{ padding: '20px 16px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#111', textAlign: 'center' }}>{qty}</td>
                  <td style={{ padding: '20px 16px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#111', textAlign: 'right' }}>₹{basePrice}</td>
                  <td style={{ padding: '20px 16px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#111', textAlign: 'right' }}>₹{gstAmount}</td>
                  <td style={{ padding: '20px 16px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#111', textAlign: 'right', fontWeight: 700 }}>₹{price}</td>
                </tr>
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '60px' }}>
              <div style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', color: '#666', fontSize: '14px' }}>
                  <span>Subtotal</span>
                  <span>₹{basePrice}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', color: '#666', fontSize: '14px' }}>
                  <span>IGST (18%)</span>
                  <span>₹{gstAmount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', color: '#111', fontSize: '20px', fontWeight: 800 }}>
                  <span>Total</span>
                  <span>₹{price}</span>
                </div>
              </div>
            </div>

            {/* Footer / Auth */}
            <div style={{ position: 'absolute', bottom: '40mm', left: '20mm', right: '20mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#111', marginBottom: '8px' }}>
                  <ShieldCheck size={20} />
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>100% Quality Authenticated</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#888', lineHeight: 1.5, maxWidth: '400px' }}>
                  Thank you for trusting Pure Nutrix. For support, contact <strong style={{ color: '#111' }}>care@purenutrix.com</strong>.<br/>
                  This is a computer-generated invoice and requires no physical signature.
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '150px', height: '1px', background: '#ccc', marginBottom: '8px' }}></div>
                <p style={{ margin: 0, fontSize: '12px', color: '#111', fontWeight: 600 }}>Authorized Signatory</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#888' }}>Pure Nutrix Global</p>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfessionalInvoice;
