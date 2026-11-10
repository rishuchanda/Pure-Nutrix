import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Home, Truck, Package, MessageCircle, Menu as MenuIcon, FileText, Star, FlaskConical, Inbox, Users, Globe, Bell,
  LogOut, RefreshCcw, ExternalLink, ChevronRight, Lock, ChevronLeft,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import CRMTab from './CRMTab';
import GSTModule from './GSTModule';
import ReviewsTab from './ReviewsTab';
import SEOTab from './SEOTab';
import LabReportsTab from './LabReportsTab';
import MessagesTab from './MessagesTab';
import OrderAlertsCard from './OrderAlertsCard';
import AdminHome from './admin/AdminHome';
import AdminOrders from './admin/AdminOrders';
import AdminProducts from './admin/AdminProducts';
import AdminCustomers from './admin/AdminCustomers';
import { isOpen, LOW_STOCK } from './admin/adminUtils';
import './AdminDashboard.css';
import './admin/admin.css';

// Admin panel: built around the daily jobs — ship orders, keep stock right,
// answer WhatsApp, GST. Mobile: bottom tabs. Desktop: sidebar.

const MAIN = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'orders', label: 'Orders', icon: Truck },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'crm', label: 'Chat', icon: MessageCircle },
];
const MORE = [
  { id: 'gst', label: 'GST & invoices', desc: 'GST reports, B2C/B2B, invoice export', icon: FileText },
  { id: 'reviews', label: 'Reviews', desc: 'Approve customer reviews', icon: Star },
  { id: 'messages', label: 'Contact messages', desc: 'Messages from the Support page', icon: Inbox },
  { id: 'customers', label: 'Customers', desc: 'Who ordered, repeat buyers', icon: Users },
  { id: 'lab-reports', label: 'Lab reports & QR', desc: 'Upload reports, download QR', icon: FlaskConical },
  { id: 'alerts', label: 'Phone alerts', desc: 'Order & WhatsApp notifications', icon: Bell },
  { id: 'seo', label: 'SEO', desc: 'Page titles and Google settings', icon: Globe },
];
const ALIAS = { dashboard: 'home', catalog: 'products', inventory: 'products', users: 'customers' };
const ALL_IDS = new Set([...MAIN.map(m => m.id), ...MORE.map(m => m.id), 'more']);
const readTab = () => {
  try {
    const t = new URLSearchParams(window.location.search).get('tab');
    const id = ALIAS[t] || t;
    return ALL_IDS.has(id) ? id : 'home';
  } catch { return 'home'; }
};

const AdminDashboard = ({ user }) => {
  const [isAdmin, setIsAdmin] = useState(null); // null = checking
  const [role, setRole] = useState(null);
  const [tab, setTabState] = useState(readTab);
  const [orderFilter, setOrderFilter] = useState('open');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessages, setNewMessages] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const readOnly = role === 'viewer';

  const setTab = useCallback((id, filter) => {
    const t = ALIAS[id] || id;
    setTabState(t);
    if (filter) setOrderFilter(filter);
    try {
      const url = new URL(window.location.href);
      if (t === 'home') url.searchParams.delete('tab'); else url.searchParams.set('tab', t);
      window.history.replaceState(window.history.state, '', url.pathname + url.search);
    } catch { /* ignore */ }
    window.scrollTo(0, 0);
  }, []);

  // admin check
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase.from('admin_roles').select('role').eq('id', user.id).maybeSingle();
      if (!alive) return;
      setIsAdmin(!!data); setRole(data?.role || null);
    })();
    return () => { alive = false; };
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    const [o, p, m] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('created_at', { ascending: true }),
      supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ]);
    if (!o.error) setOrders(o.data || []);
    if (!p.error) setProducts(p.data || []);
    setNewMessages(m.count || 0);
    setLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);
  // refresh when the app comes back to the screen (e.g. after a phone alert)
  useEffect(() => {
    if (!isAdmin) return undefined;
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [isAdmin, load]);

  // a tap on a phone alert while the app is open switches tab (sent by sw.js)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onMsg = (e) => {
      if (e.data?.type !== 'pn-open') return;
      try { const t = new URL(e.data.url, window.location.origin).searchParams.get('tab'); setTab(t || 'home'); } catch { /* ignore */ }
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, [setTab]);

  // The WhatsApp update to the customer is sent by the server (trigger on
  // orders.status), so here we only save the new status.
  const updateStatus = useCallback(async (id, status) => {
    if (readOnly) return;
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) { alert('Could not update the order: ' + error.message); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  }, [readOnly]);

  const login = async (e) => {
    e.preventDefault(); setLoginError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoginError(error.message || 'Login failed.'); return; }
    const { data: r } = await supabase.from('admin_roles').select('role').eq('id', data.user.id).maybeSingle();
    if (!r) { await supabase.auth.signOut(); setLoginError('This account is not an admin.'); return; }
    setIsAdmin(true); setRole(r.role);
  };

  const badges = useMemo(() => ({
    orders: orders.filter(isOpen).length,
    products: products.filter(p => Number(p.stock || 0) <= LOW_STOCK).length,
    more: newMessages,
  }), [orders, products, newMessages]);

  if (isAdmin === null) return <div className="ax-shell admin-theme-light"><p className="ax-center ax-muted">Loading…</p></div>;

  if (!isAdmin) {
    return (
      <div className="ax-shell admin-theme-light ax-login-wrap" onWheel={e => e.stopPropagation()}>
        <form className="ax-login" onSubmit={login}>
          <span className="ax-login-icon"><Lock size={22} /></span>
          <h1>Pure Nutrix Admin</h1>
          <p className="ax-muted">Sign in with your admin account.</p>
          <label className="ax-field"><span>Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required /></label>
          <label className="ax-field"><span>Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
          {loginError && <p className="ax-error" role="alert">{loginError}</p>}
          <button type="submit" className="ax-btn ax-btn-dark ax-btn-block">Sign in</button>
          <a className="ax-muted ax-login-back" href="/">← Back to website</a>
        </form>
      </div>
    );
  }

  // Full-screen tools keep their own layout and back button.
  if (tab === 'crm') return <div className="admin-dashboard-wrapper admin-theme-light" onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}><CRMTab onBack={() => setTab('home')} /></div>;
  if (tab === 'gst') return <div className="admin-dashboard-wrapper admin-theme-dark" onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}><GSTModule orders={orders} products={products} onBack={() => setTab('more')} /></div>;

  const moreItem = MORE.find(m => m.id === tab);
  const notify = (msg) => alert(msg);

  return (
    <div className="ax-shell admin-theme-light" onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
      <aside className="ax-side" aria-label="Admin menu">
        <div className="ax-brand"><img src="/icons/icon-192.png" alt="" /><span>Pure Nutrix<small>Admin</small></span></div>
        <nav>
          {MAIN.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              <Icon size={18} /><span>{label === 'Chat' ? 'WhatsApp chat' : label}</span>{badges[id] > 0 && <em>{badges[id]}</em>}
            </button>
          ))}
          <div className="ax-side-sep" />
          {MORE.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              <Icon size={18} /><span>{label}</span>{id === 'messages' && newMessages > 0 && <em>{newMessages}</em>}
            </button>
          ))}
        </nav>
        <div className="ax-side-foot">
          <a href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> View website</a>
          <button type="button" onClick={() => supabase.auth.signOut().then(() => window.location.reload())}><LogOut size={16} /> Log out</button>
        </div>
      </aside>

      <div className="ax-main">
        <header className="ax-top">
          {moreItem ? (
            <button type="button" className="ax-icon-btn ax-only-mobile" aria-label="Back" onClick={() => setTab('more')}><ChevronLeft size={20} /></button>
          ) : <img className="ax-top-logo ax-only-mobile" src="/icons/icon-192.png" alt="" />}
          <span className="ax-top-title">{moreItem ? moreItem.label : tab === 'more' ? 'More' : (MAIN.find(m => m.id === tab)?.label || 'Admin')}</span>
          <button type="button" className="ax-icon-btn" aria-label="Refresh" onClick={load} disabled={loading}><RefreshCcw size={18} className={loading ? 'ax-spin' : ''} /></button>
        </header>

        <main className="ax-content">
          {tab === 'home' && <AdminHome orders={orders} products={products} loading={loading} onStatus={updateStatus} readOnly={readOnly} go={setTab} adminEmail={user?.email} />}
          {tab === 'orders' && <AdminOrders key={orderFilter} orders={orders} loading={loading} onStatus={updateStatus} readOnly={readOnly} initialFilter={orderFilter} />}
          {tab === 'products' && <AdminProducts products={products} setProducts={setProducts} loading={loading} readOnly={readOnly} />}
          {tab === 'customers' && <AdminCustomers orders={orders} loading={loading} />}
          {tab === 'reviews' && <div className="ax-page ax-legacy"><ReviewsTab showNotification={notify} /></div>}
          {tab === 'seo' && <div className="ax-page ax-legacy"><SEOTab showNotification={notify} /></div>}
          {tab === 'lab-reports' && <div className="ax-page ax-legacy"><LabReportsTab /></div>}
          {tab === 'messages' && <div className="ax-page"><div className="ax-page-head"><h1>Contact messages</h1></div><MessagesTab /></div>}
          {tab === 'alerts' && <div className="ax-page"><div className="ax-page-head"><h1>Phone alerts</h1><p className="ax-muted">Get a notification for every new order and every customer WhatsApp message.</p></div><OrderAlertsCard adminEmail={user?.email} /></div>}
          {tab === 'more' && (
            <div className="ax-page">
              <div className="ax-page-head"><h1>More</h1></div>
              <nav className="ax-more-list">
                {MORE.map(({ id, label, desc, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => setTab(id)}>
                    <span className="ax-more-icon"><Icon size={18} /></span>
                    <span className="ax-more-text"><strong>{label}</strong><small>{desc}</small></span>
                    {id === 'messages' && newMessages > 0 && <em>{newMessages} new</em>}
                    <ChevronRight size={18} className="ax-chev" />
                  </button>
                ))}
                <a href="/" target="_blank" rel="noopener noreferrer"><span className="ax-more-icon"><ExternalLink size={18} /></span><span className="ax-more-text"><strong>View website</strong><small>purenutrix.in</small></span><ChevronRight size={18} className="ax-chev" /></a>
                <button type="button" className="ax-logout" onClick={() => supabase.auth.signOut().then(() => window.location.reload())}><span className="ax-more-icon"><LogOut size={18} /></span><span className="ax-more-text"><strong>Log out</strong></span></button>
              </nav>
            </div>
          )}
        </main>
      </div>

      <nav className="ax-tabbar" aria-label="Admin sections">
        {[...MAIN, { id: 'more', label: 'More', icon: MenuIcon }].map(({ id, label, icon: Icon }) => {
          const on = tab === id || (id === 'more' && !!moreItem);
          return (
            <button key={id} type="button" className={on ? 'on' : ''} onClick={() => setTab(id)} aria-current={on ? 'page' : undefined}>
              <span className="ax-tab-icon"><Icon size={21} />{badges[id] > 0 && <em>{badges[id] > 99 ? '99+' : badges[id]}</em>}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminDashboard;
