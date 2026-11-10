import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, FlaskConical, Gift, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Hero3D.css';

// Home page hero: three clean, on-brand slides built in code (no baked-in
// poster images), so text stays sharp, loads fast and is easy to change.
const LIPO_SLUG = 'liposomal-glutathione-600mg-30-veg-capsules';
const LAB_URL = 'https://purenutrix.in/lab-report/liposomal-glutathione';
const P = '/assets/products';

const formatINR = (n) => (typeof n === 'number' ? `₹${n.toLocaleString('en-IN')}` : '');

const Hero3D = ({ onProductClick, onOpenProducts }) => {
  const [products, setProducts] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [qrSvg, setQrSvg] = useState('');
  const touchX = useRef(null);

  useEffect(() => {
    supabase.from('products').select('*').then(({ data }) => { if (data) setProducts(data); });
    // QR library is loaded only when needed, so it is not part of the first download.
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toString(LAB_URL, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } }))
      .then(setQrSvg).catch(() => setQrSvg(''));
  }, []);

  const lipo = products.find(p => p.slug === LIPO_SLUG);

  const openLipo = (e) => {
    if (lipo && onProductClick) { e?.preventDefault(); onProductClick(lipo); }
  };
  const openProducts = (e) => {
    if (onOpenProducts) { e?.preventDefault(); onOpenProducts(); }
  };

  const slides = [
    {
      key: 'launch',
      theme: 'navy',
      eyebrow: <><Sparkles size={14} /> New launch</>,
      title: <>Liposomal<br />Glutathione</>,
      text: '600 mg per capsule · 85% purity · Nano-liposomal delivery. One veg capsule a day for skin radiance and antioxidant support.',
      price: lipo ? { now: lipo.price, mrp: lipo.original_price } : null,
      cta: { label: 'Shop now', href: `/product/${LIPO_SLUG}`, onClick: openLipo },
      visual: (
        <div className="hs-visual hs-visual-single">
          <img src={`${P}/liposomal-glutathione/1.jpg`} alt="Pure Nutrix Liposomal Glutathione 600mg, 30 veg capsules" />
        </div>
      ),
    },
    {
      key: 'bogo',
      theme: 'sand',
      eyebrow: <><Gift size={14} /> On every order</>,
      title: <>Buy 1<br />Get 1 FREE</>,
      text: 'On every Pure Nutrix product. The free jar is added to your cart automatically — no code needed.',
      cta: { label: 'Shop all products', href: '/products', onClick: openProducts },
      visual: (
        <div className="hs-visual hs-visual-row">
          <img src={`${P}/collagen/collagen 1.jpg`} alt="Advanced Collagen & Biotin" />
          <img src={`${P}/liposomal-glutathione/1.jpg`} alt="Liposomal Glutathione" />
          <img src={`${P}/sea_buckthorn/1.jpg`} alt="Himalayan Sea Buckthorn Juice" />
          <span className="hs-free-tag">+1 FREE</span>
        </div>
      ),
    },
    {
      key: 'lab',
      theme: 'mint',
      eyebrow: <><FlaskConical size={14} /> Transparency you can check</>,
      title: <>Lab tested.<br />Scan &amp; see.</>,
      text: 'Every Liposomal Glutathione jar carries a QR code. Scan it to open the latest lab report.',
      cta: { label: 'View lab report', href: '/lab-report/liposomal-glutathione' },
      visual: (
        <div className="hs-visual hs-visual-lab">
          <img src={`${P}/liposomal-glutathione/1.jpg`} alt="Liposomal Glutathione jar" />
          <div className="hs-qr-card">
            {qrSvg ? <div className="hs-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : <div className="hs-qr" />}
            <span>Scan for lab report</span>
          </div>
        </div>
      ),
    },
  ];

  const count = slides.length;
  const go = useCallback((i) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => setIndex(i => (i + 1) % count), 6500);
    return () => clearInterval(t);
  }, [paused, count]);

  return (
    <section
      className="hero-slider"
      id="home"
      aria-roledescription="carousel"
      aria-label="Pure Nutrix highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="hs-track">
        {slides.map((s, i) => (
          <div
            key={s.key}
            className={`hs-slide hs-${s.theme} ${i === index ? 'is-active' : ''}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
          >
            <div className="hs-inner">
              <div className="hs-copy">
                <span className="hs-eyebrow">{s.eyebrow}</span>
                <h2 className="hs-title">{s.title}</h2>
                <p className="hs-text">{s.text}</p>
                {s.price && s.price.now ? (
                  <p className="hs-price">
                    <strong>{formatINR(s.price.now)}</strong>
                    {s.price.mrp > s.price.now && <s>{formatINR(s.price.mrp)}</s>}
                  </p>
                ) : null}
                <a className="hs-cta" href={s.cta.href} onClick={s.cta.onClick} tabIndex={i === index ? 0 : -1}>
                  {s.cta.label} <ArrowRight size={18} />
                </a>
              </div>
              {s.visual}
            </div>
          </div>
        ))}
      </div>

      <button className="hs-arrow hs-prev" onClick={() => go(index - 1)} aria-label="Previous slide"><ChevronLeft size={20} /></button>
      <button className="hs-arrow hs-next" onClick={() => go(index + 1)} aria-label="Next slide"><ChevronRight size={20} /></button>

      <div className="hs-dots">
        {slides.map((s, i) => (
          <button key={s.key} className={i === index ? 'is-active' : ''} onClick={() => go(i)} aria-label={`Go to slide ${i + 1}`} />
        ))}
      </div>
    </section>
  );
};

export default Hero3D;
