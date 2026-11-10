import React, { useMemo, useState } from 'react';
import { Search, MessageCircle, Phone } from 'lucide-react';
import { inr, fmtDate, isLost, phone10, waLink } from './adminUtils';

// Customers built from real orders (grouped by mobile number).
const AdminCustomers = ({ orders, loading }) => {
  const [q, setQ] = useState('');
  const customers = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const key = phone10(o.customer_mobile) || o.user_id || o.id;
      const c = map[key] || (map[key] = { key, name: o.customer_name, phone: phone10(o.customer_mobile), city: o.city, orders: 0, spend: 0, last: o.created_at });
      c.orders += 1;
      if (!isLost(o)) c.spend += Number(o.price || 0);
      if (new Date(o.created_at) > new Date(c.last)) { c.last = o.created_at; c.name = o.customer_name || c.name; c.city = o.city || c.city; }
    });
    return Object.values(map).sort((a, b) => new Date(b.last) - new Date(a.last));
  }, [orders]);
  const repeat = customers.filter(c => c.orders > 1).length;
  const list = customers.filter(c => { const s = q.trim().toLowerCase(); return !s || `${c.name} ${c.phone} ${c.city}`.toLowerCase().includes(s); });

  return (
    <div className="ax-page">
      <div className="ax-page-head">
        <h1>Customers</h1>
        <p className="ax-muted">{customers.length} who ordered · {repeat} repeat buyer{repeat === 1 ? '' : 's'}</p>
      </div>
      <label className="ax-search"><Search size={16} /><input type="search" placeholder="Search name, mobile, city…" value={q} onChange={e => setQ(e.target.value)} /></label>
      {loading ? <p className="ax-muted">Loading…</p> : list.length === 0 ? <div className="ax-empty">No customers yet.</div> : (
        <div className="ax-list">
          {list.map(c => (
            <article key={c.key} className="ax-customer">
              <div className="ax-avatar">{(c.name || '?').trim().charAt(0).toUpperCase()}</div>
              <div className="ax-customer-info">
                <strong>{c.name || 'Customer'}</strong>
                <span className="ax-muted">{[c.phone && `+91 ${c.phone}`, c.city].filter(Boolean).join(' · ')}</span>
                <span className="ax-muted">{c.orders} order{c.orders === 1 ? '' : 's'} · {inr(c.spend)} · last {fmtDate(c.last)}</span>
              </div>
              <div className="ax-customer-acts">
                {c.phone && <a className="ax-icon-btn" href={`tel:+91${c.phone}`} aria-label="Call"><Phone size={16} /></a>}
                {c.phone && <a className="ax-icon-btn wa" href={waLink(c.phone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle size={16} /></a>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
