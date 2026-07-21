-- SQL Script to create tables for the WhatsApp CRM
-- Please run this script in your Supabase SQL Editor

-- 1. Create WhatsApp Contacts Table
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL UNIQUE,
    name TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    total_orders INTEGER DEFAULT 0,
    lifetime_value NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for whatsapp_contacts
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (admins) to read/write. In a real scenario, you'd restrict this to admin roles.
CREATE POLICY "Allow all access to authenticated users" ON public.whatsapp_contacts
    FOR ALL USING (auth.role() = 'authenticated');


-- 2. Create WhatsApp Messages Table (Inbox History)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_phone TEXT NOT NULL REFERENCES public.whatsapp_contacts(phone_number) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_body TEXT,
    message_type TEXT DEFAULT 'text',
    status TEXT DEFAULT 'sent', -- sent, delivered, read, received
    meta_message_id TEXT, -- ID from Meta API
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for whatsapp_messages
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to authenticated users" ON public.whatsapp_messages
    FOR ALL USING (auth.role() = 'authenticated');

-- Function to update 'last_message_at' in contacts table automatically
CREATE OR REPLACE FUNCTION update_contact_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.whatsapp_contacts
    SET last_message_at = NEW.created_at
    WHERE phone_number = NEW.contact_phone;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_timestamp
AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION update_contact_last_message();
