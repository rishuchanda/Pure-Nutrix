import React, { useEffect, useMemo, useState } from 'react';
import { X, UserPlus, Users, ShoppingBag, Upload, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { waPhone, parseContacts, prettyPhone } from './contactUtils';
import { saveContacts } from './contactsApi';

const TABS = [
  { id: 'one', label: 'Single', icon: UserPlus },
  { id: 'many', label: 'Paste / CSV', icon: Users },
  { id: 'orders', label: 'Past buyers', icon: ShoppingBag },
];

const ConsentBox = ({ checked, onChange, count }) => (
  <label className="pnc-consent">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>
      <strong>{count > 1 ? `These ${count} people` : 'This person'} agreed to get offers from Pure Nutrix on WhatsApp</strong>
      <small>WhatsApp rules: send offers only to people who said yes. Untick if you are not sure — you can still chat with them, they just won't get offer broadcasts.</small>
    </span>
  </label>
);

const AddContactsModal = ({ onClose, onSaved, onOpenChat, existingPhones = [] }) => {
  const [tab, setTab] = useState('one');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [paste, setPaste] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [orderPeople, setOrderPeople] = useState(null);

  useEffect(() => { setOptIn(false); setError(''); setDone(null); }, [tab]);

  useEffect(() => {
    if (tab !== 'orders' || orderPeople) return;
    supabase.from('orders').select('customer_name, customer_mobile, created_at').order('created_at', { ascending: false })
      .then(({ data, error: e }) => {
        if (e) { setError(e.message); return; }
        const map = new Map();
        (data || []).forEach((o) => {
          const p = waPhone(o.customer_mobile);
          if (p && !map.has(p)) map.set(p, { phone_number: p, name: (o.customer_name || '').trim() || null });
        });
        setOrderPeople([...map.values()]);
      });
  }, [tab, orderPeople]);

  const parsed = useMemo(() => parseContacts(paste), [paste]);
  const known = useMemo(() => new Set(existingPhones), [existingPhones]);
  const onePhone = waPhone(mobile);

  const readFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2e6) { setError('File is too big (max 2 MB).'); return; }
    f.text().then((t) => setPaste(t));
    e.target.value = '';
  };

  const save = async (list, source) => {
    setBusy(true); setError('');
    try {
      const r = await saveContacts(list, { optIn, source });
      setDone(r);
      onSaved?.();
      return r;
    } catch (e) {
      setError(e.message || 'Could not save contacts');
    } finally { setBusy(false); }
  };

  const submitOne = async (e) => {
    e.preventDefault();
    if (!onePhone) { setError('Please enter a valid 10-digit Indian mobile number.'); return; }
    const r = await save([{ phone_number: onePhone, name: name.trim() || null }], 'manual');
    if (r) { setName(''); setMobile(''); }
  };

  const list = tab === 'many' ? parsed.valid : tab === 'orders' ? (orderPeople || []) : [];
  const newCount = list.filter((c) => !known.has(c.phone_number)).length;

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal pnc-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add contacts">
        <div className="crm-modal-header">
          <h3><UserPlus size={20} /> Add contacts</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="pnc-tabs" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
                className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="pnc-body">
          {tab === 'one' && (
            <form onSubmit={submitOne}>
              <label className="pnc-field">Name
                <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Raman Sharma" />
              </label>
              <label className="pnc-field">WhatsApp mobile number *
                <input className="admin-input" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="98765 43210" required />
                <small className={mobile && !onePhone ? 'pnc-bad' : ''}>
                  {mobile ? (onePhone ? `Will be saved as ${prettyPhone(onePhone)}${known.has(onePhone) ? ' (already in contacts)' : ''}` : '10-digit Indian mobile number') : '10 digits is enough, +91 is added for you'}
                </small>
              </label>
              <ConsentBox checked={optIn} onChange={setOptIn} count={1} />
              <div className="pnc-actions">
                <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || !mobile}>{busy ? 'Saving…' : 'Save contact'}</button>
                {onOpenChat && onePhone && (
                  <button type="button" className="admin-btn admin-btn-secondary" disabled={busy}
                    onClick={async () => { const r = await save([{ phone_number: onePhone, name: name.trim() || null }], 'manual'); if (r) onOpenChat({ phone_number: onePhone, name: name.trim() || null }); }}>
                    Save &amp; open chat
                  </button>
                )}
              </div>
            </form>
          )}

          {tab === 'many' && (
            <>
              <p className="pnc-help">One person per line — <code>Name, 9876543210</code> or just the number. You can also upload a CSV with <em>name</em> and <em>phone</em> columns (export from Excel / Google Contacts).</p>
              <textarea className="admin-input pnc-paste" rows={7} value={paste} onChange={(e) => setPaste(e.target.value)}
                placeholder={'Rahul Verma, 9876543210\nPriya 98111 22333\n9123456789'} />
              <label className="pnc-file"><Upload size={15} /> Upload CSV / TXT
                <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={readFile} hidden />
              </label>
              {paste.trim() && (
                <div className="pnc-summary">
                  <span className="good">{parsed.valid.length} valid</span>
                  <span>{newCount} new · {parsed.valid.length - newCount} already saved</span>
                  {parsed.duplicates > 0 && <span>{parsed.duplicates} repeated</span>}
                  {parsed.invalid.length > 0 && <span className="bad">{parsed.invalid.length} skipped (no valid mobile)</span>}
                </div>
              )}
              {parsed.invalid.length > 0 && (
                <details className="pnc-invalid"><summary>See skipped lines</summary>
                  <ul>{parsed.invalid.slice(0, 20).map((l, i) => <li key={i}>{l}</li>)}</ul>
                </details>
              )}
              {parsed.valid.length > 0 && <ConsentBox checked={optIn} onChange={setOptIn} count={parsed.valid.length} />}
              <div className="pnc-actions">
                <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !parsed.valid.length}
                  onClick={async () => { const r = await save(parsed.valid, 'import'); if (r) setPaste(''); }}>
                  {busy ? 'Saving…' : `Save ${parsed.valid.length || ''} contacts`}
                </button>
              </div>
            </>
          )}

          {tab === 'orders' && (
            <>
              <p className="pnc-help">Everyone who has ordered on the website, one entry per mobile number.</p>
              {!orderPeople ? <p className="pnc-help">Loading orders…</p> : (
                <>
                  <div className="pnc-summary">
                    <span className="good">{orderPeople.length} customers</span>
                    <span>{newCount} not in contacts yet</span>
                  </div>
                  <ul className="pnc-preview">
                    {orderPeople.slice(0, 50).map((c) => (
                      <li key={c.phone_number}><span>{c.name || 'Customer'}</span><span>{prettyPhone(c.phone_number)}</span>{known.has(c.phone_number) && <em>saved</em>}</li>
                    ))}
                  </ul>
                  {orderPeople.length > 0 && <ConsentBox checked={optIn} onChange={setOptIn} count={orderPeople.length} />}
                  <div className="pnc-actions">
                    <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !orderPeople.length} onClick={() => save(orderPeople, 'order')}>
                      {busy ? 'Saving…' : `Add ${orderPeople.length} customers`}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {error && <p className="pnc-error"><AlertTriangle size={15} /> {error}</p>}
          {done && (
            <p className="pnc-done">
              <Check size={15} /> {done.added} added{done.updated ? `, ${done.updated} updated` : ''}{done.optedIn ? ` · ${done.optedIn} will get offers` : ''}
              {done.stoppedSkipped ? ` · ${done.stoppedSkipped} had replied STOP, kept off the offer list` : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddContactsModal;
