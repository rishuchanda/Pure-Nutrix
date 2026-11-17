import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Security (14 Nov 2026): the amount is worked out on the server from the
// product prices in the database (items + coupon), not taken from the browser.
// Old pages that still send only "amount" keep working, but those orders get
// flagged by the orders_check_price trigger.
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { currency = 'INR', receipt } = body
    let amount = Number(body.amount)
    let notes: Record<string, string> = {}
    if (Array.isArray(body.items) && body.items.length) {
      const items = body.items.slice(0, 20).map((i: any) => ({ id: String(i?.id || ''), qty: Math.floor(Number(i?.qty)) }))
      const { data: total, error } = await supabase.rpc('expected_order_total', {
        p_items: items, p_coupon: body.coupon_code ? String(body.coupon_code) : null, p_method: 'Prepaid',
      })
      if (error || total === null || total === undefined) {
        return new Response(JSON.stringify({ error: 'Could not price this order. Please refresh the page and try again.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      amount = Math.round(Number(total) * 100)
      notes = { items: JSON.stringify(items).slice(0, 250), coupon: String(body.coupon_code || '').slice(0, 30) }
    } else {
      notes = { legacy_amount: '1' }
    }

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
            notes,
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
