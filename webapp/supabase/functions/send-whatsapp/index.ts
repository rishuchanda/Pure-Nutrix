import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

const GRAPH = 'https://graph.facebook.com/v22.0';
const MEDIA_BUCKET = 'whatsapp-media';
const MEDIA_KINDS = ['image', 'video', 'audio', 'document'];

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

// Media sending reads files from the private bucket, so only admins may use it.
async function assertAdmin(req: Request) {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) throw new HttpError(401, 'Please log in as an admin to send media');
  const { data: role } = await supabase.from('admin_roles').select('id').eq('id', user.id).maybeSingle();
  if (!role) throw new HttpError(403, 'Only admins can send media');
}

// Uploads a file from our bucket to WhatsApp and returns the WhatsApp media id.
async function uploadToWhatsApp(token: string, phoneId: string, mediaPath: string, filename: string) {
  const { data: blob, error } = await supabase.storage.from(MEDIA_BUCKET).download(mediaPath);
  if (error || !blob) throw new Error('Could not read the uploaded file: ' + (error?.message || 'not found'));

  const mime = (blob.type || 'application/octet-stream').split(';')[0].trim();
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mime);
  form.append('file', new File([blob], filename || 'file', { type: mime }));

  const res = await fetch(`${GRAPH}/${phoneId}/media`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form,
  });
  const json = await res.json();
  if (!res.ok || !json.id) throw new Error(json?.error?.message || 'WhatsApp rejected the file');
  return json.id as string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      phone_number, message, template_name, template_language = "en_US", template_components = [], type = 'text',
      media_path, media_kind, caption, filename,
    } = await req.json()

    if (type === 'media') await assertAdmin(req);

    // Fetch dynamic configuration from database
    const { data: settings, error: dbError } = await supabase.from('whatsapp_settings').select('*').eq('id', 1).single();
    
    if (dbError || !settings) {
       throw new Error('Failed to load WhatsApp configuration from database');
    }

    const WHATSAPP_TOKEN = settings.access_token;
    const WHATSAPP_PHONE_ID = settings.phone_number_id;

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
      throw new Error('WhatsApp credentials are not configured in settings')
    }

    if (!phone_number) {
      throw new Error('Phone number is required')
    }

    let parsed_phone = phone_number.replace(/\D/g, '');
    if (parsed_phone.length === 10) {
      parsed_phone = '91' + parsed_phone;
    }

    const url = `${GRAPH}/${WHATSAPP_PHONE_ID}/messages`

    let payload = {}

    if (type === 'template') {
      payload = {
        messaging_product: "whatsapp",
        to: parsed_phone,
        type: "template",
        template: {
          name: template_name,
          language: {
            code: template_language
          },
          components: template_components
        }
      }
    } else if (type === 'media') {
      if (!MEDIA_KINDS.includes(media_kind)) throw new HttpError(400, 'Unsupported media type');
      if (typeof media_path !== 'string' || !media_path.startsWith('outbound/') || media_path.includes('..')) {
        throw new HttpError(400, 'Invalid media path');
      }
      const mediaId = await uploadToWhatsApp(WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, media_path, filename);
      const mediaObj: Record<string, string> = { id: mediaId };
      // Audio cannot have a caption; only documents carry a file name.
      if (caption && media_kind !== 'audio') mediaObj.caption = String(caption).slice(0, 1024);
      if (media_kind === 'document' && filename) mediaObj.filename = String(filename).slice(0, 240);
      payload = {
        messaging_product: "whatsapp",
        to: parsed_phone,
        type: media_kind,
        [media_kind]: mediaObj,
      }
    } else {
      payload = {
        messaging_product: "whatsapp",
        to: parsed_phone,
        type: "text",
        text: {
          body: message
        }
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to send WhatsApp message')
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error instanceof HttpError ? error.status : 400 }
    )
  }
})
