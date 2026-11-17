import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Sends an email through Resend from hello@purenutrix.in.
// Security (14 Nov 2026): it was an open relay (anyone could email anyone with
// any content). Now:
//  - system calls with the service key: any recipient
//  - admins (admin_roles): any recipient
//  - logged-in customers: only to their OWN account email (order confirmation)
//  - everyone else: refused
// The sender name is always "Pure Nutrix".

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, text } = await req.json()
    const recipients: string[] = (Array.isArray(to) ? to : [to]).map((x: unknown) => String(x || '').trim().toLowerCase());
    if (!recipients.length || recipients.some(r => !EMAIL_RE.test(r)) || !subject || (!html && !text)) {
      return json({ error: 'Missing required parameters (to, subject, html/text)' }, 400);
    }
    if (String(subject).length > 200 || String(html || text).length > 100_000) {
      return json({ error: 'Email too long' }, 400);
    }

    // Who is calling?
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    let allowed = false;
    if (jwt && SERVICE_KEY && jwt === SERVICE_KEY) {
      allowed = true;
    } else if (jwt) {
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user) {
        const { data: role } = await supabase.from('admin_roles').select('id').eq('id', user.id).maybeSingle();
        if (role) allowed = true;
        else {
          const own = (user.email || '').toLowerCase();
          allowed = recipients.length === 1 && recipients[0] === own && !own.endsWith('@whatsapp.auth');
        }
      }
    }
    if (!allowed) return json({ error: 'Not allowed' }, 403);

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) throw new Error('RESEND_API_KEY is not set in environment variables')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Pure Nutrix <hello@purenutrix.in>',
        to: recipients,
        subject: String(subject),
        html,
        text,
      }),
    })
    const data = await res.json()
    if (!res.ok) return json({ error: data }, res.status);
    return json({ success: true, data });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
})
