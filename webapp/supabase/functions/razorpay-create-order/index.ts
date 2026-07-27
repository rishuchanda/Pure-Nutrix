import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, currency = 'INR', receipt } = await req.json()

    // Validate amount (must be at least 100 paise = 1 INR)
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

    // Call Razorpay API to create an order with up to 10 retries for resilience against test environment dropouts
    let response;
    let data;
    for (let attempt = 1; attempt <= 10; attempt++) {
      response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`
        },
        body: JSON.stringify({
          amount,
          currency,
          receipt: receipt || `receipt_${Date.now()}_${attempt}`,
        })
      });

      data = await response.json();
      if (response.ok) {
        break;
      }
      if (attempt < 10) {
        await new Promise(r => setTimeout(r, 350));
      }
    }

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error || 'Failed to create Razorpay order' }), {
        status: response.status,
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
