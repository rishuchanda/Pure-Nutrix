// Small helpers shared by the admin screens.

export const STATUS = {
  pending:          { label: 'New',              tone: 'new' },
  processing:       { label: 'To pack',          tone: 'new' },
  shipped:          { label: 'Shipped',          tone: 'ship' },
  out_for_delivery: { label: 'Out for delivery', tone: 'ship' },
  delivered:        { label: 'Delivered',        tone: 'done' },
  cancelled:        { label: 'Cancelled',        tone: 'bad' },
  returned:         { label: 'Returned',         tone: 'bad' },
};

// The one-tap "next step" for each status.
export const NEXT = {
  pending: { to: 'processing', label: 'Accept & pack' },
  processing: { to: 'shipped', label: 'Mark shipped' },
  shipped: { to: 'out_for_delivery', label: 'Out for delivery' },
  out_for_delivery: { to: 'delivered', label: 'Mark delivered' },
};

export const statusKey = (s) => String(s || 'pending').toLowerCase();
export const isOpen = (o) => ['pending', 'processing'].includes(statusKey(o.status));
export const isInTransit = (o) => ['shipped', 'out_for_delivery'].includes(statusKey(o.status));
export const isLost = (o) => ['cancelled', 'returned'].includes(statusKey(o.status));
export const isCOD = (o) => o.payment_method === 'COD' || /\|\s*COD\b/i.test(o.product_name || '');

export const inr = (n) => `₹${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;
export const shortId = (id) => String(id || '').split('-')[0].toUpperCase();

export const fmtDate = (iso, withTime = false) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', withTime
      ? { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
};

export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const phone10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
export const waLink = (p, text = '') => {
  const d = phone10(p);
  return d.length === 10 ? `https://wa.me/91${d}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null;
};

export const fullAddress = (o) =>
  [o.customer_name, o.shipping_address, [o.city, o.state].filter(Boolean).join(', ') + (o.pincode ? ` - ${o.pincode}` : ''), o.customer_mobile ? `Mobile: ${o.customer_mobile}` : '']
    .filter(Boolean).join('\n');

// Order lines look like "2x Product name (+ 2x Free BOGO), 1x Other (+ 1x Free BOGO) | COD".
// Returns [{ name, qty }] for paid units.
export const orderLines = (o) =>
  String(o.product_name || '')
    .split(/,\s*(?=\d+x\s)/)
    .map((part) => {
      const m = part.match(/^(\d+)x\s+(.+?)(?:\s*\(\+.*?\))?(?:\s*\|.*)?$/);
      return m ? { qty: Number(m[1]), name: m[2].trim() } : null;
    })
    .filter(Boolean);

export const LOW_STOCK = 10;

export const copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    t.remove(); return ok;
  }
};
