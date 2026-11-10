import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCcw, Phone, Mail, Check, RotateCcw, MessageCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Admin → Messages: contact-form messages sent from /support.
const fmt = (iso) => { try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const waLink = (phone) => {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;
  return d ? `https://wa.me/${d}` : null;
};

const MessagesTab = () => {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('new');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    let q = supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(200);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error: e } = await q;
    if (e) { setError(e.message.includes('does not exist') ? 'Messages table is not set up yet.' : e.message); setRows([]); return; }
    setRows(data || []);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    const { error: e } = await supabase.from('contact_messages').update({ status }).eq('id', id);
    if (e) { setError(e.message); return; }
    setRows(r => (filter === 'all' ? r.map(x => x.id === id ? { ...x, status } : x) : r.filter(x => x.id !== id)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {['new', 'done', 'all'].map(f => (
          <button key={f} className={`admin-btn ${filter === f ? 'admin-btn-primary' : ''}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
        ))}
        <button className="admin-btn" onClick={load} style={{ marginLeft: 'auto' }}><RefreshCcw size={16} /> Refresh</button>
      </div>
      {error && <p style={{ color: '#b42318' }}>{error}</p>}
      {rows === null ? <p>Loading…</p> : rows.length === 0 ? (
        <p style={{ color: '#666' }}>No {filter === 'all' ? '' : filter} messages.</p>
      ) : rows.map(m => (
        <div key={m.id} style={{ border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <strong>{m.name}</strong>
            <span style={{ color: '#888', fontSize: 13 }}>{fmt(m.created_at)}{m.order_id ? ` · Order ${m.order_id}` : ''}</span>
          </div>
          <p style={{ whiteSpace: 'pre-wrap', margin: '10px 0', color: '#222' }}>{m.message}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 14 }}>
            {m.phone && <a href={`tel:${m.phone}`} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Phone size={14} /> {m.phone}</a>}
            {waLink(m.phone) && <a href={waLink(m.phone)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><MessageCircle size={14} /> WhatsApp</a>}
            {m.email && <a href={`mailto:${m.email}`} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Mail size={14} /> {m.email}</a>}
            <span style={{ marginLeft: 'auto' }}>
              {m.status === 'new'
                ? <button className="admin-btn admin-btn-primary" onClick={() => setStatus(m.id, 'done')}><Check size={16} /> Mark done</button>
                : <button className="admin-btn" onClick={() => setStatus(m.id, 'new')}><RotateCcw size={16} /> Mark new</button>}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessagesTab;
