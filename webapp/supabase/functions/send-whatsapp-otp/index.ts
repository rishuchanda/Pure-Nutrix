import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone_number } = await req.json()

    // Indian mobile numbers only: 91 + 10 digits starting 6-9.
    let parsed_phone = String(phone_number || '').replace(/\D/g, '');
    if (parsed_phone.length === 10) parsed_phone = '91' + parsed_phone;
    if (parsed_phone.length === 11 && parsed_phone.startsWith('0')) parsed_phone = '91' + parsed_phone.slice(1);
    if (!/^91[6-9]\d{9}$/.test(parsed_phone)) {
      return json({ success: false, error: 'Please enter a valid 10-digit mobile number' }, 400);
    }

    // Rate limits (each OTP is a paid WhatsApp message):
    //   max 3 OTPs per number in 10 minutes, max 60 OTPs per hour for the whole site.
    const since10 = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const since60 = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: perNumber } = await supabase.from('whatsapp_otps')
      .select('id', { count: 'exact', head: true }).eq('phone_number', parsed_phone).gte('created_at', since10);
    if ((perNumber ?? 0) >= 3) {
      return json({ success: false, error: 'Too many codes sent to this number. Please wait 10 minutes and try again.' }, 429);
    }
    const { count: siteWide } = await supabase.from('whatsapp_otps')
      .select('id', { count: 'exact', head: true }).gte('created_at', since60);
    if ((siteWide ?? 0) >= 60) {
      return json({ success: false, error: 'Login by WhatsApp code is busy right now. Please try email login or try again later.' }, 429);
    }

    // Generate 6-digit OTP (crypto random)
    const rnd = new Uint32Array(1); crypto.getRandomValues(rnd);
    const otp = String(100000 + (rnd[0] % 900000));

    // Save to DB
    const { error: dbError } = await supabase
      .from('whatsapp_otps')
      .insert({ phone_number: parsed_phone, otp });
    
    if (dbError) throw dbError;

    // Fetch dynamic configuration from database
    const { data: settings, error: settingsError } = await supabase.from('whatsapp_settings').select('*').eq('id', 1).single();
    if (settingsError || !settings) {
       throw new Error('Failed to load WhatsApp configuration');
    }

    const WHATSAPP_TOKEN = settings.access_token;
    const WHATSAPP_PHONE_ID = settings.phone_number_id;

    const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`

    // auth_code template: one body parameter and one URL-button parameter (both the OTP).
    const payload = {
      messaging_product: "whatsapp",
      to: parsed_phone,
      type: "template",
      template: {
        name: "auth_code",
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [ { type: "text", text: otp } ]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [ { type: "text", text: otp } ]
          }
        ]
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
      JSON.stringify({ success: true, message: 'OTP sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
