import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Package, Star, MapPin, User, LogOut, MessageCircle, RotateCcw,
  FileText, FlaskConical, Gift, Copy, Check, Plus, Pencil, Trash2, Clock, Truck, Home, XCircle, Pill
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import ProfessionalInvoice from './ProfessionalInvoice';
import { getProductDetails } from '../utils/productDetailsData';
import { fetchMyReviews } from '../utils/reviewsStore';
import './AccountPage.css';

// My Account: orders (status timeline, invoice, buy again, WhatsApp help),
// my products (how to take + lab report), my reviews, addresses, profile.
// Everything shown here is real data from Supabase — no placeholder features.

const WA_NUMBER = '917976979355'; // CRM WhatsApp number (menu bot)
const VIEWS = ['dashboard', 'orders', 'order', 'reviews', 'addresses', 'profile'];
const STEPS = [
  { key: 'placed', label: 'Placed', icon: Check },
  { key: 'processing', label: 'Packed', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
];
const STATUS_TEXT = {
  pending: 'Order placed', processing: 'Being packed', shipped: 'Shipped', out_for_delivery: 'Out for delivery',
  delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned',
};
const EMPTY_ADDR = { name: '', mobile: '', email: '', flat: '', area: '', landmark: '', city: '', state: '', pincode: '' };

const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const shortId = (id) => String(id || '').split('-')[0].toUpperCase();
const statusKey = (s) => String(s || 'processing').toLowerCase();
const stepIndex = (s) => {
  const k = statusKey(s);
  if (k === 'pending') return 0;
  const i = STEPS.findIndex(x => x.key === k);
  return i === -1 ? 1 : i;
};
const freeJars = (name) => [...String(name || '').matchAll(/\+\s*(\d+)x\s*Free/gi)].reduce((a, m) => a + Number(m[1]), 0);
const waHelp = (order) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hi Pure Nutrix, I need help with my order #${shortId(order.id)} (${fmtDate(order.created_at)}).`)}`;

const Timeline = ({ status }) => {
  const k = statusKey(status);
  if (k === 'cancelled' || k === 'returned') {
    return <div className="acc-timeline-stop"><XCircle size={16} /> {STATUS_TEXT[k]}</div>;
  }
  const at = stepIndex(status);
  return (
    <ol className="acc-timeline" aria-label={`Order status: ${STATUS_TEXT[k] || status}`}>
      {STEPS.map((s, i) => (
        <li key={s.key} className={i < at ? 'done' : i === at ? 'current' : ''}>
          <span className="acc-dot">{i <= at ? <Check size={11} strokeWidth={3} /> : null}</span>
          <span className="acc-step-label">{s.label}</span>
        </li>
      ))}
    </ol>
  );
};

const Stars = ({ n }) => (
  <span className="acc-stars" aria-label={`${n} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ color: i <= n ? '#f5b301' : '#d6d6d6' }}>★</span>)}
  </span>
);

const AccountPage = ({ user, onBack, onSignOut, onProductClick, onOpenAuth }) => {
  const [view, setView] = useState('dashboard');
  const [orders, setOrders] = useState(null);
  const [products, setProducts] = useState([]);
  const [addresses, setAddresses] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [addrForm, setAddrForm] = useState(null); // null = list, {..} = editing
  const [addrId, setAddrId] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);

  // ---------- routing: /account, /account/orders, /account/order/<id> ... ----------
  useEffect(() => {
    const read = () => {
      const [, main, sub, id] = window.location.pathname.split('/');
      if (main !== 'account') return;
      setView(VIEWS.includes(sub) ? sub : 'dashboard');
      if (sub !== 'order') setActiveOrder(null);
      if (sub === 'order' && id) setActiveOrder(prev => prev || { id, _pending: true });
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  const go = (v, extra = '') => {
    setView(v);
    setNote('');
    window.history.pushState({ view: 'account' }, '', v === 'dashboard' ? '/account' : `/account/${v}${extra}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
  };

  // ---------- data ----------
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [o, p, a] = await Promise.all([
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('products').select('id, name, slug, price, original_price, image_urls'),
        supabase.from('user_addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setOrders(o.data || []);
      setProducts(p.data || []);
      setAddresses(a.data || []);
    })();
    fetchMyReviews().then(setReviews).catch(() => setReviews([]));
  }, [user]);

  // resolve /account/order/<id> after orders load
  useEffect(() => {
    if (activeOrder?._pending && orders) setActiveOrder(orders.find(o => shortId(o.id) === shortId(activeOrder.id)) || null);
  }, [orders, activeOrder]);

  const meta = user?.user_metadata || {};
  const realEmail = user?.email && !user.email.includes('@whatsapp') ? user.email : '';
  const phone = meta.phone_number || (user?.email?.includes('@whatsapp') ? user.email.split('@')[0].replace(/\D/g, '').slice(-10) : '') || addresses?.[0]?.mobile || '';
  const displayName = meta.full_name || addresses?.[0]?.name || orders?.[0]?.customer_name || 'Pure Nutrix customer';
  const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'PN';

  // products this customer bought (matched by product name inside the order line)
  const boughtProducts = useMemo(() => {
    if (!orders?.length || !products.length) return [];
    const valid = orders.filter(o => !['cancelled', 'returned'].includes(statusKey(o.status)));
    return products
      .filter(p => valid.some(o => String(o.product_name || '').toLowerCase().includes(p.name.toLowerCase())))
      .map(p => ({ ...p, details: getProductDetails(p.name) }));
  }, [orders, products]);

  const productsInOrder = (order) => products.filter(p => String(order.product_name || '').toLowerCase().includes(p.name.toLowerCase()));
  const reviewedIds = new Set((reviews || []).map(r => r.productId));
  const toReview = boughtProducts.filter(p => !reviewedIds.has(p.id));
  const stats = useMemo(() => {
    const valid = (orders || []).filter(o => !['cancelled', 'returned'].includes(statusKey(o.status)));
    return { count: (orders || []).length, free: valid.reduce((a, o) => a + freeJars(o.product_name), 0), active: valid.filter(o => statusKey(o.status) !== 'delivered').length };
  }, [orders]);

  const openOrder = (o) => { setActiveOrder(o); go('order', `/${shortId(o.id)}`); };
  const buyAgain = (order) => {
    const p = productsInOrder(order)[0];
    if (p && onProductClick) onProductClick(p);
    else window.location.href = '/products';
  };
  const openProduct = (p, hash = '') => {
    if (hash) { window.location.href = `/product/${p.slug || p.id}${hash}`; return; }
    if (onProductClick) onProductClick(p); else window.location.href = `/product/${p.slug || p.id}`;
  };

  // ---------- addresses ----------
  const saveAddress = async (e) => {
    e.preventDefault();
    const row = { ...addrForm };
    if (!/^[6-9]\d{9}$/.test(row.mobile)) { setNote('Please enter a valid 10-digit mobile number.'); return; }
    if (!/^\d{6}$/.test(row.pincode)) { setNote('Please enter a valid 6-digit pincode.'); return; }
    const res = addrId
      ? await supabase.from('user_addresses').update(row).eq('id', addrId).select()
      : await supabase.from('user_addresses').insert([{ ...row, user_id: user.id }]).select();
    if (res.error) { setNote('Could not save: ' + res.error.message); return; }
    setAddresses(prev => addrId ? prev.map(a => a.id === addrId ? res.data[0] : a) : [res.data[0], ...prev]);
    setAddrForm(null); setAddrId(null); setNote('Address saved.');
  };
  const deleteAddress = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    const { error } = await supabase.from('user_addresses').delete().eq('id', id);
    if (error) { setNote('Could not delete: ' + error.message); return; }
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  // ---------- profile ----------
  const saveProfile = async (e) => {
    e.preventDefault();
    const name = profileName.trim();
    if (name.length < 2) { setNote('Please enter your name.'); return; }
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    setNote(error ? 'Could not save: ' + error.message : 'Profile updated.');
  };

  const copyCode = () => {
    navigator.clipboard?.writeText('PUREJOY10');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const Header = ({ title, back = 'dashboard' }) => (
    <div className="acc-subhead">
      <button type="button" className="acc-icon-btn" aria-label="Back" onClick={() => (back === 'home' ? onBack() : go(back))}><ChevronLeft size={22} /></button>
      <h1>{title}</h1>
    </div>
  );

  const OrderCard = ({ o, compact }) => {
    const k = statusKey(o.status);
    return (
      <article className="acc-order">
        <button type="button" className="acc-order-main" onClick={() => openOrder(o)}>
          {o.image ? <img src={o.image} alt="" loading="lazy" /> : <span className="acc-order-ph"><Package size={22} /></span>}
          <span className="acc-order-info">
            <span className="acc-order-top">
              <strong>#{shortId(o.id)}</strong>
              <span className={`acc-chip st-${k}`}>{STATUS_TEXT[k] || o.status}</span>
            </span>
            <span className="acc-order-items">{o.product_name}</span>
            <span className="acc-order-meta">{fmtDate(o.created_at)} · ₹{Number(o.price || 0).toLocaleString('en-IN')} · {o.payment_method === 'COD' ? 'Cash on Delivery' : 'Paid online'}</span>
          </span>
          <ChevronRight size={18} className="acc-chev" />
        </button>
        {!compact && <Timeline status={o.status} />}
        {!compact && (
          <div className="acc-order-actions">
            <button type="button" onClick={() => buyAgain(o)}><RotateCcw size={15} /> Buy again</button>
            <button type="button" onClick={() => setInvoiceOrder(o)}><FileText size={15} /> Invoice</button>
            <a href={waHelp(o)} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> Help</a>
          </div>
        )}
      </article>
    );
  };

  // ---------- views ----------
  const renderDashboard = () => (
    <>
      <div className="acc-hero">
        <button type="button" className="acc-icon-btn acc-hero-back" aria-label="Back to shop" onClick={onBack}><ChevronLeft size={22} /></button>
        <div className="acc-avatar" aria-hidden="true">{initials}</div>
        <div className="acc-hero-text">
          <span className="acc-hello">Hello,</span>
          <h1>{displayName}</h1>
          <span className="acc-contact">{[phone && `+91 ${phone}`, realEmail].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="acc-stats">
          <div><strong>{stats.count}</strong><span>Orders</span></div>
          <div><strong>{stats.free}</strong><span>Free jars (BOGO)</span></div>
          <div><strong>{reviews ? reviews.length : '–'}</strong><span>Reviews</span></div>
        </div>
      </div>

      {orders?.[0] && (
        <section className="acc-section">
          <div className="acc-section-head"><h2>Latest order</h2><button type="button" onClick={() => go('orders')}>All orders <ChevronRight size={15} /></button></div>
          <OrderCard o={orders[0]} />
        </section>
      )}

      {orders && orders.length === 0 && (
        <section className="acc-empty">
          <Package size={34} />
          <p>No orders yet. Every product comes with Buy 1 Get 1 FREE.</p>
          <a className="acc-btn-dark" href="/products">Shop now</a>
        </section>
      )}

      {boughtProducts.length > 0 && (
        <section className="acc-section">
          <div className="acc-section-head"><h2>My products</h2></div>
          <div className="acc-products">
            {boughtProducts.map(p => (
              <article key={p.id} className="acc-product">
                <button type="button" className="acc-product-top" onClick={() => openProduct(p)}>
                  {p.image_urls?.[0] && <img src={p.image_urls[0]} alt="" loading="lazy" />}
                  <strong>{p.name}</strong>
                </button>
                <div className="acc-howto">
                  <span className="acc-howto-title"><Pill size={14} /> How to take</span>
                  <ul>{(p.details.howToUse?.steps || []).slice(0, 3).map((s, i) => <li key={i}>{s.desc}</li>)}</ul>
                </div>
                <div className="acc-product-links">
                  {p.details.labReportSlug && <a href={`/lab-report/${p.details.labReportSlug}`}><FlaskConical size={14} /> Lab report</a>}
                  {!reviewedIds.has(p.id) && <button type="button" onClick={() => openProduct(p, '#reviews')}><Star size={14} /> Write a review</button>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="acc-offer">
        <Gift size={22} />
        <div><strong>Extra 10% off with PUREJOY10</strong><span>Plus Buy 1 Get 1 FREE on every product.</span></div>
        <button type="button" onClick={copyCode}>{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}</button>
      </section>

      <nav className="acc-menu" aria-label="Account">
        <button type="button" onClick={() => go('orders')}><Package size={19} /><span>My orders</span>{stats.active > 0 && <em>{stats.active} active</em>}<ChevronRight size={18} /></button>
        <button type="button" onClick={() => go('reviews')}><Star size={19} /><span>My reviews</span>{toReview.length > 0 && <em>{toReview.length} to write</em>}<ChevronRight size={18} /></button>
        <button type="button" onClick={() => go('addresses')}><MapPin size={19} /><span>Saved addresses</span><ChevronRight size={18} /></button>
        <button type="button" onClick={() => { setProfileName(displayName === 'Pure Nutrix customer' ? '' : displayName); go('profile'); }}><User size={19} /><span>Edit profile</span><ChevronRight size={18} /></button>
        <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hi Pure Nutrix, I need help.')}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} /><span>Help on WhatsApp</span><ChevronRight size={18} /></a>
        <button type="button" className="acc-logout" onClick={onSignOut}><LogOut size={19} /><span>Log out</span></button>
      </nav>
    </>
  );

  const renderOrders = () => (
    <>
      <Header title="My orders" />
      {orders === null ? <p className="acc-muted">Loading…</p> : orders.length === 0 ? (
        <section className="acc-empty"><Package size={34} /><p>No orders yet.</p><a className="acc-btn-dark" href="/products">Shop now</a></section>
      ) : <div className="acc-list">{orders.map(o => <OrderCard key={o.id} o={o} />)}</div>}
    </>
  );

  const renderOrder = () => {
    const o = activeOrder && !activeOrder._pending ? activeOrder : null;
    if (!o) return <><Header title="Order" back="orders" /><p className="acc-muted">{orders ? 'Order not found.' : 'Loading…'}</p></>;
    const k = statusKey(o.status);
    return (
      <>
        <Header title={`Order #${shortId(o.id)}`} back="orders" />
        <section className="acc-card">
          <div className="acc-order-top"><span className="acc-muted">Placed on {fmtDate(o.created_at)}</span><span className={`acc-chip st-${k}`}>{STATUS_TEXT[k] || o.status}</span></div>
          <Timeline status={o.status} />
          {k !== 'delivered' && k !== 'cancelled' && k !== 'returned' && (
            <p className="acc-hint"><Clock size={14} /> We dispatch in 24–48 hours. Delivery takes 2–7 business days. You get WhatsApp updates when it ships.</p>
          )}
        </section>
        <section className="acc-card">
          <h3>Items</h3>
          <div className="acc-items">
            {o.image && <img src={o.image} alt="" />}
            <p>{o.product_name}</p>
          </div>
          <dl className="acc-bill">
            <div><dt>Quantity</dt><dd>{o.qty || 1}</dd></div>
            {o.coupon_code && <div><dt>Coupon {o.coupon_code}</dt><dd>−₹{Number(o.discount_amount || 0).toLocaleString('en-IN')}</dd></div>}
            <div><dt>Payment</dt><dd>{o.payment_method === 'COD' ? 'Cash on Delivery' : 'Paid online'}</dd></div>
            <div className="acc-total"><dt>Total</dt><dd>₹{Number(o.price || 0).toLocaleString('en-IN')}</dd></div>
          </dl>
        </section>
        <section className="acc-card">
          <h3>Delivery address</h3>
          <p className="acc-addr">{o.customer_name}<br />{o.shipping_address}<br />{[o.city, o.state].filter(Boolean).join(', ')} {o.pincode}<br />{o.customer_mobile && `+91 ${o.customer_mobile}`}</p>
        </section>
        <div className="acc-order-actions acc-order-actions-lg">
          <button type="button" onClick={() => buyAgain(o)}><RotateCcw size={16} /> Buy again</button>
          <button type="button" onClick={() => setInvoiceOrder(o)}><FileText size={16} /> Invoice</button>
          <a href={waHelp(o)} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Help with this order</a>
        </div>
      </>
    );
  };

  const renderReviews = () => (
    <>
      <Header title="My reviews" />
      {toReview.length > 0 && (
        <section className="acc-section">
          <div className="acc-section-head"><h2>Waiting for your review</h2></div>
          <div className="acc-list">
            {toReview.map(p => (
              <button type="button" key={p.id} className="acc-row" onClick={() => openProduct(p, '#reviews')}>
                {p.image_urls?.[0] && <img src={p.image_urls[0]} alt="" />}
                <span>{p.name}</span>
                <em><Star size={14} /> Review</em>
              </button>
            ))}
          </div>
        </section>
      )}
      {reviews === null ? <p className="acc-muted">Loading…</p> : reviews.length === 0 ? (
        <section className="acc-empty"><Star size={34} /><p>You haven't written a review yet.</p></section>
      ) : (
        <div className="acc-list">
          {reviews.map(r => (
            <article key={r.id} className="acc-card acc-review">
              <div className="acc-order-top"><strong>{r.productName}</strong>
                <span className={`acc-chip ${r.status === 'Approved' ? 'st-delivered' : r.status === 'Rejected' ? 'st-cancelled' : 'st-processing'}`}>
                  {r.status === 'Approved' ? 'Live' : r.status === 'Rejected' ? 'Not published' : 'Being checked'}
                </span>
              </div>
              <Stars n={r.rating} />
              <p>{r.comment}</p>
              {r.photos?.length > 0 && <div className="acc-review-photos">{r.photos.map(u => <img key={u} src={u} alt="" loading="lazy" />)}</div>}
              <span className="acc-muted">{r.date}</span>
            </article>
          ))}
        </div>
      )}
    </>
  );

  const renderAddresses = () => (
    <>
      <Header title="Saved addresses" />
      {addrForm ? (
        <form className="acc-card acc-form" onSubmit={saveAddress}>
          <h3>{addrId ? 'Edit address' : 'New address'}</h3>
          {[
            ['name', 'Full name', 'text', true], ['mobile', 'Mobile number (10 digits)', 'tel', true], ['email', 'Email (optional)', 'email', false],
            ['flat', 'House / flat / building', 'text', true], ['area', 'Area / street', 'text', true], ['landmark', 'Landmark (optional)', 'text', false],
            ['city', 'City', 'text', true], ['state', 'State', 'text', true], ['pincode', 'Pincode', 'text', true],
          ].map(([k, label, type, req]) => (
            <label key={k}><span>{label}</span>
              <input type={type} required={req} value={addrForm[k] || ''} inputMode={k === 'mobile' || k === 'pincode' ? 'numeric' : undefined}
                maxLength={k === 'mobile' ? 10 : k === 'pincode' ? 6 : 120}
                onChange={e => setAddrForm({ ...addrForm, [k]: k === 'mobile' || k === 'pincode' ? e.target.value.replace(/\D/g, '') : e.target.value })} />
            </label>
          ))}
          <div className="acc-form-actions">
            <button type="button" className="acc-btn-light" onClick={() => { setAddrForm(null); setAddrId(null); }}>Cancel</button>
            <button type="submit" className="acc-btn-dark">Save address</button>
          </div>
        </form>
      ) : (
        <>
          <button type="button" className="acc-btn-dark acc-btn-block" onClick={() => { setAddrId(null); setAddrForm({ ...EMPTY_ADDR, name: meta.full_name || '', mobile: phone || '' }); }}><Plus size={16} /> Add new address</button>
          {addresses === null ? <p className="acc-muted">Loading…</p> : addresses.length === 0 ? (
            <section className="acc-empty"><MapPin size={34} /><p>No saved addresses yet.</p></section>
          ) : (
            <div className="acc-list">
              {addresses.map(a => (
                <article key={a.id} className="acc-card acc-address">
                  <div>
                    <strong>{a.name}</strong>
                    <p className="acc-addr">{a.flat}, {a.area}{a.landmark ? `, ${a.landmark}` : ''}<br />{a.city}, {a.state} {a.pincode}<br />+91 {a.mobile}</p>
                  </div>
                  <div className="acc-address-actions">
                    <button type="button" aria-label="Edit address" onClick={() => { setAddrId(a.id); setAddrForm({ ...EMPTY_ADDR, ...a, id: undefined, user_id: undefined, created_at: undefined }); }}><Pencil size={16} /></button>
                    <button type="button" aria-label="Delete address" onClick={() => deleteAddress(a.id)}><Trash2 size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );

  const renderProfile = () => (
    <>
      <Header title="Edit profile" />
      <form className="acc-card acc-form" onSubmit={saveProfile}>
        <label><span>Your name</span><input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} maxLength={60} required /></label>
        <label><span>Mobile</span><input type="text" value={phone ? `+91 ${phone}` : 'Not added'} disabled /></label>
        <label><span>Email</span><input type="text" value={realEmail || 'Not added'} disabled /></label>
        <p className="acc-muted">To change your mobile number or email, message us on WhatsApp.</p>
        <div className="acc-form-actions"><button type="submit" className="acc-btn-dark">Save</button></div>
      </form>
    </>
  );

  if (!user) {
    return (
      <div className="acc-page">
        <div className="acc-wrap">
          <section className="acc-empty">
            <User size={34} />
            <p>Log in to see your orders, track delivery and write reviews.</p>
            <button type="button" className="acc-btn-dark" onClick={() => onOpenAuth && onOpenAuth()}>Log in</button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="acc-page">
      <div className="acc-wrap">
        {view === 'dashboard' && renderDashboard()}
        {view === 'orders' && renderOrders()}
        {view === 'order' && renderOrder()}
        {view === 'reviews' && renderReviews()}
        {view === 'addresses' && renderAddresses()}
        {view === 'profile' && renderProfile()}
        {note && <p className="acc-note" role="status">{note}</p>}
      </div>
      {invoiceOrder && <ProfessionalInvoice order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
    </div>
  );
};

export default AccountPage;
