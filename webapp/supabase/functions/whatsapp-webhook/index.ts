import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Verify Token used for Meta Webhook setup
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'purenutrix_verify_123';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

const GRAPH = 'https://graph.facebook.com/v22.0';
// Private bucket. Customer photos/documents are only readable by admins
// (see supabase/migrations/20260930_whatsapp_media.sql).
const MEDIA_BUCKET = 'whatsapp-media';
const MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/3gpp': '3gp',
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/amr': 'amr',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt', 'text/csv': 'csv',
};

const extFor = (mime: string, filename?: string) => {
  const fromName = filename?.includes('.') ? filename.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  return EXT_BY_MIME[mime] || fromName || 'bin';
};

/** Turns any WhatsApp message into { type, body, media } for the inbox. */
function parseMessage(message: any) {
  const type: string = message.type || 'text';
  const media = MEDIA_TYPES.includes(type) ? message[type] : null;

  let body = '';
  switch (type) {
    case 'text':
      body = message.text?.body || '';
      break;
    case 'image': case 'video': case 'document':
      body = media?.caption || '';
      break;
    case 'audio': case 'sticker':
      body = '';
      break;
    case 'location': {
      const l = message.location || {};
      const place = [l.name, l.address].filter(Boolean).join(', ');
      body = `📍 Location${place ? ': ' + place : ''}\nhttps://maps.google.com/?q=${l.latitude},${l.longitude}`;
      break;
    }
    case 'contacts': {
      const c = message.contacts?.[0];
      const name = c?.name?.formatted_name || 'Contact';
      const phone = c?.phones?.[0]?.phone || '';
      body = `👤 ${name}${phone ? ' — ' + phone : ''}`;
      break;
    }
    case 'button':
      body = message.button?.text || '[Button reply]';
      break;
    case 'interactive':
      body = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '[Interactive reply]';
      break;
    case 'reaction':
      body = message.reaction?.emoji ? `Reacted ${message.reaction.emoji}` : 'Removed a reaction';
      break;
    default:
      body = `[${type} message — open WhatsApp to view]`;
  }

  return {
    type,
    body,
    media: media?.id ? {
      id: media.id as string,
      mime: String(media.mime_type || '').split(';')[0].trim(),
      filename: (media.filename as string) || null,
    } : null,
  };
}

/** Downloads a media file from Meta and saves it in the private bucket. */
async function storeInboundMedia(token: string, media: { id: string; mime: string; filename: string | null }, phone: string, messageId: string) {
  const infoRes = await fetch(`${GRAPH}/${media.id}`, { headers: { Authorization: `Bearer ${token}` } });
  const info = await infoRes.json();
  if (!infoRes.ok || !info.url) throw new Error(`media lookup failed: ${info?.error?.message || infoRes.status}`);

  // The file URL itself also needs the token.
  const fileRes = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!fileRes.ok) throw new Error(`media download failed: ${fileRes.status}`);
  const bytes = new Uint8Array(await fileRes.arrayBuffer());

  const mime = String(info.mime_type || media.mime || 'application/octet-stream').split(';')[0].trim();
  const safeId = messageId.replace(/[^A-Za-z0-9_-]/g, '');
  const path = `inbound/${phone.replace(/\D/g, '')}/${safeId}.${extFor(mime, media.filename || undefined)}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, bytes, { contentType: mime, upsert: true });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
  return { path, mime, size: bytes.byteLength };
}

/** Runs work after the 200 is sent, so Meta does not time out and retry while a video downloads. */
function runInBackground(task: Promise<unknown>) {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(task);
  return rt?.waitUntil ? Promise.resolve() : task;
}

// ─── Menu bot ───────────────────────────────────────────────────────────────
// A customer who says hi / menu (or writes after 12 quiet hours) gets a WhatsApp
// list menu. Menu taps are answered automatically; "Talk to our team" pauses the
// bot for that customer and alerts the owner, who then chats from the CRM.
// All replies are free-form service messages inside the customer's 24h window.

const SITE = 'https://purenutrix.in';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const BOT_PAUSE_HOURS = 12;
// "Hi", "menu", or a short greeting line like "Hi! I want to know about liposomal glutathione".
const GREETING = /^\s*(hi+|hello+|hey+|helo|namaste|namaskar|menu|start|help|main menu|options?|hlo|hy)\b[^?\n]{0,70}$/i;
const STOP_WORDS = /^\s*(stop|unsubscribe|stop offers|band|band karo)\s*$/i;
const START_WORDS = /^\s*(start|subscribe|start offers)\s*$/i;

const STATUS_LABEL: Record<string, string> = {
  pending: 'Order received ✅', processing: 'Being packed 📦', shipped: 'Shipped 🚚',
  out_for_delivery: 'Out for delivery 🛵', delivered: 'Delivered 🎉', cancelled: 'Cancelled ❌', returned: 'Returned ↩️',
};

const inr = (n: unknown) => `₹${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;
const cut = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
export const shortProductName = (name: unknown) =>
  String(name ?? '').replace(/^Pure\s*Nutrix\s+/i, '').split(/\s+\|\s+/)[0].split(/\s+[–—]\s+|\s*\(/)[0].trim() || String(name ?? '').trim();
export function orderItemsText(productName: unknown) {
  const base = String(productName ?? '').replace(/\s+\|\s+(COD|Prepaid|Coupon\b.*)$/i, '').trim();
  return base.split(/,\s*(?=\d+x\s)/).map((part) => {
    const bogo = part.trim().match(/^(\d+)x\s+(.+?)\s*\(\+\s*(\d+)x\s+Free BOGO\)$/i);
    if (bogo) { const n = shortProductName(bogo[2]); return `${bogo[1]}x ${n} + ${bogo[3]}x ${n} FREE`; }
    const plain = part.trim().match(/^(\d+)x\s+(.+)$/);
    return plain ? `${plain[1]}x ${shortProductName(plain[2])}` : part.trim();
  }).join(', ');
}

type Wa = { token: string; phoneId: string; phone: string };

async function waSend(wa: Wa, payload: Record<string, unknown>, logText: string) {
  const res = await fetch(`${GRAPH}/${wa.phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${wa.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: wa.phone, ...payload }),
  });
  const sent = await res.json().catch(() => ({}));
  if (!res.ok) console.error('bot send failed', res.status, JSON.stringify(sent?.error || sent).slice(0, 300));
  const { error } = await supabase.from('whatsapp_messages').insert({
    contact_phone: wa.phone, direction: 'outbound', message_type: 'bot',
    message_body: `🤖 ${logText}`, status: res.ok ? 'sent' : 'failed',
    meta_message_id: sent?.messages?.[0]?.id || null,
  });
  if (error) console.error('bot log insert failed:', error.message);
  return res.ok;
}

const text = (wa: Wa, body: string) => waSend(wa, { type: 'text', text: { body: body.slice(0, 4000), preview_url: true } }, body);

function buttons(wa: Wa, body: string, btns: { id: string; title: string }[]) {
  return waSend(wa, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body.slice(0, 1024) },
      action: { buttons: btns.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: cut(b.title, 20) } })) },
    },
  }, `${body}\n[${btns.map((b) => b.title).join(' | ')}]`);
}

async function botSettings() {
  const { data } = await supabase.from('whatsapp_bot_settings').select('*').eq('id', 1).maybeSingle();
  return data || { enabled: true, welcome_text: 'Welcome to Pure Nutrix 🌿 Please choose an option below 👇', offer_text: '', support_hours: '10 AM – 7 PM' };
}

async function sendMenu(wa: Wa, cfg: any, name?: string) {
  const first = String(name || '').trim().split(/\s+/)[0];
  const hello = first && /[a-z]/i.test(first) ? `Hi ${first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()}! ` : 'Hi! ';
  const rows = [
    { id: 'm:products', title: 'Products & Price', description: 'See all products, prices and buy in 1 tap' },
    { id: 'm:offer', title: "Today's Offer", description: 'Current offers and coupon code' },
    { id: 'm:track', title: 'Track My Order', description: 'Status of your order on this number' },
    { id: 'm:order_help', title: 'Order Help', description: 'Payment, delivery, change or cancel an order' },
    { id: 'm:product_help', title: 'Product Info & Use', description: 'How to take, lab report, details' },
    { id: 'm:talk', title: 'Talk to Our Team', description: `Chat with a person (${cut(cfg.support_hours || '', 40)})` },
  ];
  const body = `${hello}${cfg.welcome_text}`;
  return waSend(wa, {
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Pure Nutrix' },
      body: { text: body.slice(0, 1024) },
      footer: { text: 'Type MENU anytime to see this again' },
      action: { button: 'Open menu', sections: [{ title: 'How can we help?', rows }] },
    },
  }, `${body}\n[Menu: ${rows.map((r) => r.title).join(' | ')}]`);
}

async function products() {
  const { data } = await supabase.from('products')
    .select('id, name, slug, price, original_price, image_urls, short_description, usage_instructions, stock')
    .not('slug', 'is', null).order('created_at', { ascending: true }).limit(10);
  return data || [];
}

async function sendProductList(wa: Wa, mode: 'buy' | 'info') {
  const list = await products();
  if (!list.length) return text(wa, `Please see all our products here: ${SITE}/products`);
  const rows = list.map((p: any) => ({
    id: `${mode}:${p.slug}`.slice(0, 200),
    title: cut(shortProductName(p.name), 24),
    description: cut(`${inr(p.price)}${Number(p.original_price) > Number(p.price) ? ` (MRP ${inr(p.original_price)})` : ''} · Buy 1 Get 1 FREE`, 72),
  }));
  const body = mode === 'buy'
    ? 'Every product comes with Buy 1 Get 1 FREE 🎁 Pick a product to see details and order:'
    : 'Pick a product to see how to take it and its lab report:';
  return waSend(wa, {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body },
      footer: { text: 'Type MENU for the main menu' },
      action: { button: 'Choose product', sections: [{ title: 'Our products', rows }] },
    },
  }, `${body}\n[${rows.map((r: any) => r.title).join(' | ')}]`);
}

async function labLink(p: any) {
  const { data } = await supabase.from('lab_reports').select('slug, product_name, file_path, is_active').eq('is_active', true);
  const hit = (data || []).find((r: any) => r.file_path && (String(p.slug).startsWith(r.slug) || String(p.name).toLowerCase().includes(String(r.product_name).toLowerCase())));
  return hit ? `${SITE}/lab-report/${hit.slug}` : null;
}

async function sendProductCard(wa: Wa, slug: string) {
  const { data: p } = await supabase.from('products').select('*').eq('slug', slug).maybeSingle();
  if (!p) return sendProductList(wa, 'buy');
  const name = shortProductName(p.name);
  const mrp = Number(p.original_price) > Number(p.price) ? ` ~${inr(p.original_price)}~` : '';
  const desc = String(p.short_description || '').replace(/<[^>]+>/g, '').trim();
  const lab = await labLink(p);
  const body = [
    `*${name}*`,
    `Price: *${inr(p.price)}*${mrp}`,
    '🎁 Buy 1 Get 1 FREE — you get 2 packs for this price.',
    desc ? cut(desc, 300) : '',
    lab ? `🧪 Lab report: ${lab}` : '',
    'Use code PUREJOY10 for extra 10% off at checkout.',
  ].filter(Boolean).join('\n');
  const img = Array.isArray(p.image_urls) && p.image_urls[0] && /^https:\/\//.test(p.image_urls[0]) ? p.image_urls[0] : null;
  return waSend(wa, {
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      ...(img ? { header: { type: 'image', image: { link: img } } } : {}),
      body: { text: body.slice(0, 1024) },
      footer: { text: 'Cash on Delivery available · Type MENU for more' },
      action: { name: 'cta_url', parameters: { display_text: 'Buy Now', url: `${SITE}/buy/${p.slug}?utm_source=whatsapp&utm_medium=bot` } },
    },
  }, `${body}\n[Buy Now → ${SITE}/buy/${p.slug}]`);
}

async function sendProductInfo(wa: Wa, slug: string) {
  const { data: p } = await supabase.from('products').select('*').eq('slug', slug).maybeSingle();
  if (!p) return sendProductList(wa, 'info');
  const use = String(p.usage_instructions || '').replace(/<[^>]+>/g, '').trim();
  const lab = await labLink(p);
  const body = [
    `*${shortProductName(p.name)}*`,
    use ? `How to take: ${cut(use, 500)}` : 'How to take: please follow the directions on the label.',
    lab ? `🧪 Lab report: ${lab}` : '',
    `Full details: ${SITE}/product/${p.slug}`,
    'For medical conditions, pregnancy or medicines, please ask your doctor before use.',
  ].filter(Boolean).join('\n\n');
  return buttons(wa, body, [{ id: `buy:${p.slug}`, title: 'Buy this' }, { id: 'm:talk', title: 'Ask a question' }, { id: 'menu', title: 'Main menu' }]);
}

async function sendTracking(wa: Wa) {
  const last10 = wa.phone.replace(/\D/g, '').slice(-10);
  const { data } = await supabase.from('orders')
    .select('id, status, price, product_name, created_at')
    .like('customer_mobile', `%${last10}`)
    .order('created_at', { ascending: false }).limit(3);
  if (!data?.length) {
    return buttons(wa, `We couldn't find an order on this WhatsApp number (+91 ${last10}).\n\nIf you ordered with another number, please send your Order ID here and our team will check.`,
      [{ id: 'm:talk', title: 'Talk to our team' }, { id: 'm:products', title: 'See products' }, { id: 'menu', title: 'Main menu' }]);
  }
  const lines = data.map((o: any) => {
    const st = STATUS_LABEL[String(o.status || 'pending').toLowerCase()] || String(o.status || '');
    const when = new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
    return `🧾 *#${String(o.id).split('-')[0].toUpperCase()}* · ${when}\n${cut(orderItemsText(o.product_name), 160)}\n${inr(o.price)} · *${st}*`;
  });
  const body = `Your recent orders:\n\n${lines.join('\n\n')}\n\nOrders are dispatched from Jaipur within 24–48 hours. We send a WhatsApp update when your order is shipped and delivered.`;
  return buttons(wa, body, [{ id: 'm:order_help', title: 'Order help' }, { id: 'm:talk', title: 'Talk to our team' }, { id: 'menu', title: 'Main menu' }]);
}

function sendOrderHelp(wa: Wa) {
  const body = [
    '*Order help*',
    '💳 Payment: pay online (UPI / cards) or Cash on Delivery (+₹19).',
    '🚚 Delivery: dispatched from Jaipur within 24–48 hours; metro cities 2–5 days, rest of India 5–7 days after dispatch.',
    '✏️ Change or cancel: tap "Talk to our team" and send your Order ID before the order is shipped.',
    '📦 Damaged / wrong / expired product: tell us within 48 hours of delivery with an unboxing video. Policy: ' + `${SITE}/legal`,
  ].join('\n\n');
  return buttons(wa, body, [{ id: 'm:track', title: 'Track my order' }, { id: 'm:talk', title: 'Talk to our team' }, { id: 'menu', title: 'Main menu' }]);
}

function sendOffer(wa: Wa, cfg: any) {
  const body = `*Today's offer*\n\n${cfg.offer_text || 'Buy 1 Get 1 FREE on every product.'}\n\nShop: ${SITE}/products?utm_source=whatsapp&utm_medium=bot`;
  return buttons(wa, body, [{ id: 'm:products', title: 'See products' }, { id: 'm:talk', title: 'Talk to our team' }, { id: 'menu', title: 'Main menu' }]);
}

async function handOff(wa: Wa, cfg: any, inboundId: string) {
  await supabase.from('whatsapp_contacts')
    .update({ bot_paused_until: new Date(Date.now() + BOT_PAUSE_HOURS * 3600e3).toISOString() })
    .eq('phone_number', wa.phone);
  // Alert the owner's phone (menu taps don't alert by themselves).
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/notify-new-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` },
      body: JSON.stringify({ inbound_message_id: inboundId }),
    });
  } catch (e) { console.error('handoff alert failed', e); }
  return text(wa, `Sure 🙂 Please type your question here. Our team will reply soon (${cfg.support_hours}).\n\nType MENU anytime to see the options again.`);
}

/** Returns true if the bot answered. */
async function runBot(token: string, phoneId: string, phone: string, message: any, parsed: { type: string; body: string }, contactName: string, inboundId: string) {
  const cfg = await botSettings();
  if (!cfg.enabled) return false;
  const wa: Wa = { token, phoneId, phone };

  const replyId: string = message.interactive?.list_reply?.id || message.interactive?.button_reply?.id || '';
  if (replyId) {
    if (replyId === 'menu') return sendMenu(wa, cfg);
    if (replyId === 'm:products') return sendProductList(wa, 'buy');
    if (replyId === 'm:product_help') return sendProductList(wa, 'info');
    if (replyId === 'm:offer') return sendOffer(wa, cfg);
    if (replyId === 'm:track') return sendTracking(wa);
    if (replyId === 'm:order_help') return sendOrderHelp(wa);
    if (replyId === 'm:talk') return handOff(wa, cfg, inboundId);
    if (replyId.startsWith('buy:')) return sendProductCard(wa, replyId.slice(4));
    if (replyId.startsWith('info:')) return sendProductInfo(wa, replyId.slice(5));
    return false;
  }

  if (parsed.type !== 'text') return false;
  const body = parsed.body.trim();
  if (STOP_WORDS.test(body)) return text(wa, 'Done ✅ You will not get offer messages from us any more. Order updates will still come. Reply START to get offers again.');
  if (START_WORDS.test(body)) { await text(wa, 'Thank you 🙏 You will now get our offers on WhatsApp. Reply STOP anytime to stop.'); return sendMenu(wa, cfg, contactName); }

  const askedMenu = GREETING.test(body);
  if (!askedMenu) {
    // Only greet unprompted when the chat was quiet for 12 hours and no person is handling it.
    const { data: c } = await supabase.from('whatsapp_contacts').select('bot_paused_until').eq('phone_number', phone).maybeSingle();
    if (c?.bot_paused_until && new Date(c.bot_paused_until).getTime() > Date.now()) return false;
    const since = new Date(Date.now() - BOT_PAUSE_HOURS * 3600e3).toISOString();
    const { data: recent } = await supabase.from('whatsapp_messages').select('id')
      .eq('contact_phone', phone).neq('id', inboundId).gte('created_at', since).limit(1);
    if (recent?.length) return false;
    if (/\b(track|status|where is my order|order kab|kab aayega)\b/i.test(body)) return sendTracking(wa);
  } else {
    // Customer asked for the menu: bot takes over again.
    await supabase.from('whatsapp_contacts').update({ bot_paused_until: null }).eq('phone_number', phone);
  }
  return sendMenu(wa, cfg, contactName);
}

async function handleIncomingMessage(message: any, contact: any, settings: any) {
  const phone_number: string = message.from; // Sender's phone number
  const message_id: string = message.id;
  const contact_name = contact?.profile?.name || 'Unknown';
  const parsed = parseMessage(message);

  // Meta retries a webhook if it thinks we were slow — never store the same message twice.
  const { data: existing } = await supabase.from('whatsapp_messages').select('id').eq('meta_message_id', message_id).limit(1);
  if (existing && existing.length > 0) {
    console.log(`Duplicate delivery of ${message_id} ignored`);
    return;
  }

  console.log(`Received ${parsed.type} message from ${phone_number}`);

  // Insert or Update Contact
  const { error: contactError } = await supabase.from('whatsapp_contacts').upsert({
    phone_number: phone_number,
    name: contact_name
  }, { onConflict: 'phone_number' });
  if (contactError) console.error('contact upsert failed:', contactError.message);

  // Insert Message into Inbox (media is attached afterwards)
  const baseRow = {
    contact_phone: phone_number,
    direction: 'inbound',
    message_body: parsed.body,
    message_type: parsed.type,
    meta_message_id: message_id,
    status: 'received'
  };
  let { data: inserted, error: insertError } = await supabase.from('whatsapp_messages').insert({
    ...baseRow,
    media_mime: parsed.media?.mime || null,
    media_filename: parsed.media?.filename || null,
  }).select('id').single();
  if (insertError && insertError.code === '42703') {
    // Media columns not created yet — still save the message so nothing is lost.
    console.error('media columns missing, run 20260930_whatsapp_media.sql');
    ({ data: inserted, error: insertError } = await supabase.from('whatsapp_messages').insert(baseRow).select('id').single());
  }
  if (insertError || !inserted) {
    console.error('message insert failed:', insertError?.message);
    return;
  }
  const insertedId = inserted.id;

  const WHATSAPP_TOKEN = settings?.access_token;
  const WHATSAPP_PHONE_ID = settings?.phone_number_id;

  if (parsed.media && WHATSAPP_TOKEN) {
    await runInBackground((async () => {
      try {
        const stored = await storeInboundMedia(WHATSAPP_TOKEN, parsed.media!, phone_number, message_id);
        const { error } = await supabase.from('whatsapp_messages')
          .update({ media_path: stored.path, media_mime: stored.mime, media_size: stored.size })
          .eq('id', insertedId);
        if (error) console.error('media row update failed:', error.message);
      } catch (err) {
        console.error('Inbound media not saved:', (err as Error).message);
        await supabase.from('whatsapp_messages')
          .update({ media_mime: 'error/download-failed' })
          .eq('id', insertedId);
      }
    })());
  }

  // Menu bot. Reactions don't need a reply.
  if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID && parsed.type !== 'reaction') {
    try {
      await runBot(WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, phone_number, message, parsed, contact_name, insertedId);
    } catch (err) {
      console.error('bot failed:', (err as Error).message);
    }
  }
}

serve(async (req) => {
  // 1. Webhook Verification (GET request from Meta)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully!');
      return new Response(challenge, { status: 200 });
    } else {
      return new Response('Forbidden', { status: 403 });
    }
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Handling Incoming Messages (POST request from Meta)
  if (req.method === 'POST') {
    try {
      const body = await req.json();

      // Log raw payload for debugging
      const { error: logError } = await supabase.from('webhook_logs').insert({ payload: body });
      if (logError) console.error('webhook_logs insert failed:', logError.message);

      if (body.object === 'whatsapp_business_account') {
        let settings: any = null;

        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            const value = change.value || {};

            // Messages received
            if (value.messages?.length) {
              if (!settings) {
                const { data } = await supabase.from('whatsapp_settings').select('*').eq('id', 1).single();
                settings = data;
              }
              for (const message of value.messages) {
                const contact = (value.contacts || []).find((c: any) => c.wa_id === message.from) || value.contacts?.[0];
                await handleIncomingMessage(message, contact, settings);
              }
            }

            // Status updates (sent, delivered, read, failed)
            for (const statusObj of value.statuses || []) {
              const { error } = await supabase.from('whatsapp_messages')
                .update({ status: statusObj.status })
                .eq('meta_message_id', statusObj.id);
              if (error) console.error('status update failed:', error.message);
            }
          }
        }
      }

      return new Response('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
      console.error('Error handling webhook:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
});
