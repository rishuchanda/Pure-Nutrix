// WhatsApp offer broadcast (admin only).
//
// Actions (POST JSON, admin JWT in Authorization):
//   { action: 'template' }                         -> status of the offer template on Meta
//   { action: 'create_template' }                  -> submit the offer template to Meta for review
//   { action: 'start', product_id, offer_text }    -> create a broadcast for all opted-in contacts
//   { action: 'send', broadcast_id }               -> send the next batch; call again until pending = 0
//   { action: 'stop', broadcast_id }               -> stop; remaining recipients are skipped
//
// Only contacts with offers_opt_in = true and no STOP are messaged. A contact gets at most one
// offer per 24 hours. Messages go out from the server, so closing the admin tab never sends twice.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const GRAPH = 'https://graph.facebook.com/v22.0';
const WABA_ID = Deno.env.get('WHATSAPP_WABA_ID') || '1527846681671872';
const SITE = 'https://purenutrix.in';

export const OFFER_TEMPLATE = 'pn_product_offer';
export const OFFER_LANG = 'en';
const BATCH = 25;
const PARALLEL = 5;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

// Template text values cannot contain new lines, tabs or more than 4 spaces in a row.
export const waText = (v: unknown, max = 180) =>
  String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, max);

export const firstName = (name: unknown) => {
  const n = waText(name, 60).split(' ')[0];
  return n && /[a-z]/i.test(n) ? n.charAt(0).toUpperCase() + n.slice(1) : 'there';
};

export const shortProductName = (name: unknown) =>
  waText(String(name ?? '').replace(/^Pure\s*Nutrix\s+/i, '').split(/\s+[-|–(]\s*/)[0], 60) || 'our product';

// The template we ask Meta to approve. Offer details are a variable so one template covers every offer.
export const TEMPLATE_DEFINITION = {
  name: OFFER_TEMPLATE,
  language: OFFER_LANG,
  category: 'MARKETING',
  components: [
    { type: 'HEADER', format: 'TEXT', text: 'New offer from Pure Nutrix' },
    {
      type: 'BODY',
      text: 'Hi {{1}}, there is a new offer on {{2}}.\n\n{{3}}\n\nTap Shop now to see the product and the offer price on our website.',
      example: { body_text: [['Rahul', 'Liposomal Glutathione 600mg', 'Flat 15% off with code GLOW15, valid till Sunday']] },
    },
    { type: 'FOOTER', text: 'Reply STOP to stop offer messages' },
    {
      type: 'BUTTONS',
      buttons: [{
        type: 'URL', text: 'Shop now', url: `${SITE}/product/{{1}}`,
        example: [`${SITE}/product/liposomal-glutathione-600mg-30-veg-capsules`],
      }],
    },
  ],
};

export const renderOffer = (name: string, product: string, offer: string) =>
  `[Offer: ${OFFER_TEMPLATE}] New offer from Pure Nutrix\nHi ${name}, there is a new offer on ${product}.\n\n${offer}\n\nTap Shop now to see the product and the offer price on our website.`;

async function assertAdmin(req: Request) {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) throw new HttpError(401, 'Please log in as an admin');
  const { data: role } = await supabase.from('admin_roles').select('id').eq('id', user.id).maybeSingle();
  if (!role) throw new HttpError(403, 'Only admins can send offers');
  return user;
}

async function waConfig() {
  const { data } = await supabase.from('whatsapp_settings').select('access_token, phone_number_id').eq('id', 1).single();
  if (!data?.access_token || !data?.phone_number_id) throw new HttpError(400, 'WhatsApp is not set up in CRM settings');
  return { token: data.access_token as string, phoneId: data.phone_number_id as string };
}

async function templateStatus(token: string) {
  const res = await fetch(`${GRAPH}/${WABA_ID}/message_templates?name=${OFFER_TEMPLATE}&fields=name,status,category,language,rejected_reason&limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await res.json();
  if (!res.ok) throw new HttpError(502, j?.error?.message || 'Could not read templates from Meta');
  const t = (j.data || []).find((x: { name: string; language: string }) => x.name === OFFER_TEMPLATE && x.language === OFFER_LANG);
  return t ? { status: t.status, category: t.category, rejected_reason: t.rejected_reason || null } : { status: 'MISSING' };
}

async function sendOne(token: string, phoneId: string, r: { phone_number: string; name: string | null }, b: Record<string, string>) {
  const name = firstName(r.name);
  const product = b.product_name;
  const offer = b.offer_text;
  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: r.phone_number,
      type: 'template',
      template: {
        name: OFFER_TEMPLATE,
        language: { code: OFFER_LANG },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: name }, { type: 'text', text: product }, { type: 'text', text: offer }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: b.product_slug }] },
        ],
      },
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: waText(j?.error?.error_data?.details || j?.error?.message || `HTTP ${res.status}`, 300) };
  const id = j?.messages?.[0]?.id || null;
  // Show it in the CRM chat; delivery/read ticks then come in through the webhook.
  await supabase.from('whatsapp_messages').insert({
    contact_phone: r.phone_number, direction: 'outbound', message_type: 'template',
    message_body: renderOffer(name, product, offer), status: 'sent', meta_message_id: id,
  });
  return { ok: true, id };
}

async function handle(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = await assertAdmin(req);
  const action = String(body.action || '');

  if (action === 'template') {
    const { token } = await waConfig();
    return json({ ok: true, template: await templateStatus(token), definition: TEMPLATE_DEFINITION });
  }

  if (action === 'create_template') {
    const { token } = await waConfig();
    const current = await templateStatus(token);
    if (current.status !== 'MISSING') return json({ ok: true, template: current });
    const res = await fetch(`${GRAPH}/${WABA_ID}/message_templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(TEMPLATE_DEFINITION),
    });
    const j = await res.json();
    if (!res.ok) throw new HttpError(400, j?.error?.error_user_msg || j?.error?.message || 'Meta did not accept the template');
    return json({ ok: true, template: { status: j.status || 'PENDING', category: j.category } });
  }

  if (action === 'start') {
    const offer = waText(body.offer_text, 300);
    if (offer.length < 5) throw new HttpError(400, 'Please write the offer (at least a few words)');
    const { data: product } = await supabase.from('products').select('id, name, slug').eq('id', body.product_id).maybeSingle();
    if (!product?.slug) throw new HttpError(400, 'Please pick a product');

    const { token } = await waConfig();
    const t = await templateStatus(token);
    if (t.status !== 'APPROVED') throw new HttpError(400, `The offer template is not approved by Meta yet (status: ${t.status})`);

    const { data: contacts, error } = await supabase.from('whatsapp_contacts')
      .select('phone_number, name').eq('offers_opt_in', true).is('opted_out_at', null);
    if (error) throw error;
    let list = contacts || [];
    if (Array.isArray(body.phones) && body.phones.length) {
      const only = new Set(body.phones.map(String));
      list = list.filter((c) => only.has(c.phone_number));
    }
    if (!list.length) throw new HttpError(400, 'No contacts have agreed to get offers yet');

    // One offer per contact per 24 hours.
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    const { data: recent } = await supabase.from('whatsapp_broadcast_recipients')
      .select('phone_number').eq('status', 'sent').gte('sent_at', since);
    const recentSet = new Set((recent || []).map((r) => r.phone_number));

    const { data: b, error: bErr } = await supabase.from('whatsapp_broadcasts').insert({
      created_by: user.id, template_name: OFFER_TEMPLATE, template_language: OFFER_LANG,
      product_id: product.id, product_name: shortProductName(product.name), product_slug: product.slug,
      offer_text: offer, total: list.length,
    }).select().single();
    if (bErr) throw bErr;

    const rows = list.map((c) => ({
      broadcast_id: b.id, phone_number: c.phone_number, name: c.name,
      status: recentSet.has(c.phone_number) ? 'skipped' : 'pending',
      error: recentSet.has(c.phone_number) ? 'Already got an offer in the last 24 hours' : null,
    }));
    const { error: rErr } = await supabase.from('whatsapp_broadcast_recipients').insert(rows);
    if (rErr) throw rErr;
    return json({ ok: true, broadcast: b, pending: rows.filter((r) => r.status === 'pending').length, skipped: rows.filter((r) => r.status === 'skipped').length });
  }

  if (action === 'send') {
    const { data: b } = await supabase.from('whatsapp_broadcasts').select('*').eq('id', body.broadcast_id).maybeSingle();
    if (!b) throw new HttpError(404, 'Broadcast not found');
    if (b.status !== 'sending') return json({ ok: true, done: true, broadcast: b, pending: 0 });

    const { token, phoneId } = await waConfig();
    const { data: batch, error } = await supabase.rpc('claim_broadcast_batch', { p_broadcast: b.id, p_limit: BATCH });
    if (error) throw error;
    if (!batch?.length) {
      // Nothing left to claim: rows still marked 'sending' were cut off by an earlier crash.
      await supabase.from('whatsapp_broadcast_recipients')
        .update({ status: 'failed', error: 'Interrupted - check the chat before resending' })
        .eq('broadcast_id', b.id).eq('status', 'sending').lt('claimed_at', new Date(Date.now() - 5 * 60e3).toISOString());
    }

    let sent = 0, failed = 0;
    const queue = [...(batch || [])];
    const worker = async () => {
      while (queue.length) {
        const r = queue.shift()!;
        const out = await sendOne(token, phoneId, r, b).catch((e) => ({ ok: false, error: String(e?.message || e) }));
        if (out.ok) sent++; else failed++;
        await supabase.from('whatsapp_broadcast_recipients').update(out.ok
          ? { status: 'sent', meta_message_id: (out as { id: string }).id, sent_at: new Date().toISOString(), error: null }
          : { status: 'failed', error: (out as { error: string }).error }).eq('id', r.id);
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));

    const { count: pending } = await supabase.from('whatsapp_broadcast_recipients')
      .select('id', { count: 'exact', head: true }).eq('broadcast_id', b.id).in('status', ['pending', 'sending']);
    const { count: sentTotal } = await supabase.from('whatsapp_broadcast_recipients')
      .select('id', { count: 'exact', head: true }).eq('broadcast_id', b.id).eq('status', 'sent');
    const { count: failedTotal } = await supabase.from('whatsapp_broadcast_recipients')
      .select('id', { count: 'exact', head: true }).eq('broadcast_id', b.id).eq('status', 'failed');
    const done = !pending;
    const { data: updated } = await supabase.from('whatsapp_broadcasts').update({
      sent: sentTotal || 0, failed: failedTotal || 0,
      ...(done ? { status: 'done', finished_at: new Date().toISOString() } : {}),
    }).eq('id', b.id).select().single();
    return json({ ok: true, done, pending: pending || 0, batch: { sent, failed }, broadcast: updated });
  }

  if (action === 'stop') {
    await supabase.from('whatsapp_broadcast_recipients').update({ status: 'skipped', error: 'Stopped by admin' })
      .eq('broadcast_id', body.broadcast_id).eq('status', 'pending');
    const { data } = await supabase.from('whatsapp_broadcasts')
      .update({ status: 'stopped', finished_at: new Date().toISOString() })
      .eq('id', body.broadcast_id).eq('status', 'sending').select().maybeSingle();
    return json({ ok: true, broadcast: data });
  }

  throw new HttpError(400, 'Unknown action');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    return await handle(req);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ ok: false, error: String((e as Error)?.message || e) }, status);
  }
});
