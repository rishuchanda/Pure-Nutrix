import React, { useMemo, useState } from 'react';
import { Phone, MessageCircle, Copy, FileText, Search, ChevronDown, Check, MapPin, Tag } from 'lucide-react';
import ProfessionalInvoice from '../ProfessionalInvoice';
import {
  STATUS, NEXT, statusKey, isOpen, isInTransit, isLost, isCOD, inr, shortId, fmtDate, waLink, fullAddress, copyText,
} from './adminUtils';

const FILTERS = [
  { id: 'open', label: 'To ship', test: isOpen },
  { id: 'transit', label: 'On the way', test: isInTransit },
  { id: 'delivered', label: 'Delivered', test: (o) => statusKey(o.status) === 'delivered' },
  { id: 'lost', label: 'Cancelled / returned', test: isLost },
  { id: 'all', label: 'All', test: () => true },
];

export const OrderCard = ({ order: o, onStatus, readOnly, compact }) => {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [menu, setMenu] = useState(false);
  const k = statusKey(o.status);
  const st = STATUS[k] || { label: o.status, tone: 'new' };
  const next = NEXT[k];
  const cod = isCOD(o);
  const wa = waLink(o.customer_mobile, `Hi ${o.customer_name || ''}, this is Pure Nutrix about your order #${shortId(o.id)}.`);

  const change = async (to) => {
    if (['cancelled', 'returned'].includes(to) && !window.confirm(`Mark order #${shortId(o.id)} as ${STATUS[to].label}?`)) return;
    setBusy(true); setMenu(false);
    try { await onStatus(o.id, to); } finally { setBusy(false); }
  };

  return (
    <article className={`ax-order tone-${st.tone}`}>
      <header className="ax-order-head">
        <div>
          <strong>#{shortId(o.id)}</strong>
          <span className="ax-muted"> · {fmtDate(o.created_at, true)}</span>
        </div>
        <span className={`ax-chip tone-${st.tone}`}>{st.label}</span>
      </header>

      <div className="ax-order-body">
        {o.image && <img src={o.image} alt="" loading="lazy" />}
        <div className="ax-order-info">
          <p className="ax-order-items">{String(o.product_name || '').replace(/\s*\|\s*COD\s*$/i, '')}</p>
          <div className="ax-order-money">
            <strong>{inr(o.price)}</strong>
            <span className={`ax-pay ${cod ? 'cod' : 'paid'}`}>{cod ? (isLost(o) || k === 'delivered' ? 'COD' : `COD · collect ${inr(o.price)}`) : 'Paid online'}</span>
            {o.coupon_code && <span className="ax-pay coupon"><Tag size={11} /> {o.coupon_code}</span>}
          </div>
        </div>
      </div>

      {!compact && (
        <div className="ax-order-customer">
          <strong>{o.customer_name}</strong>
          <span>{o.customer_mobile ? `+91 ${o.customer_mobile}` : ''}</span>
          <span className="ax-addr"><MapPin size={13} /> {[o.shipping_address, o.city, o.state, o.pincode].filter(Boolean).join(', ')}</span>
        </div>
      )}

      <div className="ax-order-actions">
        {o.customer_mobile && <a className="ax-icon-act" href={`tel:+91${String(o.customer_mobile).replace(/\D/g, '').slice(-10)}`} aria-label="Call customer"><Phone size={16} /><span>Call</span></a>}
        {wa && <a className="ax-icon-act wa" href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp customer"><MessageCircle size={16} /><span>WhatsApp</span></a>}
        <button type="button" className="ax-icon-act" onClick={async () => { if (await copyText(fullAddress(o))) { setCopied(true); setTimeout(() => setCopied(false), 1800); } }}>
          {copied ? <Check size={16} /> : <Copy size={16} />}<span>{copied ? 'Copied' : 'Address'}</span>
        </button>
        <button type="button" className="ax-icon-act" onClick={() => setShowInvoice(true)}><FileText size={16} /><span>Invoice</span></button>
      </div>

      {!readOnly && (next || !isLost(o)) && (
        <div className="ax-order-status">
          {next && (
            <button type="button" className="ax-btn ax-btn-dark" disabled={busy} onClick={() => change(next.to)}>
              {busy ? 'Saving…' : next.label}
            </button>
          )}
          <div className="ax-more">
            <button type="button" className="ax-btn ax-btn-light" onClick={() => setMenu(m => !m)} aria-expanded={menu}>
              Change <ChevronDown size={15} />
            </button>
            {menu && (
              <div className="ax-menu" role="menu">
                {Object.entries(STATUS).filter(([key]) => key !== k).map(([key, v]) => (
                  <button type="button" role="menuitem" key={key} onClick={() => change(key)} className={v.tone === 'bad' ? 'bad' : ''}>{v.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {!readOnly && next && ['shipped', 'out_for_delivery', 'delivered'].includes(next.to) && (
        <p className="ax-hint">Customer gets a WhatsApp update automatically.</p>
      )}

      {showInvoice && <ProfessionalInvoice order={o} onClose={() => setShowInvoice(false)} />}
    </article>
  );
};

const AdminOrders = ({ orders, loading, onStatus, readOnly, initialFilter = 'open' }) => {
  const [filter, setFilter] = useState(initialFilter);
  const [q, setQ] = useState('');

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.id, orders.filter(f.test).length])), [orders]);
  const list = useMemo(() => {
    const f = FILTERS.find(x => x.id === filter) || FILTERS[0];
    const s = q.trim().toLowerCase().replace(/^#/, '');
    return orders.filter(f.test).filter(o => !s || [o.id, o.customer_name, o.customer_mobile, o.city, o.pincode, o.product_name]
      .some(v => String(v || '').toLowerCase().includes(s)));
  }, [orders, filter, q]);

  return (
    <div className="ax-page">
      <div className="ax-page-head">
        <h1>Orders</h1>
        <p className="ax-muted">{counts.open} to ship · {counts.transit} on the way</p>
      </div>

      <label className="ax-search">
        <Search size={16} />
        <input type="search" placeholder="Search name, mobile, order #, city…" value={q} onChange={e => setQ(e.target.value)} />
      </label>

      <div className="ax-chips" role="tablist">
        {FILTERS.map(f => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
            {f.label} <em>{counts[f.id]}</em>
          </button>
        ))}
      </div>

      {loading ? <p className="ax-muted">Loading orders…</p> : list.length === 0 ? (
        <div className="ax-empty">No orders here{q ? ' for this search' : ''}.</div>
      ) : (
        <div className="ax-list">{list.map(o => <OrderCard key={o.id} order={o} onStatus={onStatus} readOnly={readOnly} />)}</div>
      )}
    </div>
  );
};

export default AdminOrders;
