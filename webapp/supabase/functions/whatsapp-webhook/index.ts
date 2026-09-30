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

async function sendAutoReply(token: string, phoneId: string, phone: string, messageBody: string) {
  // Check if admin has replied to this user recently
  const { data: recentOutbound } = await supabase
    .from('whatsapp_messages')
    .select('created_at')
    .eq('contact_phone', phone)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1);

  let shouldReply = false;
  if (!recentOutbound || recentOutbound.length === 0) {
    // First time customer is messaging us, or we've never replied
    shouldReply = true;
  } else {
    const hoursSinceLastReply = (Date.now() - new Date(recentOutbound[0].created_at).getTime()) / (1000 * 60 * 60);
    // If admin hasn't replied in the last 24 hours, send auto-reply again
    if (hoursSinceLastReply > 24) shouldReply = true;
  }
  if (!shouldReply) return;

  let replyText = `Thanks for messaging Pure-Nutrix! We have received your message and will get back to you shortly.`;
  // Simple keyword trigger
  const lower = messageBody.toLowerCase();
  if (lower.includes('order') || lower.includes('track')) {
    replyText = `To track your order, please visit our website and check the My Account section, or provide your Order ID here.`;
  }

  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: replyText } }),
  });
  const sent = await res.json().catch(() => ({}));

  // Log the outbound auto-reply in DB (with its id so delivery ticks work)
  const { error } = await supabase.from('whatsapp_messages').insert({
    contact_phone: phone,
    direction: 'outbound',
    message_body: replyText,
    message_type: 'text',
    status: res.ok ? 'sent' : 'failed',
    meta_message_id: sent?.messages?.[0]?.id || null,
  });
  if (error) console.error('auto-reply log insert failed:', error.message);
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

  // Auto-reply Logic (Simple Chatbot with 24-hour cooldown). Reactions don't need a reply.
  if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID && parsed.type !== 'reaction') {
    await sendAutoReply(WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, phone_number, parsed.body);
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
