// Helpers for adding WhatsApp contacts (single, pasted list, CSV, past orders).

// Indian mobile -> 91XXXXXXXXXX, or null if it is not a valid mobile number.
export const waPhone = (raw) => {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 13 && d.startsWith('091')) d = d.slice(3);
  return /^[6-9]\d{9}$/.test(d) ? `91${d}` : null;
};

export const prettyPhone = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  return d.length === 12 && d.startsWith('91') ? `+91 ${d.slice(2, 7)} ${d.slice(7)}` : `+${d}`;
};

const cleanName = (s) => String(s || '').replace(/["']/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);

// Accepts one contact per line: "Name, 9876543210", "9876543210 Name", "9876543210",
// or a CSV with a header row (name / phone / mobile / number columns).
export const parseContacts = (text) => {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { valid: [], invalid: [], duplicates: 0 };

  let nameCol = -1, phoneCol = -1, start = 0;
  const head = lines[0].toLowerCase().split(/[,;\t]/).map((h) => h.trim().replace(/"/g, ''));
  if (head.some((h) => /phone|mobile|number|whatsapp/.test(h))) {
    phoneCol = head.findIndex((h) => /phone|mobile|number|whatsapp/.test(h));
    nameCol = head.findIndex((h) => /name/.test(h));
    start = 1;
  }

  const seen = new Set();
  const valid = [], invalid = [];
  let duplicates = 0;
  for (const line of lines.slice(start)) {
    let phone = null, name = '';
    const cells = line.split(/[,;\t]/).map((c) => c.trim());
    if (phoneCol >= 0) {
      phone = waPhone(cells[phoneCol]);
      name = nameCol >= 0 ? cells[nameCol] : '';
    } else {
      // Find the cell (or run of digits) that is a mobile number; the rest is the name.
      const m = line.match(/(\+?\d[\d\s-]{8,16}\d)/);
      phone = m ? waPhone(m[1]) : null;
      name = m ? line.replace(m[1], ' ').replace(/[,;\t|:-]+/g, ' ') : '';
    }
    if (!phone) { invalid.push(line); continue; }
    if (seen.has(phone)) { duplicates++; continue; }
    seen.add(phone);
    valid.push({ phone_number: phone, name: cleanName(name) || null });
  }
  return { valid, invalid, duplicates };
};

// Offer status of a contact: 'yes' (agreed), 'stopped' (replied STOP) or 'unknown' (never asked).
export const offerStatus = (c) => (c?.opted_out_at ? 'stopped' : c?.offers_opt_in ? 'yes' : 'unknown');

// Meta's India marketing rate per delivered message (before 18% GST). Check WhatsApp Manager for the current rate.
export const MARKETING_RATE_INR = 0.8631;
export const estimateCost = (n) => Math.ceil(n * MARKETING_RATE_INR * 1.18);
