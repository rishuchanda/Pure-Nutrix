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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone_number, message, template_name, template_language = "en_US", template_components = [], type = 'text' } = await req.json()

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

    const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`

    let payload = {}

    if (type === 'template') {
      payload = {
        messaging_product: "whatsapp",
        to: phone_number,
        type: "template",
        template: {
          name: template_name,
          language: {
            code: template_language
          },
          components: template_components
        }
      }
    } else {
      payload = {
        messaging_product: "whatsapp",
        to: phone_number,
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
