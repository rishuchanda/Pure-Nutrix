import { supabase } from '../../supabaseClient';

// Adds or updates contacts without ever undoing a customer's STOP.
// list: [{ phone_number, name }]; optIn: the admin confirmed these people agreed to get offers.
export async function saveContacts(list, { optIn = false, source = 'manual' } = {}) {
  const phones = [...new Set(list.map((c) => c.phone_number))];
  const existing = {};
  for (let i = 0; i < phones.length; i += 200) {
    const { data, error } = await supabase.from('whatsapp_contacts')
      .select('phone_number, name, offers_opt_in, opted_out_at')
      .in('phone_number', phones.slice(i, i + 200));
    if (error) throw error;
    (data || []).forEach((c) => { existing[c.phone_number] = c; });
  }

  const now = new Date().toISOString();
  const fresh = [], result = { added: 0, updated: 0, optedIn: 0, stoppedSkipped: 0 };
  for (const c of list) {
    const old = existing[c.phone_number];
    if (!old) {
      fresh.push({ phone_number: c.phone_number, name: c.name || null, source, offers_opt_in: optIn, opted_in_at: optIn ? now : null });
      result.added++; if (optIn) result.optedIn++;
      continue;
    }
    const patch = {};
    if (c.name && !old.name) patch.name = c.name;
    if (optIn && !old.offers_opt_in) {
      if (old.opted_out_at) result.stoppedSkipped++;
      else { patch.offers_opt_in = true; patch.opted_in_at = now; result.optedIn++; }
    }
    if (Object.keys(patch).length) {
      const { error } = await supabase.from('whatsapp_contacts').update(patch).eq('phone_number', c.phone_number);
      if (error) throw error;
      result.updated++;
    }
  }
  for (let i = 0; i < fresh.length; i += 200) {
    const { error } = await supabase.from('whatsapp_contacts').insert(fresh.slice(i, i + 200));
    if (error) throw error;
  }
  return result;
}

// Admin changes one contact's offer permission. A STOP can only be undone by the customer (reply START).
export async function setOfferOptIn(contact, on) {
  if (contact.opted_out_at && on) throw new Error('This customer replied STOP. They can turn offers back on by replying START.');
  const patch = { offers_opt_in: on, opted_in_at: on ? new Date().toISOString() : null };
  const { data, error } = await supabase.from('whatsapp_contacts')
    .update(patch).eq('phone_number', contact.phone_number).select('phone_number');
  if (error) throw error;
  if (!data?.length) {
    // Contact only exists in past orders so far: create it.
    const { error: e2 } = await supabase.from('whatsapp_contacts')
      .insert({ phone_number: contact.phone_number, name: contact.name || null, source: 'order', ...patch });
    if (e2) throw e2;
  }
  return patch;
}

export async function callBroadcast(body) {
  const { data, error } = await supabase.functions.invoke('whatsapp-broadcast', { body });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); msg = j.error || msg; } catch { /* keep message */ }
    throw new Error(msg);
  }
  if (!data?.ok) throw new Error(data?.error || 'Something went wrong');
  return data;
}
