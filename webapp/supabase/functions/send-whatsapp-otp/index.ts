import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone_number } = await req.json()

    if (!phone_number) {
      throw new Error('Phone number is required')
    }

    let parsed_phone = phone_number.replace(/\D/g, '');
    if (parsed_phone.length === 10) {
      parsed_phone = '91' + parsed_phone;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

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

    // The auth_code template requires ONE body parameter (the OTP) and ONE button url parameter (the OTP)
    // Wait, when I created auth_code template, what components did it have?
    // It has a BODY (type text) but actually AUTHENTICATION templates often just take one parameter if it's COPY_CODE.
    // Let's send the standard AUTHENTICATION template payload:
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
