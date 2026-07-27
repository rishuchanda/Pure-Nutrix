import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, text, fromName = 'Pure Nutrix' } = await req.json()

    // Validate inputs
    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters (to, subject, html/text)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not set in environment variables')
    }

    // Default sender email
    const from = `${fromName} <hello@purenutrix.in>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to], // Resend supports multiple recipients
        subject,
        html,
        text
      })
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
