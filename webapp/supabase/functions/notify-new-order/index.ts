// notify-new-order — sends the shop owner a phone notification (Web Push) and,
// when RESEND_API_KEY is set, an email for every new order.
//
// Called three ways (all POST, JSON body):
//   { order_id }            from the database trigger on public.orders (insert)
//   { action: "public_key" } admin page asks for the push key before subscribing
//   { action: "test" }       admin page sends a test alert (admin login required)
//
// No keys live in this file. The Web Push (VAPID) key pair is created by this
// function the first time it runs and kept in public.push_vapid_keys, a table
// only the service role can read. Each order is alerted once (orders.notified_at).

const SUPABASE_URL = (globalThis as any).Deno?.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = (globalThis as any).Deno?.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_KEY = (globalThis as any).Deno?.env.get('RESEND_API_KEY') ?? '';
const ANON_KEY = (globalThis as any).Deno?.env.get('SUPABASE_ANON_KEY') ?? '';
const SITE = 'https://purenutrix.in';
const VAPID_SUBJECT = 'mailto:hello@purenutrix.in';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ---------- small byte helpers ----------
const enc = new TextEncoder();
export function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64url(str: string): Uint8Array {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const bin = atob((str + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

// ---------- VAPID keys ----------
export async function generateVapidKeys() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  return { public_key: b64url(pub), private_jwk: jwk };
}

export async function vapidAuthHeader(endpoint: string, keys: { public_key: string; private_jwk: JsonWebKey }) {
  const aud = new URL(endpoint).origin;
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: VAPID_SUBJECT })));
  const key = await crypto.subtle.importKey('jwk', keys.private_jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${payload}`)));
  return `vapid t=${header}.${payload}.${b64url(sig)}, k=${keys.public_key}`;
}

// ---------- RFC 8291 message encryption (aes128gcm) ----------
export async function encryptPayload(sub: { keys: { p256dh: string; auth: string } }, plaintext: Uint8Array) {
  const uaPublic = unb64url(sub.keys.p256dh);
  const authSecret = unb64url(sub.keys.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));

  const prkKey = await hmac(authSecret, shared);
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1]));
  const ikm = await hmac(prkKey, keyInfo);
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const padded = concat(plaintext, new Uint8Array([2])); // 0x02 = last record
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded));

  const rs = new Uint8Array([0, 0, 0x10, 0]); // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

export async function sendPush(sub: any, message: unknown, keys: { public_key: string; private_jwk: JsonWebKey }) {
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(message)));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthHeader(sub.endpoint, keys),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'high',
    },
    body,
  });
  return res.status;
}

// ---------- database (service role, PostgREST) ----------
async function db(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`db ${path} ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function getVapidKeys() {
  const rows = await db('push_vapid_keys?id=eq.1&select=public_key,private_jwk');
  if (rows?.[0]) return rows[0];
  const fresh = await generateVapidKeys();
  // ignore-duplicates: if two calls race, both then read the same stored row
  await db('push_vapid_keys?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ id: 1, ...fresh }),
  });
  return (await db('push_vapid_keys?id=eq.1&select=public_key,private_jwk'))[0];
}

async function pushToAdmins(message: unknown) {
  const keys = await getVapidKeys();
  const subs = await db('admin_push_subscriptions?select=id,subscription');
  let sent = 0;
  for (const row of subs || []) {
    try {
      const status = await sendPush(row.subscription, message, keys);
      if (status === 404 || status === 410) {
        await db(`admin_push_subscriptions?id=eq.${row.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      } else if (status >= 200 && status < 300) {
        sent++;
      } else {
        console.error('push rejected', status);
      }
    } catch (e) {
      console.error('push failed', e);
    }
  }
  return { devices: (subs || []).length, sent };
}

async function emailOwner(subject: string, html: string) {
  if (!RESEND_KEY) return 'skipped: RESEND_API_KEY not set';
  const rows = await db('order_alert_settings?id=eq.1&select=alert_email,email_enabled');
  const to = rows?.[0]?.alert_email;
  if (!to || rows[0].email_enabled === false) return 'skipped: no alert email';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Pure Nutrix Orders <hello@purenutrix.in>', to: [to], subject, html }),
  });
  return res.ok ? 'sent' : `failed ${res.status}`;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const inr = (n: unknown) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

async function isAdmin(req: Request) {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_crm_admin`, {
    method: 'POST',
    headers: { apikey: ANON_KEY || SERVICE_KEY, Authorization: auth, 'Content-Type': 'application/json' },
    body: '{}',
  });
  return res.ok && (await res.json()) === true;
}

async function handleOrder(orderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: 'bad order id' }, 400);
  // Claim the order: only the first call for an order gets a row back.
  const claimed = await db(`orders?id=eq.${orderId}&notified_at=is.null`, {
    method: 'PATCH',
    body: JSON.stringify({ notified_at: new Date().toISOString() }),
  });
  const o = claimed?.[0];
  if (!o) return json({ ok: true, skipped: 'already notified or not found' });

  const method = o.payment_method || (/\|\s*COD/i.test(o.product_name || '') ? 'COD' : 'Prepaid');
  const title = `🛒 New order · ${inr(o.price)} · ${method}`;
  const body = `${o.customer_name || 'Customer'}${o.city ? ` (${o.city})` : ''}: ${String(o.product_name || '').slice(0, 120)}`;
  const push = await pushToAdmins({ title, body, url: '/admin', tag: `order-${o.id}` });

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
    <h2 style="margin:0 0 8px">New order — ${esc(inr(o.price))} (${esc(method)})</h2>
    <p style="margin:0 0 12px">${esc(new Date(o.created_at || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))}</p>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td><b>Customer</b></td><td>${esc(o.customer_name)} · ${esc(o.customer_mobile)}</td></tr>
      <tr><td><b>Items</b></td><td>${esc(o.product_name)}</td></tr>
      <tr><td><b>Qty</b></td><td>${esc(o.qty)}</td></tr>
      <tr><td><b>Ship to</b></td><td>${esc(o.shipping_address)}, ${esc(o.city)}, ${esc(o.state)} ${esc(o.pincode)}</td></tr>
      ${o.coupon_code ? `<tr><td><b>Coupon</b></td><td>${esc(o.coupon_code)} (−${esc(inr(o.discount_amount))})</td></tr>` : ''}
    </table>
    <p><a href="${SITE}/admin" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Open admin</a></p>
  </div>`;
  const email = await emailOwner(`New order ${inr(o.price)} (${method}) — ${o.customer_name || ''}`, html);
  return json({ ok: true, push, email });
}

export async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === 'public_key') {
      return json({ public_key: (await getVapidKeys()).public_key });
    }
    if (body.action === 'test') {
      if (!(await isAdmin(req))) return json({ error: 'admin only' }, 403);
      const push = await pushToAdmins({ title: '✅ Order alerts are on', body: 'You will get a notification like this for every new order.', url: '/admin', tag: 'test' });
      const email = body.email ? await emailOwner('Test: Pure Nutrix order alerts are on', '<p>Order email alerts are working.</p>') : 'not requested';
      return json({ ok: true, push, email });
    }
    if (body.order_id) return await handleOrder(String(body.order_id));
    return json({ error: 'nothing to do' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
}

if ((globalThis as any).Deno?.serve) (globalThis as any).Deno.serve(handler);
