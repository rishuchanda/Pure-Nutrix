-- Phone alert to the owner when a customer sends a WhatsApp message (CRM).
-- New inbound row in whatsapp_messages -> notify-new-order function -> Web Push
-- to the admin devices that turned on alerts. Additive, safe to run twice.

alter table public.whatsapp_messages add column if not exists owner_notified_at timestamptz;
alter table public.whatsapp_messages add column if not exists owner_alerted boolean not null default false;

create or replace function public.notify_inbound_whatsapp()
returns trigger
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  begin
    perform net.http_post(
      url     := 'https://fhxlzzjsoalrmkykhacz.supabase.co/functions/v1/notify-new-order',
      body    := jsonb_build_object('inbound_message_id', new.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeGx6empzb2Fscm1reWtoYWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMzI4OTEsImV4cCI6MjA5OTkwODg5MX0.SynfgiOO394Bmw1r_XlYtTHQnG0KutZybL8TwznjZMM'
      ),
      timeout_milliseconds := 8000
    );
  exception when others then
    -- never block saving the customer's message
    raise warning 'notify_inbound_whatsapp failed: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists whatsapp_messages_notify_owner on public.whatsapp_messages;
create trigger whatsapp_messages_notify_owner
  after insert on public.whatsapp_messages
  for each row when (new.direction = 'inbound')
  execute function public.notify_inbound_whatsapp();
