import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, currency = 'INR', receipt } = await req.json()

    if (!amount || amount < 100) {
      return new Response(JSON.stringify({ error: 'Amount must be at least 100 paise' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!keyId || !keySecret) {
      throw new Error('Razorpay keys not configured')
    }

    // Razorpay test servers have intermittent auth failures.
    // We retry up to 25 times with 400ms gap to guarantee success.
    let response: Response | undefined;
    let data: any;
    const MAX_ATTEMPTS = 25;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`
          },
          body: JSON.stringify({
            amount,
            currency,
            receipt: receipt || `rcpt_${Date.now()}_${attempt}`,
          })
        });

        data = await response.json();

        if (response.ok && data && data.id) {
          // Success — break immediately
          break;
        }
      } catch (fetchErr) {
        // Network error — continue retrying
        data = { error: { description: String(fetchErr) } };
      }

      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 400));
      }
    }

    if (!response || !response.ok || !data || !data.id) {
      return new Response(JSON.stringify({ error: data?.error || 'Failed to create Razorpay order after max retries' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
