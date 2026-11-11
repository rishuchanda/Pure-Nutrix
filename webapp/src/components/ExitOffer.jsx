import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, MessageSquare } from 'lucide-react';
import './ExitOffer.css';

// One-time offer when a visitor is about to leave (desktop: mouse to the top bar;
// phone: after 45 s of browsing). Shown at most once a week per browser.
// Every word must stay true: PUREJOY10 = 10% off at checkout, BOGO on every product.
const KEY = 'pn_exit_offer_seen';
const WEEK = 7 * 864e5;
const CODE = 'PUREJOY10';

const seenRecently = () => {
  try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < WEEK; } catch { return true; }
};
const markSeen = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ } };

const ExitOffer = ({ active, onShop }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!active || seenRecently()) return undefined;
    const show = () => { if (!seenRecently()) { markSeen(); setOpen(true); } };
    const armedAt = Date.now() + 8000; // never in the first seconds
    const onLeave = (e) => { if (e.clientY <= 0 && !e.relatedTarget && Date.now() > armedAt) show(); };
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    let t;
    if (coarse) t = setTimeout(show, 45000);
    else document.addEventListener('mouseout', onLeave);
    return () => { clearTimeout(t); document.removeEventListener('mouseout', onLeave); };
  }, [active]);

  useEffect(() => { if (!active) setOpen(false); }, [active]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const copy = async () => {
    try { await navigator.clipboard.writeText(CODE); setCopied(true); } catch { setCopied(false); }
  };

  return createPortal(
    <div className="xo-backdrop" onClick={() => setOpen(false)}>
      <div className="xo-card" role="dialog" aria-modal="true" aria-labelledby="xo-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="xo-close" aria-label="Close" onClick={() => setOpen(false)}><X size={20} /></button>
        <p className="xo-kicker">Before you go</p>
        <h2 id="xo-title">Extra 10% off your order</h2>
        <p className="xo-sub">On top of <strong>Buy 1 Get 1 FREE</strong> on every product.</p>
        <button type="button" className="xo-code" onClick={copy}>
          <span>{CODE}</span>
          <small><Copy size={14} /> {copied ? 'Copied!' : 'Tap to copy'}</small>
        </button>
        <p className="xo-note">Apply the code at checkout. Free delivery above ₹499 · Cash on Delivery available.</p>
        <div className="xo-actions">
          <button type="button" className="xo-shop" onClick={() => { copy(); setOpen(false); onShop?.(); }}>Copy code &amp; shop</button>
          <a className="xo-wa" href="/whatsapp" target="_blank" rel="noopener noreferrer"><MessageSquare size={16} /> Ask on WhatsApp</a>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ExitOffer;
