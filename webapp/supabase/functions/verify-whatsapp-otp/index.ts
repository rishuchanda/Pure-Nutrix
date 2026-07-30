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
    const { phone_number, otp, full_name = 'Customer' } = await req.json()

    if (!phone_number || !otp) {
      throw new Error('Phone number and OTP are required')
    }

    let parsed_phone = phone_number.replace(/\D/g, '');
    if (parsed_phone.length === 10) {
      parsed_phone = '91' + parsed_phone;
    }

    // Check OTP in database
    const { data: records, error: dbError } = await supabase
      .from('whatsapp_otps')
      .select('*')
      .eq('phone_number', parsed_phone)
      .order('created_at', { ascending: false })
      .limit(1);

    if (dbError) throw dbError;
    if (!records || records.length === 0) {
      throw new Error('No OTP requested for this number')
    }

    const latestRecord = records[0];
    
    // Check expiration (10 minutes)
    const createdAt = new Date(latestRecord.created_at).getTime();
    const now = new Date().getTime();
    if (now - createdAt > 10 * 60 * 1000) {
      throw new Error('OTP has expired');
    }

    if (latestRecord.otp !== otp) {
      throw new Error('Invalid OTP');
    }

    // OTP is valid. Now find or create a user.
    const dummyEmail = `phone_${parsed_phone}@whatsapp.auth`;
    const tempPassword = crypto.randomUUID(); // Secure random password

    // Check if user exists
    let { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    let user = users?.find(u => u.email === dummyEmail);

    if (!user) {
      // Create user
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: dummyEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name, phone_number: parsed_phone }
      });
      if (createError) throw createError;
      user = createData.user;
    } else {
      // Update password of existing user
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: tempPassword }
      );
      if (updateError) throw updateError;
    }

    // Delete the used OTP
    await supabase.from('whatsapp_otps').delete().eq('id', latestRecord.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        credentials: { email: dummyEmail, password: tempPassword },
        user
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
