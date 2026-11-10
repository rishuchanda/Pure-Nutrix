import React, { useEffect, useState, useCallback } from 'react';
import { BellRing, Smartphone, Mail, Send, CheckCircle2, Share, PlusSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Admin → Overview → Order alerts.
// Turns this phone/browser into an order-alert device (Web Push via the
// notify-new-order function) and stores the email address for order emails.

const FN = 'notify-new-order';
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
const sameKey = (buf, bytes) => {
  if (!buf) return false;
  const a = new Uint8Array(buf);
  return a.length === bytes.length && a.every((v, i) => v === bytes[i]);
};
const deviceName = () => {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || isIOS()) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'Browser';
};

const box = { background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: 16, padding: 20, marginBottom: 24, boxShadow: 'var(--admin-shadow)' };
const row = { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' };
const muted = { color: 'var(--admin-text-muted)', fontSize: 14, margin: 0 };

const OrderAlertsCard = ({ adminEmail }) => {
  const [state, setState] = useState('checking'); // checking | needs-install | unsupported | blocked | off | on
  const [devices, setDevices] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState('');

  const refresh = useCallback(async () => {
    const { count } = await supabase.from('admin_push_subscriptions').select('id', { count: 'exact', head: true });
    setDevices(count || 0);
    const { data: s } = await supabase.from('order_alert_settings').select('alert_email').eq('id', 1).maybeSingle();
    setEmail(s?.alert_email || adminEmail || '');
    setEmailSaved(s?.alert_email || '');

    if (!pushSupported()) { setState(isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'); return; }
    if (Notification.permission === 'denied') { setState('blocked'); return; }
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (!sub) { setState('off'); return; }
    const { data } = await supabase.from('admin_push_subscriptions').select('id').eq('endpoint', sub.endpoint).maybeSingle();
    setState(data ? 'on' : 'off');
  }, [adminEmail]);

  useEffect(() => { refresh().catch(() => setState('unsupported')); }, [refresh]);

  const enable = async () => {
    setBusy(true); setNote('');
    try {
      // Must be asked straight from the tap (iPhone rule).
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'blocked' : 'off'); return; }
      const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
      await navigator.serviceWorker.ready;
      const { data: k, error: kErr } = await supabase.functions.invoke(FN, { body: { action: 'public_key' } });
      if (kErr || !k?.public_key) throw new Error('Could not reach the alert service. Is the notify-new-order function deployed?');
      const appKey = keyToBytes(k.public_key);
      let sub = await reg.pushManager.getSubscription();
      if (sub && !sameKey(sub.options?.applicationServerKey, appKey)) { await sub.unsubscribe(); sub = null; }
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
      const json = sub.toJSON();
      const { error } = await supabase.from('admin_push_subscriptions')
        .upsert({ endpoint: json.endpoint, subscription: json, device: deviceName() }, { onConflict: 'endpoint' });
      if (error) throw error;
      setNote('Done. Sending a test alert…');
      await test();
      await refresh();
    } catch (e) {
      setNote(e.message || String(e));
    } finally { setBusy(false); }
  };

  const test = async () => {
    const { data, error } = await supabase.functions.invoke(FN, { body: { action: 'test', email: Boolean(emailSaved) } });
    if (error) { setNote('Test failed: ' + error.message); return; }
    const p = data?.push || {};
    setNote(`Test sent to ${p.sent || 0} of ${p.devices || 0} device(s).${data?.email && data.email !== 'not requested' ? ` Email: ${data.email}.` : ''}`);
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg && await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from('admin_push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      setNote('Alerts turned off on this device.');
      await refresh();
    } finally { setBusy(false); }
  };

  const saveEmail = async () => {
    const v = email.trim();
    if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { setNote('Please enter a valid email.'); return; }
    const { error } = await supabase.from('order_alert_settings').upsert({ id: 1, alert_email: v || null, updated_at: new Date().toISOString() });
    if (error) { setNote(error.message); return; }
    setEmailSaved(v); setNote(v ? 'Email saved.' : 'Email alerts off.');
  };

  return (
    <div className="order-alerts-card" style={box}>
      <div style={{ ...row, justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center', fontSize: 18 }}><BellRing size={20} /> Order alerts</h3>
        <span style={{ ...muted, fontSize: 13 }}>{devices} device{devices === 1 ? '' : 's'} getting alerts</span>
      </div>

      {state === 'checking' && <p style={muted}>Checking this device…</p>}

      {state === 'needs-install' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>iPhone: first add this page to your Home Screen</p>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}>
            <li>Open <b>purenutrix.in/admin</b> in <b>Safari</b>.</li>
            <li>Tap <Share size={14} style={{ verticalAlign: '-2px' }} /> <b>Share</b> → <PlusSquare size={14} style={{ verticalAlign: '-2px' }} /> <b>Add to Home Screen</b> → Add.</li>
            <li>Open <b>PN Admin</b> from the Home Screen, log in, and tap <b>Turn on alerts</b> here.</li>
          </ol>
          <p style={muted}>Apple only allows website notifications from a Home Screen app (iOS 16.4 or newer).</p>
        </div>
      )}

      {state === 'unsupported' && <p style={muted}>This browser can't receive notifications. Use Safari (iPhone, from the Home Screen app) or Chrome.</p>}

      {state === 'blocked' && (
        <p style={muted}>Notifications are blocked for this app. iPhone: Settings → Notifications → PN Admin → Allow. Then reopen this page.</p>
      )}

      {(state === 'off' || state === 'on') && (
        <div style={row}>
          {state === 'on'
            ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: '#16a34a', fontWeight: 600 }}><CheckCircle2 size={18} /> On for this {deviceName()}</span>
            : <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', ...muted }}><Smartphone size={16} /> Off on this device</span>}
          {state === 'off'
            ? <button className="admin-btn admin-btn-primary" disabled={busy} onClick={enable}><BellRing size={16} /> {busy ? 'Turning on…' : 'Turn on alerts'}</button>
            : <>
                <button className="admin-btn" disabled={busy} onClick={test}><Send size={16} /> Send test</button>
                <button className="admin-btn" disabled={busy} onClick={turnOff}>Turn off</button>
              </>}
        </div>
      )}

      <div style={{ ...row, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--admin-border)' }}>
        <Mail size={16} />
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email for order alerts"
          style={{ flex: '1 1 220px', minWidth: 0, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'transparent', color: 'inherit', fontSize: 14 }}
        />
        <button className="admin-btn" onClick={saveEmail}>{emailSaved && emailSaved === email.trim() ? 'Saved' : 'Save'}</button>
      </div>
      <p style={{ ...muted, fontSize: 12, marginTop: 6 }}>Emails start once the RESEND_API_KEY secret is added in Supabase → Edge Functions → Secrets.</p>

      {note && <p style={{ margin: '12px 0 0', fontSize: 14 }}>{note}</p>}
    </div>
  );
};

export default OrderAlertsCard;
