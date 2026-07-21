import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Verify Token used for Meta Webhook setup
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'purenutrix_verify_123';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Webhook Verification (GET request from Meta)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully!');
      return new Response(challenge, { status: 200 });
    } else {
      return new Response('Forbidden', { status: 403 });
    }
  }

  // 2. Handling Incoming Messages (POST request from Meta)
  if (req.method === 'POST') {
    try {
      const body = await req.json();

      // Check if it's a WhatsApp status update or message event
      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        // Message received
        if (value?.messages && value.messages.length > 0) {
          const message = value.messages[0];
          const contact = value.contacts?.[0];
          const phone_number = message.from; // Sender's phone number
          const message_body = message.text?.body || '';
          const message_id = message.id;
          const contact_name = contact?.profile?.name || 'Unknown';

          console.log(`Received message from ${phone_number}: ${message_body}`);

          // Insert or Update Contact
          await supabase.from('whatsapp_contacts').upsert({
            phone_number: phone_number,
            name: contact_name
          }, { onConflict: 'phone_number' });

          // Insert Message into Inbox
          await supabase.from('whatsapp_messages').insert({
            contact_phone: phone_number,
            direction: 'inbound',
            message_body: message_body,
            meta_message_id: message_id,
            status: 'received'
          });

          // Fetch Dynamic Configuration
          const { data: settings } = await supabase.from('whatsapp_settings').select('*').eq('id', 1).single();
          const WHATSAPP_TOKEN = settings?.access_token;
          const WHATSAPP_PHONE_ID = settings?.phone_number_id;

          // Auto-reply Logic (Simple Chatbot with 24-hour cooldown)
          if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID) {
            // Check if admin has replied to this user recently
            const { data: recentOutbound } = await supabase
              .from('whatsapp_messages')
              .select('created_at')
              .eq('contact_phone', phone_number)
              .eq('direction', 'outbound')
              .order('created_at', { ascending: false })
              .limit(1);

            let shouldReply = false;
            if (!recentOutbound || recentOutbound.length === 0) {
              // First time customer is messaging us, or we've never replied
              shouldReply = true;
            } else {
              const lastReplyDate = new Date(recentOutbound[0].created_at);
              const hoursSinceLastReply = (new Date().getTime() - lastReplyDate.getTime()) / (1000 * 60 * 60);
              // If admin hasn't replied in the last 24 hours, send auto-reply again
              if (hoursSinceLastReply > 24) {
                shouldReply = true;
              }
            }

            if (shouldReply) {
              let replyText = `Thanks for messaging Pure-Nutrix! We have received your message and will get back to you shortly.`;
              
              // Simple keyword trigger
              if (message_body.toLowerCase().includes('order') || message_body.toLowerCase().includes('track')) {
                replyText = `To track your order, please visit our website and check the My Account section, or provide your Order ID here.`;
              }

              const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`;
              await fetch(url, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: phone_number,
                  type: "text",
                  text: { body: replyText }
                })
              });

              // Log the outbound auto-reply in DB
              await supabase.from('whatsapp_messages').insert({
                contact_phone: phone_number,
                direction: 'outbound',
                message_body: replyText,
                status: 'sent'
              });
            }
          }
        }
        
        // Status updates (sent, delivered, read)
        if (value?.statuses && value.statuses.length > 0) {
            const statusObj = value.statuses[0];
            await supabase.from('whatsapp_messages')
              .update({ status: statusObj.status })
              .eq('meta_message_id', statusObj.id);
        }
      }

      return new Response('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
      console.error('Error handling webhook:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
});
