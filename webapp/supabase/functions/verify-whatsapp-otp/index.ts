import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Logs a customer in with the WhatsApp code sent by send-whatsapp-otp.
// Security (14 Nov 2026):
//  - The account is found ONLY by the phone number the code was sent to
//    (app_metadata.phone, or the phone_<number>@whatsapp.auth login email).
//    An email in the request is used only to CREATE a new account; it can never
//    pick or change an existing account. (Before, any email could be passed and
//    that account's password was reset → account takeover.)
//  - Max 5 wrong tries per code, then a new code is needed.

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MAX_TRIES = 5;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Constant-time compare for the 6-digit code.
function sameCode(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function findUserByPhone(phone: string) {
  const phoneEmail = `phone_${phone}@whatsapp.auth`;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users || [];
    const hit = users.find(u => (u.app_metadata as any)?.phone === phone)
      || users.find(u => (u.email || '').toLowerCase() === phoneEmail);
    if (hit) return hit;
    if (users.length < 1000) break;
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone_number, otp, full_name = 'Customer', email = null } = await req.json()

    let parsed_phone = String(phone_number || '').replace(/\D/g, '');
    if (parsed_phone.length === 10) parsed_phone = '91' + parsed_phone;
    if (parsed_phone.length === 11 && parsed_phone.startsWith('0')) parsed_phone = '91' + parsed_phone.slice(1);
    const code = String(otp || '').replace(/\D/g, '');
    if (!/^91[6-9]\d{9}$/.test(parsed_phone) || code.length !== 6) {
      return json({ success: false, error: 'Phone number and 6-digit code are required' }, 400);
    }

    // Latest code for this number
    const { data: records, error: dbError } = await supabase
      .from('whatsapp_otps')
      .select('*')
      .eq('phone_number', parsed_phone)
      .order('created_at', { ascending: false })
      .limit(1);
    if (dbError) throw dbError;
    if (!records || records.length === 0) {
      return json({ success: false, error: 'No code requested for this number' }, 400);
    }
    const latest = records[0];

    // Expired (10 minutes) or too many wrong tries
    if (Date.now() - new Date(latest.created_at).getTime() > 10 * 60 * 1000) {
      return json({ success: false, error: 'Code has expired. Please request a new one.' }, 400);
    }
    if ((latest.attempts ?? 0) >= MAX_TRIES) {
      return json({ success: false, error: 'Too many wrong tries. Please request a new code.' }, 429);
    }
    if (!sameCode(String(latest.otp), code)) {
      await supabase.from('whatsapp_otps').update({ attempts: (latest.attempts ?? 0) + 1 }).eq('id', latest.id);
      return json({ success: false, error: 'Invalid code' }, 400);
    }

    // Code is right: use it up straight away (one login per code).
    await supabase.from('whatsapp_otps').delete().eq('phone_number', parsed_phone);

    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    let user = await findUserByPhone(parsed_phone);

    if (!user) {
      // New customer. A real email may be used for the new account, but only if
      // nobody has an account with it yet; otherwise use the phone login email.
      const wanted = typeof email === 'string' && EMAIL_RE.test(email.trim()) ? email.trim().toLowerCase() : null;
      const name = String(full_name || 'Customer').slice(0, 80);
      let created = null;
      if (wanted) {
        const r = await supabase.auth.admin.createUser({
          email: wanted, password: tempPassword, email_confirm: true,
          user_metadata: { full_name: name, phone_number: parsed_phone },
          app_metadata: { phone: parsed_phone },
        });
        if (!r.error) created = r.data.user;
      }
      if (!created) {
        const r = await supabase.auth.admin.createUser({
          email: `phone_${parsed_phone}@whatsapp.auth`, password: tempPassword, email_confirm: true,
          user_metadata: { full_name: name, phone_number: parsed_phone },
          app_metadata: { phone: parsed_phone },
        });
        if (r.error) throw r.error;
        created = r.data.user;
      }
      user = created;

      // Welcome message (system call with the service key)
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone_number: parsed_phone,
            type: 'template',
            template_name: 'welcome_message',
            template_components: [{ type: 'body', parameters: [{ type: 'text', text: name }] }],
          }),
        });
      } catch (err) {
        console.error('Failed to send welcome message:', err);
      }
    } else {
      // Existing account linked to THIS phone: set a fresh one-time password and
      // remember the phone in app_metadata (users cannot edit app_metadata).
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: tempPassword,
        app_metadata: { ...(user.app_metadata || {}), phone: parsed_phone },
      });
      if (updateError) throw updateError;
    }

    return json({
      success: true,
      credentials: { email: user!.email, password: tempPassword },
      user: { id: user!.id, email: user!.email },
    });
  } catch (error) {
    console.error('verify-whatsapp-otp', error);
    return json({ success: false, error: 'Could not verify the code. Please try again.' }, 400);
  }
})
