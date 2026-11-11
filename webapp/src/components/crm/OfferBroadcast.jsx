import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Megaphone, Send, Check, AlertTriangle, Clock, RefreshCcw, ExternalLink, UserPlus, Square, ChevronDown,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { offerStatus, estimateCost, MARKETING_RATE_INR, prettyPhone } from './contactUtils';
import { callBroadcast } from './contactsApi';

const shortName = (n) => String(n || '').replace(/^Pure\s*Nutrix\s+/i, '').split(/\s+[-|–(]\s*/)[0].slice(0, 60);
const firstName = (n) => {
  const f = String(n || '').trim().split(/\s+/)[0];
  return f && /[a-z]/i.test(f) ? f.charAt(0).toUpperCase() + f.slice(1) : 'there';
};
const inr = (n) => `₹${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;
const when = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const TEMPLATE_INFO = {
  APPROVED: { tone: 'good', text: 'Approved by Meta — ready to send.' },
  PENDING: { tone: 'wait', text: 'Meta is reviewing the offer template. This usually takes a few minutes, sometimes up to 24 hours.' },
  IN_APPEAL: { tone: 'wait', text: 'The template is in appeal with Meta.' },
  REJECTED: { tone: 'bad', text: 'Meta rejected the offer template.' },
  PAUSED: { tone: 'bad', text: 'Meta paused this template because of low quality (people blocked or reported it). Wait and send less often.' },
  DISABLED: { tone: 'bad', text: 'Meta disabled this template.' },
  MISSING: { tone: 'wait', text: 'One-time step: submit the offer message format to Meta. After approval you can send any offer on any product with it.' },
};

const HistoryItem = ({ b }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const [reads, setReads] = useState(null);

  const load = async () => {
    const { data } = await supabase.from('whatsapp_broadcast_recipients')
      .select('phone_number, name, status, error, meta_message_id').eq('broadcast_id', b.id).order('id');
    setRows(data || []);
    const ids = (data || []).map((r) => r.meta_message_id).filter(Boolean);
    if (ids.length) {
      const { data: msgs } = await supabase.from('whatsapp_messages').select('meta_message_id, status').in('meta_message_id', ids);
      const by = Object.fromEntries((msgs || []).map((m) => [m.meta_message_id, m.status]));
      setReads(by);
    } else setReads({});
  };

  const counts = useMemo(() => {
    if (!reads) return null;
    const v = Object.values(reads);
    return { delivered: v.filter((s) => s === 'delivered' || s === 'read').length, read: v.filter((s) => s === 'read').length };
  }, [reads]);

  return (
    <li className="pnb-hist">
      <button type="button" className="pnb-hist-head" onClick={() => { setOpen(!open); if (!rows) load(); }} aria-expanded={open}>
        <span className="pnb-hist-main">
          <strong>{b.product_name}</strong>
          <span>{b.offer_text}</span>
        </span>
        <span className="pnb-hist-meta">
          <span>{when(b.created_at)}</span>
          <span className={`pnb-pill ${b.status === 'done' ? 'good' : b.status === 'stopped' ? 'bad' : 'wait'}`}>
            {b.status === 'sending' ? 'Sending' : b.status === 'stopped' ? 'Stopped' : 'Sent'} · {b.sent}/{b.total}
          </span>
        </span>
        <ChevronDown size={16} className={open ? 'rot' : ''} />
      </button>
      {open && (
        <div className="pnb-hist-body">
          {counts && <p className="pnb-muted">{b.sent} sent · {counts.delivered} delivered · {counts.read} read{b.failed ? ` · ${b.failed} failed` : ''}</p>}
          {!rows ? <p className="pnb-muted">Loading…</p> : (
            <ul>
              {rows.map((r) => (
                <li key={r.phone_number}>
                  <span>{r.name || 'Customer'} <small>{prettyPhone(r.phone_number)}</small></span>
                  <span className={`pnb-st st-${r.status}`} title={r.error || ''}>
                    {r.status === 'sent' ? (reads?.[r.meta_message_id] || 'sent') : r.status}
                  </span>
                  {r.error && <small className="pnb-err">{r.error}</small>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
};

const OfferBroadcast = ({ contacts, onAddContacts, onContactsChanged }) => {
  const [template, setTemplate] = useState(null);
  const [tplError, setTplError] = useState('');
  const [tplBusy, setTplBusy] = useState(false);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [offer, setOffer] = useState('');
  const [audience, setAudience] = useState('all');
  const [testPhone, setTestPhone] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [run, setRun] = useState(null); // { broadcast, pending, sent, failed, done, error }
  const [history, setHistory] = useState([]);
  const stopRef = useRef(false);

  const agreed = useMemo(() => contacts.filter((c) => offerStatus(c) === 'yes'), [contacts]);
  const notAsked = useMemo(() => contacts.filter((c) => offerStatus(c) === 'unknown').length, [contacts]);
  const stopped = useMemo(() => contacts.filter((c) => offerStatus(c) === 'stopped').length, [contacts]);
  const product = products.find((p) => p.id === productId);
  const offerClean = offer.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  const recipients = audience === 'test' ? agreed.filter((c) => c.phone_number === testPhone) : agreed;
  const ready = template?.status === 'APPROVED' && product && offerClean.length >= 5 && recipients.length > 0;

  const loadTemplate = useCallback(async () => {
    setTplError('');
    try { const d = await callBroadcast({ action: 'template' }); setTemplate(d.template); }
    catch (e) { setTplError(e.message); }
  }, []);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from('whatsapp_broadcasts').select('*').order('created_at', { ascending: false }).limit(15);
    setHistory(data || []);
  }, []);

  useEffect(() => {
    loadTemplate();
    loadHistory();
    supabase.from('products').select('id, name, slug, price, original_price, image_urls, stock').order('created_at')
      .then(({ data }) => setProducts((data || []).filter((p) => p.slug)));
  }, [loadTemplate, loadHistory]);

  // Re-check while Meta is reviewing.
  useEffect(() => {
    if (!['PENDING', 'IN_APPEAL'].includes(template?.status)) return undefined;
    const t = setInterval(loadTemplate, 60000);
    return () => clearInterval(t);
  }, [template?.status, loadTemplate]);

  const submitTemplate = async () => {
    if (!window.confirm('Submit the offer message format to Meta for approval? (Free. Nothing is sent to customers.)')) return;
    setTplBusy(true); setTplError('');
    try { const d = await callBroadcast({ action: 'create_template' }); setTemplate(d.template); }
    catch (e) { setTplError(e.message); }
    finally { setTplBusy(false); }
  };

  const sendLoop = async (broadcast, pendingAtStart) => {
    stopRef.current = false;
    let state = { broadcast, pending: pendingAtStart, sent: broadcast.sent || 0, failed: broadcast.failed || 0, done: false };
    setRun(state);
    while (!state.done && !stopRef.current) {
      try {
        const d = await callBroadcast({ action: 'send', broadcast_id: broadcast.id });
        state = { broadcast: d.broadcast || broadcast, pending: d.pending, sent: d.broadcast?.sent ?? state.sent, failed: d.broadcast?.failed ?? state.failed, done: d.done };
        setRun(state);
      } catch (e) {
        setRun({ ...state, error: `${e.message}. Tap "Continue" to resume — already-sent people are not messaged again.` });
        return;
      }
    }
    if (stopRef.current && !state.done) {
      await callBroadcast({ action: 'stop', broadcast_id: broadcast.id }).catch(() => {});
      setRun({ ...state, done: true, stopped: true });
    }
    loadHistory();
    onContactsChanged?.();
  };

  const start = async () => {
    setConfirming(false);
    setRun({ starting: true });
    try {
      const d = await callBroadcast({
        action: 'start', product_id: product.id, offer_text: offerClean,
        phones: audience === 'test' ? [testPhone] : undefined,
      });
      if (!d.pending) {
        setRun({ broadcast: d.broadcast, pending: 0, sent: 0, failed: 0, done: true, note: `${d.skipped} skipped — they already got an offer in the last 24 hours.` });
        loadHistory();
        return;
      }
      await sendLoop(d.broadcast, d.pending);
    } catch (e) {
      setRun({ error: e.message, done: true });
    }
  };

  const resumable = history.find((b) => b.status === 'sending');
  const busy = run && !run.done && !run.error;
  const total = run?.broadcast?.total || 0;
  const pct = total ? Math.round(((run.sent + run.failed) / total) * 100) : 0;
  const info = TEMPLATE_INFO[template?.status] || (template ? { tone: 'wait', text: `Template status: ${template.status}` } : null);

  return (
    <div className="pnb">
      <div className="crm-section-header">
        <div>
          <h2>Offer broadcast</h2>
          <p>Send a new product offer to everyone who agreed to get offers — in one go.</p>
        </div>
      </div>

      {/* Step 1: template */}
      <section className={`pnb-card pnb-template tone-${info?.tone || 'wait'}`}>
        <div className="pnb-step">1</div>
        <div className="pnb-card-main">
          <h3>Offer message format <span className="pnb-muted">(Meta template “pn_product_offer”)</span></h3>
          {!template && !tplError && <p className="pnb-muted">Checking with Meta…</p>}
          {info && <p>{info.text}{template?.rejected_reason && template.rejected_reason !== 'NONE' ? ` Reason: ${template.rejected_reason}` : ''}</p>}
          {tplError && <p className="pnb-error"><AlertTriangle size={15} /> {tplError}</p>}
          <div className="pnb-row">
            {template?.status === 'MISSING' && (
              <button type="button" className="admin-btn admin-btn-primary" onClick={submitTemplate} disabled={tplBusy}>
                {tplBusy ? 'Submitting…' : 'Submit to Meta for approval'}
              </button>
            )}
            {template?.status !== 'APPROVED' && (
              <button type="button" className="admin-btn admin-btn-secondary" onClick={loadTemplate}><RefreshCcw size={14} /> Check again</button>
            )}
          </div>
        </div>
      </section>

      {resumable && !busy && (
        <section className="pnb-card tone-wait">
          <div className="pnb-card-main">
            <h3><Clock size={16} /> A broadcast did not finish</h3>
            <p>{resumable.product_name}: {resumable.sent} of {resumable.total} sent. Continue to send to the rest (nobody gets it twice).</p>
            <div className="pnb-row">
              <button type="button" className="admin-btn admin-btn-primary" onClick={() => sendLoop(resumable, resumable.total - resumable.sent - resumable.failed)}>Continue</button>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={async () => { await callBroadcast({ action: 'stop', broadcast_id: resumable.id }).catch(() => {}); loadHistory(); }}>Cancel the rest</button>
            </div>
          </div>
        </section>
      )}

      <div className="pnb-grid">
        {/* Step 2: compose */}
        <section className="pnb-card">
          <div className="pnb-step">2</div>
          <div className="pnb-card-main">
            <h3>Product &amp; offer</h3>
            <div className="pnb-products" role="radiogroup" aria-label="Product">
              {products.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={productId === p.id}
                  className={`pnb-product ${productId === p.id ? 'on' : ''}`} onClick={() => setProductId(p.id)}>
                  {p.image_urls?.[0] ? <img src={p.image_urls[0]} alt="" loading="lazy" /> : <span className="pnb-noimg" />}
                  <span className="pnb-pname">{shortName(p.name)}</span>
                  <span className="pnb-pprice">{inr(p.price)}{p.original_price > p.price && <s>{inr(p.original_price)}</s>}</span>
                  {productId === p.id && <Check size={16} className="pnb-tick" />}
                </button>
              ))}
            </div>

            <label className="pnb-label" htmlFor="pnb-offer">Offer details</label>
            <textarea id="pnb-offer" className="admin-input pnb-offer" rows={3} maxLength={300} value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="e.g. Flat 15% off with code GLOW15 — valid till Sunday. Free delivery." />
            <div className="pnb-hint">
              <span>Write the real offer: discount, code, last date. Keep it true — no fake urgency.</span>
              <span>{offerClean.length}/300</span>
            </div>
          </div>
        </section>

        {/* Preview */}
        <section className="pnb-card pnb-preview-card">
          <h3>Preview</h3>
          <div className="pnb-phone">
            <div className="pnb-bubble">
              <strong>New offer from Pure Nutrix</strong>
              <p>Hi {firstName(recipients[0]?.name || 'Rahul')}, there is a new offer on {product ? shortName(product.name) : '[product]'}.</p>
              <p>{offerClean || '[offer details]'}</p>
              <p>Tap Shop now to see the product and the offer price on our website.</p>
              <small>Reply STOP to stop offer messages</small>
              <span className="pnb-btn"><ExternalLink size={14} /> Shop now</span>
            </div>
          </div>
          {product && <p className="pnb-muted">Button opens purenutrix.in/product/{product.slug.slice(0, 32)}{product.slug.length > 32 ? '…' : ''}</p>}
        </section>
      </div>

      {/* Step 3: audience + send */}
      <section className="pnb-card">
        <div className="pnb-step">3</div>
        <div className="pnb-card-main">
          <h3>Who gets it</h3>
          <div className="pnb-aud">
            <div><strong>{agreed.length}</strong><span>agreed to offers</span></div>
            <div><strong>{notAsked}</strong><span>not asked yet</span></div>
            <div><strong>{stopped}</strong><span>replied STOP</span></div>
          </div>
          {agreed.length === 0 ? (
            <div className="pnb-empty">
              <p>No contact has agreed to get offers yet. Add contacts (tick “agreed to get offers”), or mark people in Contacts.</p>
              <button type="button" className="admin-btn admin-btn-primary" onClick={onAddContacts}><UserPlus size={15} /> Add contacts</button>
            </div>
          ) : (
            <>
              <div className="pnb-choice">
                <label><input type="radio" name="pnb-aud" checked={audience === 'all'} onChange={() => setAudience('all')} /> Everyone who agreed ({agreed.length})</label>
                <label><input type="radio" name="pnb-aud" checked={audience === 'test'} onChange={() => setAudience('test')} /> Test first: only one person</label>
                {audience === 'test' && (
                  <select className="admin-input" value={testPhone} onChange={(e) => setTestPhone(e.target.value)}>
                    <option value="">Choose a contact…</option>
                    {agreed.map((c) => <option key={c.phone_number} value={c.phone_number}>{c.name || 'Customer'} · {prettyPhone(c.phone_number)}</option>)}
                  </select>
                )}
              </div>
              <p className="pnb-cost">
                Estimated Meta charge: <strong>about {inr(estimateCost(recipients.length))}</strong> for {recipients.length} message{recipients.length === 1 ? '' : 's'}
                <span className="pnb-muted"> (₹{MARKETING_RATE_INR} + 18% GST each, billed by Meta to your WhatsApp account). People who got an offer in the last 24 hours are skipped.</span>
              </p>
              <button type="button" className="admin-btn admin-btn-primary pnb-send" disabled={!ready || busy} onClick={() => setConfirming(true)}>
                <Send size={16} /> Send offer to {recipients.length} {recipients.length === 1 ? 'person' : 'people'}
              </button>
              {!ready && !busy && (
                <p className="pnb-muted pnb-why">
                  {template?.status !== 'APPROVED' ? 'Waiting for Meta to approve the offer format (step 1).' : !product ? 'Pick a product.' : offerClean.length < 5 ? 'Write the offer details.' : 'Choose who gets it.'}
                </p>
              )}
            </>
          )}

          {run && (
            <div className={`pnb-run ${run.error ? 'is-error' : run.done ? 'is-done' : ''}`} aria-live="polite">
              {run.starting ? <p>Preparing…</p> : (
                <>
                  {total > 0 && <div className="pnb-bar"><span style={{ width: `${pct}%` }} /></div>}
                  <p>
                    {run.done && !run.error ? (run.stopped ? 'Stopped. ' : 'Done! ') : ''}
                    {total > 0 && <>{run.sent} sent{run.failed ? ` · ${run.failed} failed` : ''}{!run.done ? ` · ${run.pending} to go` : ''}</>}
                    {run.note && <> {run.note}</>}
                  </p>
                  {run.error && <p className="pnb-error"><AlertTriangle size={15} /> {run.error}</p>}
                  <div className="pnb-row">
                    {busy && <button type="button" className="admin-btn admin-btn-secondary" onClick={() => { stopRef.current = true; }}><Square size={14} /> Stop</button>}
                    {run.error && run.broadcast && <button type="button" className="admin-btn admin-btn-primary" onClick={() => sendLoop(run.broadcast, run.pending)}>Continue</button>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="pnb-card">
        <div className="pnb-card-main">
          <h3><Megaphone size={16} /> Past broadcasts</h3>
          {history.length === 0 ? <p className="pnb-muted">No offers sent yet.</p> : (
            <ul className="pnb-history">{history.map((b) => <HistoryItem key={b.id} b={b} />)}</ul>
          )}
        </div>
      </section>

      {confirming && createPortal(
        <div className="crm-modal-overlay" onClick={() => setConfirming(false)}>
          <div className="crm-modal pnb-confirm" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Confirm broadcast">
            <div className="crm-modal-body">
              <h3>Send this offer now?</h3>
              <dl>
                <dt>Product</dt><dd>{shortName(product.name)}</dd>
                <dt>Offer</dt><dd>{offerClean}</dd>
                <dt>To</dt><dd>{recipients.length} {recipients.length === 1 ? 'person' : 'people'} who agreed to offers</dd>
                <dt>Meta charge</dt><dd>about {inr(estimateCost(recipients.length))}</dd>
              </dl>
              <p className="pnb-muted">Messages can't be taken back once sent.</p>
              <div className="crm-modal-actions">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setConfirming(false)}>Cancel</button>
                <button type="button" className="admin-btn admin-btn-primary" onClick={start}><Send size={15} /> Yes, send to {recipients.length}</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default OfferBroadcast;
