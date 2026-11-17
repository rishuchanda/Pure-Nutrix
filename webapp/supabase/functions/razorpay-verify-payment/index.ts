import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Security (14 Nov 2026): after the signature check, the payment is looked up
// at Razorpay (amount, status, order) and saved in razorpay_payments. The
// orders_check_price trigger then only trusts a "prepaid" order whose payment
// is in that table, unused, and for the right amount.
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to calculate HMAC-SHA256
async function generateHmacSha256(message: string, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  
  // Convert ArrayBuffer to Hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keySecret) {
      throw new Error('Razorpay keys not configured')
    }

    // Razorpay verification algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const body = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = await generateHmacSha256(body, keySecret)

    if (expectedSignature === razorpay_signature) {
      // Signature is valid: confirm amount and status with Razorpay itself.
      const keyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
      const pr = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
        headers: { 'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}` },
      }).catch(() => null)
      const looked = !!(pr && pr.ok)
      const pay = looked ? await pr!.json().catch(() => ({})) : {}
      if (looked && (pay.order_id !== razorpay_order_id || !['authorized', 'captured'].includes(pay.status))) {
        return new Response(JSON.stringify({ error: 'Payment not completed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (looked) {
        const { error: saveErr } = await supabase.from('razorpay_payments').upsert({
          razorpay_order_id, razorpay_payment_id, amount_paise: Number(pay.amount), status: pay.status,
        }, { onConflict: 'razorpay_order_id', ignoreDuplicates: true })
        if (saveErr) console.error('razorpay_payments save failed', saveErr)
      } else {
        // Razorpay lookup failed (network): don't lose the customer's order —
        // it is saved but flagged "online payment not verified" for the owner.
        console.error('razorpay payment lookup failed', pr?.status)
      }
      return new Response(JSON.stringify({ success: true, message: 'Payment verified successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      // Signature mismatch
      return new Response(JSON.stringify({ error: 'Invalid payment signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
