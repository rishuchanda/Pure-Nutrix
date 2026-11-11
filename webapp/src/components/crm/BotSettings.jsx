import React, { useEffect, useState } from 'react';
import { Bot, Check, AlertTriangle, QrCode, Copy } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const MENU = [
  ['Products & Price', 'Product list with price → product photo + Buy Now button'],
  ["Today's Offer", 'Shows the offer text below'],
  ['Track My Order', "Latest orders on the customer's WhatsApp number, with status"],
  ['Order Help', 'Payment, delivery time, change/cancel, damaged product policy'],
  ['Product Info & Use', 'How to take (from product details) + lab report link'],
  ['Talk to Our Team', 'Bot goes quiet for 12 hours for that customer and your phone gets an alert'],
];

const DEFAULTS = {
  enabled: true,
  welcome_text: 'Welcome to Pure Nutrix 🌿 Buy 1 Get 1 FREE on every product. Please choose an option below 👇',
  offer_text: '🎁 Buy 1 Get 1 FREE on every product.\n➕ Extra 10% off with code PUREJOY10 at checkout.\n🚚 Free delivery on orders above ₹499. Cash on Delivery available (+₹19).',
  support_hours: '10 AM – 7 PM, Monday to Saturday',
};

const WA_LINK = `${typeof window !== 'undefined' ? window.location.origin : 'https://purenutrix.in'}/whatsapp`;

const BotSettings = () => {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.from('whatsapp_bot_settings').select('*').eq('id', 1).maybeSingle()
      .then(({ data, error }) => {
        if (error) setMsg({ bad: true, text: error.message });
        setCfg({ ...DEFAULTS, ...(data || {}) });
      });
  }, []);

  const save = async () => {
    if (!cfg.welcome_text.trim() || !cfg.offer_text.trim()) { setMsg({ bad: true, text: 'Welcome line and offer cannot be empty.' }); return; }
    setSaving(true); setMsg(null);
    const patch = {
      id: 1, enabled: !!cfg.enabled,
      welcome_text: cfg.welcome_text.trim().slice(0, 600),
      offer_text: cfg.offer_text.trim().slice(0, 700),
      support_hours: cfg.support_hours.trim().slice(0, 60),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('whatsapp_bot_settings').upsert(patch);
    setSaving(false);
    setMsg(error ? { bad: true, text: error.message } : { text: 'Saved. New chats use this right away.' });
  };

  if (!cfg) return <p className="pnb-muted">Loading…</p>;

  return (
    <div className="pnb">
      <div className="crm-section-header">
        <div>
          <h2>WhatsApp Menu Bot</h2>
          <p>When a customer says Hi (or writes after 12 quiet hours), they get this menu on WhatsApp.</p>
        </div>
      </div>

      <section className={`pnb-card ${cfg.enabled ? 'tone-good' : 'tone-wait'}`}>
        <div className="pnb-card-main">
          <label className="pnc-consent" style={{ margin: 0 }}>
            <input type="checkbox" checked={!!cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
            <span>
              <strong><Bot size={15} style={{ verticalAlign: '-2px' }} /> Menu bot is {cfg.enabled ? 'ON' : 'OFF'}</strong>
              <small>Replies are WhatsApp service messages — the first 1,000 each month are free from Meta. Customers can type MENU anytime.</small>
            </span>
          </label>
        </div>
      </section>

      <div className="pnb-grid">
        <section className="pnb-card">
          <div className="pnb-card-main">
            <h3>Messages</h3>
            <label className="pnb-label" htmlFor="bot-welcome">Welcome line (shown above the menu)</label>
            <textarea id="bot-welcome" className="admin-input pnb-offer" rows={3} maxLength={600}
              value={cfg.welcome_text} onChange={(e) => setCfg({ ...cfg, welcome_text: e.target.value })} />
            <label className="pnb-label" htmlFor="bot-offer" style={{ marginTop: 14 }}>Today&apos;s offer</label>
            <textarea id="bot-offer" className="admin-input pnb-offer" rows={4} maxLength={700}
              value={cfg.offer_text} onChange={(e) => setCfg({ ...cfg, offer_text: e.target.value })} />
            <div className="pnb-hint"><span>Keep it true — real code, real last date.</span></div>
            <label className="pnb-label" htmlFor="bot-hours" style={{ marginTop: 14 }}>Team reply hours</label>
            <input id="bot-hours" className="admin-input" maxLength={60}
              value={cfg.support_hours} onChange={(e) => setCfg({ ...cfg, support_hours: e.target.value })} />
            <div className="pnb-row" style={{ marginTop: 14 }}>
              <button type="button" className="admin-btn admin-btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : <><Check size={15} /> Save</>}
              </button>
            </div>
            {msg && <p className={msg.bad ? 'pnb-error' : 'pnb-muted'} style={{ marginTop: 8 }}>{msg.bad && <AlertTriangle size={15} />} {msg.text}</p>}
          </div>
        </section>

        <section className="pnb-card pnb-preview-card">
          <h3>Menu customers see</h3>
          <ol className="bot-menu">
            {MENU.map(([t, d]) => <li key={t}><strong>{t}</strong><span>{d}</span></li>)}
          </ol>
        </section>
      </div>

      <section className="pnb-card">
        <div className="pnb-card-main">
          <h3><QrCode size={16} /> Link for QR codes, Instagram bio and ads</h3>
          <p>This link always opens WhatsApp chat with this CRM number with “Hi” already typed, so the menu comes up.</p>
          <div className="pnb-row">
            <code className="bot-link">{WA_LINK}</code>
            <button type="button" className="admin-btn admin-btn-secondary"
              onClick={async () => { try { await navigator.clipboard.writeText(WA_LINK); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }}>
              <Copy size={14} /> {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="pnb-muted">The QR code in CRM → Settings points to this same link.</p>
        </div>
      </section>
    </div>
  );
};

export default BotSettings;
