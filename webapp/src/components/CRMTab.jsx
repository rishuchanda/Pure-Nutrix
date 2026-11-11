import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  Search, Send, MessageSquare, TrendingUp, Users, Plus,
  X, Bot, UserPlus, Edit2, Check, ChevronRight,
  Inbox, Megaphone, Settings, Trash2, Phone, RefreshCcw, Paperclip, FileText
} from 'lucide-react';
import {
  MEDIA_BUCKET, MEDIA_ACCEPT, MessageMedia, isMediaMessage, classifyFile, outboundPath, formatBytes
} from './WhatsAppMedia';
import AddContactsModal from './crm/AddContactsModal';
import OfferBroadcast from './crm/OfferBroadcast';
import BotSettings from './crm/BotSettings';
import { waPhone, offerStatus } from './crm/contactUtils';
import { setOfferOptIn } from './crm/contactsApi';
import './CRMTab.css';
import './crm/crmBroadcast.css';

// ─── Default Auto-Reply Rules ────────────────────────────────────────────────
const DEFAULT_AUTO_REPLIES = [
  { id: 1, keyword: 'order', reply: 'To track your order, please visit our website and go to My Account section, or share your Order ID here.' },
  { id: 2, keyword: 'price', reply: 'Visit our Products page on www.purenutrix.com to see all product prices and current offers!' },
  { id: 3, keyword: 'hi', reply: 'Hello! 👋 Welcome to Pure-Nutrix. How can I help you today?' },
  { id: 4, keyword: 'hello', reply: 'Hello! 👋 Welcome to Pure-Nutrix. How can I help you today?' },
];

// ─── Main CRM Component ───────────────────────────────────────────────────────
const CRMTab = ({ onBack }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeSection, setActiveSection] = useState('inbox'); // inbox | contacts | autoreply | campaigns
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New Contact Modal
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactFilter, setContactFilter] = useState('all'); // all | yes | unknown | stopped

  // Auto-Reply State
  const [autoReplies, setAutoReplies] = useState(DEFAULT_AUTO_REPLIES);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');
  const [newReplyText, setNewReplyText] = useState('');
  const [editingRule, setEditingRule] = useState(null);


  // Settings State
  const [waSettings, setWaSettings] = useState({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Template States
  const [customInboxTemplate, setCustomInboxTemplate] = useState('');

  const messagesEndRef = useRef(null);

  // ─── Media attachment (photo / video / audio / document) ───
  const fileInputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null); // { file, kind, mime, previewUrl }

  const clearPendingFile = () => {
    setPendingFile(prev => { if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl); return null; });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const info = classifyFile(file);
    if (info.error) {
      alert(info.error);
      e.target.value = '';
      return;
    }
    setPendingFile(prev => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return { file, kind: info.kind, mime: info.mime, previewUrl: info.kind === 'image' ? URL.createObjectURL(file) : null };
    });
  };

  // Drop the attachment when switching to another chat
  useEffect(() => { clearPendingFile(); }, [selectedContact?.phone_number]);

  // ─── Realtime Subscription & Settings Fetch ──────────────────────────────────────────
  useEffect(() => {
    // Splash screen timer
    const timer = setTimeout(() => setShowSplash(false), 2000);

    fetchContacts();
    
    // Fetch Settings
    supabase.from('whatsapp_settings').select('*').eq('id', 1).single().then(({ data }) => {
       if (data) setWaSettings(data);
    });

    const subscription = supabase
      .channel('crm_realtime')
      // New inbound messages
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, payload => {
        if (selectedContact && payload.new.contact_phone === selectedContact.phone_number) {
          setMessages(prev => {
            // Avoid duplicates (optimistic vs realtime)
            const exists = prev.some(m => m.id === payload.new.id);
            return exists ? prev : [...prev, payload.new];
          });
        }
        setContacts(prev =>
          prev.map(c => c.phone_number === payload.new.contact_phone
            ? { ...c, last_message_at: payload.new.created_at, last_message: payload.new.message_body }
            : c
          ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
        );
      })
      // Status updates (sent → delivered → read) — double tick magic ✓✓
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' }, payload => {
        setMessages(prev =>
          prev.map(m =>
            m.id === payload.new.id || (m.meta_message_id && m.meta_message_id === payload.new.meta_message_id)
              ? { ...m, ...payload.new } // also brings in media once the webhook has saved it
              : m
          )
        );
      })
      .subscribe();
    return () => {
       clearTimeout(timer);
       supabase.removeChannel(subscription);
    }
  }, [selectedContact]);

  useEffect(() => {
    if (selectedContact) fetchMessages(selectedContact.phone_number);
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Data Fetchers ────────────────────────────────────────────────────────
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data: crmData, error } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (!error && crmData) {
        // Also merge order customers who aren't in CRM yet
        const { data: orderData } = await supabase
          .from('orders')
          .select('customer_name, customer_mobile, price, created_at');

        const merged = { ...Object.fromEntries(crmData.map(c => [c.phone_number, c])) };

        if (orderData) {
          orderData.forEach(o => {
            const phone = waPhone(o.customer_mobile);
            if (!phone) return;
            if (!merged[phone]) {
              merged[phone] = {
                phone_number: phone,
                name: o.customer_name,
                total_orders: 1,
                lifetime_value: Number(o.price) || 0,
                last_message_at: o.created_at,
                from_orders: true
              };
            } else {
              merged[phone].total_orders = (merged[phone].total_orders || 0) + 1;
              merged[phone].lifetime_value = (merged[phone].lifetime_value || 0) + (Number(o.price) || 0);
            }
          });
        }

        setContacts(Object.values(merged).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)));
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (phone) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('contact_phone', phone)
        .order('created_at', { ascending: true });
      setMessages(!error && data ? data : []);
    } catch { setMessages([]); }
  };

  // ─── Send Message ─────────────────────────────────────────────────────────
  // ─── Send Media ───────────────────────────────────────────────────────────
  const handleSendMedia = async () => {
    const attachment = pendingFile;
    const caption = attachment.kind === 'audio' ? '' : messageInput.trim();
    setIsSending(true);
    const optMsg = {
      id: 'temp-' + Date.now(),
      contact_phone: selectedContact.phone_number,
      direction: 'outbound',
      message_type: attachment.kind,
      message_body: caption,
      media_local_url: URL.createObjectURL(attachment.file),
      media_mime: attachment.mime,
      media_filename: attachment.file.name,
      media_size: attachment.file.size,
      status: 'sending',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optMsg]);
    setMessageInput('');
    clearPendingFile();

    try {
      // STEP 1: Ensure contact exists (FK dependency)
      const { data: ext1 } = await supabase.from('whatsapp_contacts').select('id').eq('phone_number', selectedContact.phone_number).maybeSingle();
      if (!ext1) {
         await supabase.from('whatsapp_contacts').insert({ phone_number: selectedContact.phone_number, name: selectedContact.name || null, last_message_at: new Date().toISOString() });
      } else {
         await supabase.from('whatsapp_contacts').update({ last_message_at: new Date().toISOString() }).eq('phone_number', selectedContact.phone_number);
      }

      // STEP 2: Put the file in our private bucket
      const path = outboundPath(selectedContact.phone_number, attachment.file.name);
      const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, attachment.file, { contentType: attachment.mime, upsert: false });
      if (upErr) throw new Error('Upload failed: ' + upErr.message);

      // STEP 3: The edge function hands it to WhatsApp and sends it
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone_number: selectedContact.phone_number,
          type: 'media',
          media_kind: attachment.kind,
          media_path: path,
          caption,
          filename: attachment.file.name
        }
      });
      if (error || !data?.success) {
        let reason = data?.error;
        if (!reason && error?.context?.json) { try { reason = (await error.context.json())?.error; } catch { /* ignore */ } }
        throw new Error(reason || error?.message || 'Send failed');
      }
      const metaMsgId = data?.data?.messages?.[0]?.id || null;

      // STEP 4: Log it in the inbox
      const { data: insertedMsg } = await supabase.from('whatsapp_messages').insert({
        contact_phone: selectedContact.phone_number,
        direction: 'outbound',
        message_type: attachment.kind,
        message_body: caption,
        media_path: path,
        media_mime: attachment.mime,
        media_filename: attachment.file.name,
        media_size: attachment.file.size,
        status: 'sent',
        meta_message_id: metaMsgId
      }).select().single();

      setMessages(prev => prev.map(m =>
        m.id === optMsg.id ? { ...(insertedMsg || m), media_local_url: optMsg.media_local_url, status: 'sent' } : m
      ));
    } catch (err) {
      console.error('Media send error:', err);
      alert('Failed to send file: ' + err.message + (/24|re-engage|window/i.test(err.message) ? '\n\nWhatsApp only allows free messages within 24 hours of the customer\'s last message. Send a template first.' : ''));
      setMessages(prev => prev.map(m => m.id === optMsg.id ? { ...m, status: 'failed' } : m));
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (pendingFile && selectedContact && !isSending) return handleSendMedia();
    if (!messageInput.trim() || !selectedContact || isSending) return;
    setIsSending(true);
    const textToSend = messageInput;
    setMessageInput('');
    const optMsg = {
      id: 'temp-' + Date.now(),
      contact_phone: selectedContact.phone_number,
      direction: 'outbound',
      message_body: textToSend,
      status: 'sending',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optMsg]);

    try {
      // STEP 1: Ensure contact exists in whatsapp_contacts FIRST (FK dependency)
      const { data: ext1 } = await supabase.from('whatsapp_contacts').select('id').eq('phone_number', selectedContact.phone_number).maybeSingle();
      if (!ext1) {
         await supabase.from('whatsapp_contacts').insert({ phone_number: selectedContact.phone_number, name: selectedContact.name || null, last_message_at: new Date().toISOString() });
      } else {
         await supabase.from('whatsapp_contacts').update({ last_message_at: new Date().toISOString() }).eq('phone_number', selectedContact.phone_number);
      }

      // STEP 2: Send via WhatsApp API
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone_number: selectedContact.phone_number,
          message: textToSend,
          type: 'text'
        }
      });

      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Send failed');

      // Extract meta_message_id (wamid) from API response — needed for delivery/read receipts
      const metaMsgId = data?.data?.messages?.[0]?.id || null;

      // STEP 3: Log message in DB with meta_message_id so webhook can update status
      const { data: insertedMsg } = await supabase.from('whatsapp_messages').insert({
        contact_phone: selectedContact.phone_number,
        direction: 'outbound',
        message_body: textToSend,
        status: 'sent',
        meta_message_id: metaMsgId
      }).select().single();

      // Replace optimistic message with real DB record
      setMessages(prev => prev.map(m =>
        m.id === optMsg.id
          ? { ...(insertedMsg || m), status: 'sent' }
          : m
      ));

    } catch (err) {
      console.error('Send error:', err);
      alert('Failed to send: ' + err.message);
      setMessages(prev => prev.map(m => m.id === optMsg.id ? { ...m, status: 'failed' } : m));
      setMessageInput(textToSend); // Restore the message so user can retry
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTemplate = async () => {
    const templateName = customInboxTemplate.trim() || 'hello_world';
    if (!selectedContact || isSending) return;
    setIsSending(true);
    const optMsg = {
      id: 'temp-' + Date.now(),
      contact_phone: selectedContact.phone_number,
      direction: 'outbound',
      message_body: `[Template Sent: ${templateName}]`,
      status: 'sending',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optMsg]);
    try {
      const { data: ext1 } = await supabase.from('whatsapp_contacts').select('id').eq('phone_number', selectedContact.phone_number).maybeSingle();
      if (!ext1) {
         await supabase.from('whatsapp_contacts').insert({ phone_number: selectedContact.phone_number, name: selectedContact.name || null, last_message_at: new Date().toISOString() });
      } else {
         await supabase.from('whatsapp_contacts').update({ last_message_at: new Date().toISOString() }).eq('phone_number', selectedContact.phone_number);
      }

      let templateComponents = [];
      if (templateName === 'order_confirmation') {
        templateComponents = [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: selectedContact.name || 'Customer' },
              { type: 'text', text: 'Pure Nutrix Products' },
              { type: 'text', text: 'Paid' }
            ]
          }
        ];
      }

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone_number: selectedContact.phone_number,
          type: 'template',
          template_name: templateName,
          template_components: templateComponents
        }
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Template failed');
      const metaMsgId = data?.data?.messages?.[0]?.id || null;
      const { data: insertedMsg } = await supabase.from('whatsapp_messages').insert({
        contact_phone: selectedContact.phone_number,
        direction: 'outbound',
        message_body: `[Template Sent: ${templateName}]`,
        status: 'sent',
        meta_message_id: metaMsgId
      }).select().single();
      setMessages(prev => prev.map(m => m.id === optMsg.id ? { ...(insertedMsg || m), status: 'sent' } : m));
    } catch (err) {
      console.error('Send error:', err);
      alert('Failed to send template: ' + err.message);
      setMessages(prev => prev.map(m => m.id === optMsg.id ? { ...m, status: 'failed' } : m));
    } finally {
      setIsSending(false);
    }
  };


  // ─── Offer permission toggle (Contacts) ──────────────────────────────────
  const toggleOffers = async (c) => {
    const st = offerStatus(c);
    if (st === 'stopped') { alert('This customer replied STOP. They get offers again only if they reply START.'); return; }
    const on = st !== 'yes';
    if (on && !window.confirm(`Did ${c.name || 'this customer'} agree to get offers from Pure Nutrix on WhatsApp?`)) return;
    try {
      const patch = await setOfferOptIn(c, on);
      setContacts(prev => prev.map(x => x.phone_number === c.phone_number ? { ...x, ...patch, from_orders: false } : x));
    } catch (err) { alert(err.message); }
  };

  // ─── Auto-Reply CRUD ──────────────────────────────────────────────────────
  const handleAddAutoReply = () => {
    if (!newKeyword.trim() || !newReplyText.trim()) return;
    setAutoReplies(prev => [...prev, { id: Date.now(), keyword: newKeyword.toLowerCase().trim(), reply: newReplyText.trim() }]);
    setNewKeyword(''); setNewReplyText('');
  };
  const handleDeleteAutoReply = (id) => setAutoReplies(prev => prev.filter(r => r.id !== id));
  const handleSaveEdit = (id) => {
    setAutoReplies(prev => prev.map(r => r.id === editingRule.id ? editingRule : r));
    setEditingRule(null);
  };

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone_number?.includes(searchTerm)
  );
  const shownContacts = contactFilter === 'all' ? filteredContacts : filteredContacts.filter(c => offerStatus(c) === contactFilter);
  const offerCounts = contacts.reduce((acc, c) => { acc[offerStatus(c)] += 1; return acc; }, { yes: 0, unknown: 0, stopped: 0 });

  const totalLTV = contacts.reduce((acc, c) => acc + (Number(c.lifetime_value) || 0), 0);
  const totalMessages = messages.length;

  // ─── Save Settings ────────────────────────────────────────────────────────
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
       const { error } = await supabase.from('whatsapp_settings').upsert({ id: 1, ...waSettings });
       if (error) throw error;
       alert('Settings saved successfully!');
    } catch (err) {
       console.error(err);
       alert('Failed to save settings: ' + err.message);
    } finally {
       setIsSavingSettings(false);
    }
  };

  // ─── NAV ITEMS ────────────────────────────────────────────────────────────
  const navItems = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'autoreply', label: 'Menu Bot', icon: Bot },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (showSplash) {
    return (
      <div className="crm-splash-screen">
        <div className="crm-splash-content">
          <div className="crm-splash-logo">
            <MessageSquare size={48} color="#D4AF37" />
          </div>
          <h1>Welcome to Pure-Nutrix CRM</h1>
          <p>Loading your secure workspace...</p>
          <div className="crm-splash-loader"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`crm-fullscreen-container crm-view-${activeSection}${activeSection === 'inbox' && selectedContact ? ' crm-chat-open' : ''}`}>
      {/* ── Top Floating Nav ── */}
      <div className="crm-floating-header">
        <button className="crm-back-btn" onClick={onBack}>
          <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
          <span>Back to Panel</span>
        </button>
        <div className="crm-brand-title">
          CRM <span className="gold-text">WORKSPACE</span>
        </div>
      </div>

      <div className="crm-container">

      {/* ── Top Stats Bar ── */}
      <div className="crm-analytics-banner">
        <div className="crm-stat">
          <Users size={22} className="stat-icon" />
          <div><div className="stat-value">{contacts.length}</div><div className="stat-label">Total Contacts</div></div>
        </div>
        <div className="crm-stat">
          <TrendingUp size={22} className="stat-icon" />
          <div><div className="stat-value">₹{totalLTV.toLocaleString()}</div><div className="stat-label">Pipeline Value</div></div>
        </div>
        <div className="crm-stat">
          <MessageSquare size={22} className="stat-icon" />
          <div><div className="stat-value">Menu</div><div className="stat-label">WhatsApp Bot</div></div>
        </div>
        <div className="crm-top-actions">
          <button className="admin-btn admin-btn-primary crm-add-btn" onClick={() => setShowAddContact(true)}>
            <UserPlus size={16} /> Add Contacts
          </button>
          <button className="admin-btn admin-btn-secondary crm-refresh-btn" onClick={fetchContacts}>
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>

      {/* ── Main Workspace ── */}
      <div className="crm-main">

        {/* Left: Section Nav + Contact List */}
        <div className="crm-sidebar">
          {/* Section Nav Tabs */}
          <div className="crm-section-nav">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`crm-nav-btn ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search + Contact List (only for inbox/contacts) */}
          {(activeSection === 'inbox' || activeSection === 'contacts') && (
            <>
              <div className="crm-search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder={`Search contacts...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="crm-contact-list">
                {loading ? (
                  <div className="crm-loading">Loading contacts...</div>
                ) : filteredContacts.length === 0 ? (
                  <div className="crm-empty">
                    <UserPlus size={32} opacity={0.3} />
                    <p>No contacts yet.</p>
                    <button className="admin-btn admin-btn-primary" style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setShowAddContact(true)}>Add Contact</button>
                  </div>
                ) : (
                  filteredContacts.map(contact => (
                    <div
                      key={contact.phone_number}
                      className={`crm-contact-item ${selectedContact?.phone_number === contact.phone_number ? 'active' : ''}`}
                      onClick={() => { setSelectedContact(contact); if (activeSection === 'contacts') setActiveSection('inbox'); }}
                    >
                      <div className="contact-avatar">
                        {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="contact-info">
                        <div className="contact-name">{contact.name || 'Unknown'}</div>
                        <div className="contact-phone">+{contact.phone_number}</div>
                      </div>
                      <div className="contact-meta">
                        {contact.last_message_at && (
                          <div className="contact-time">
                            {new Date(contact.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                        {contact.total_orders > 0 && (
                          <div className="contact-badge">{contact.total_orders}x</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Content Area */}
        <div className="crm-content-area">

          {/* ── INBOX ── */}
          {activeSection === 'inbox' && (
            selectedContact ? (
              <div className="crm-chat-area">
                {/* Chat Header */}
                <div className="chat-header">
                  <div className="chat-header-info">
                    <button type="button" className="chat-back-btn" onClick={() => setSelectedContact(null)} aria-label="Back to contacts">
                      <ChevronRight size={22} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <div className="contact-avatar large">{selectedContact.name?.charAt(0) || '?'}</div>
                    <div>
                      <div className="chat-name">{selectedContact.name || 'Unknown Customer'}</div>
                      <div className="chat-phone">+{selectedContact.phone_number}</div>
                    </div>
                  </div>
                  <div className="chat-header-actions">
                    {selectedContact.total_orders > 0 && (
                      <div className="chat-ltv">₹{Number(selectedContact.lifetime_value || 0).toLocaleString()} LTV</div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                  {messages.length === 0 ? (
                    <div className="empty-chat">
                      <MessageSquare size={48} opacity={0.15} />
                      <p>No messages yet. Send the first one!</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isOut = msg.direction === 'outbound';
                      const getTickIcon = (status) => {
                        if (status === 'read')      return <span className="tick read"   title="Read">✓✓</span>;
                        if (status === 'delivered') return <span className="tick delivered" title="Delivered">✓✓</span>;
                        if (status === 'failed')    return <span className="tick failed" title="Failed">✗</span>;
                        if (status === 'sending')   return <span className="tick sending" title="Sending">🕐</span>;
                        return                             <span className="tick sent"  title="Sent">✓</span>;
                      };
                      return (
                        <div key={msg.id || idx} className={`msg-wrapper ${isOut ? 'outbound' : 'inbound'}`}>
                          <div className={`msg-bubble ${isOut ? 'out' : 'in'} ${msg.status === 'failed' ? 'failed' : ''}`}>
                            {isMediaMessage(msg) && <MessageMedia msg={msg} />}
                            {msg.message_body && <span className="msg-text">{msg.message_body}</span>}
                            <div className="msg-meta">
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isOut && getTickIcon(msg.status)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="crm-template-bar" style={{ padding: '0.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Select Template (24h bypass):</span>
                  <select 
                    value={customInboxTemplate} 
                    onChange={e => setCustomInboxTemplate(e.target.value)} 
                    style={{ padding: '4px 8px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', width: '180px' }}
                  >
                    <option value="monsoon_offer">monsoon_offer</option>
                    <option value="order_confirmation">order_confirmation</option>
                    <option value="hello_world">hello_world</option>
                  </select>
                  <button onClick={handleSendTemplate} className="admin-btn admin-btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} disabled={isSending}>Send Template</button>
                </div>
                {pendingFile && (
                  <div className="chat-attachment-preview">
                    {pendingFile.previewUrl
                      ? <img src={pendingFile.previewUrl} alt="" className="chat-attachment-thumb" />
                      : <div className="chat-attachment-icon"><FileText size={22} /></div>}
                    <div className="chat-attachment-info">
                      <span className="chat-attachment-name">{pendingFile.file.name}</span>
                      <span className="chat-attachment-meta">
                        {{ image: 'Photo', video: 'Video', audio: 'Audio', document: 'Document' }[pendingFile.kind]} · {formatBytes(pendingFile.file.size)}
                      </span>
                    </div>
                    <button type="button" className="chat-attachment-remove" onClick={clearPendingFile} aria-label="Remove attachment">
                      <X size={18} />
                    </button>
                  </div>
                )}
                <form className="chat-input-area" onSubmit={handleSendMessage}>
                  <input ref={fileInputRef} type="file" accept={MEDIA_ACCEPT} onChange={handlePickFile} style={{ display: 'none' }} />
                  <button type="button" className="chat-attach-btn" onClick={() => fileInputRef.current?.click()} disabled={isSending} aria-label="Attach photo, video or document" title="Attach photo, video, audio or document">
                    <Paperclip size={20} />
                  </button>
                  <input
                    type="text"
                    placeholder={pendingFile ? (pendingFile.kind === 'audio' ? 'Audio is sent without a caption' : 'Add a caption (optional)...') : 'Type a message...'}
                    disabled={pendingFile?.kind === 'audio'}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    autoFocus={typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches}
                  />
                  <button type="submit" className="chat-send-btn" disabled={(!messageInput.trim() && !pendingFile) || isSending}>
                    {isSending ? <RefreshCcw size={18} className="spinning" /> : <Send size={18} />}
                  </button>
                </form>
              </div>
            ) : (
              <div className="crm-empty-state">
                <MessageSquare size={64} opacity={0.1} />
                <h3>WhatsApp Inbox</h3>
                <p>Select a contact from the left to start chatting, or add a new contact.</p>
                <button className="admin-btn admin-btn-primary" onClick={() => setShowAddContact(true)}>
                  <UserPlus size={16} /> Add New Contact
                </button>
              </div>
            )
          )}

          {/* ── CONTACTS MANAGEMENT ── */}
          {activeSection === 'contacts' && (
            <div className="crm-section-content">
              <div className="crm-section-header">
                <div>
                  <h2>Contact Management</h2>
                  <p>{contacts.length} contacts · {offerCounts.yes} agreed to offers</p>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={() => setShowAddContact(true)}>
                  <Plus size={16} /> Add Contacts
                </button>
              </div>

              <div className="pnc-filters" role="tablist" aria-label="Filter contacts">
                {[['all', `All (${contacts.length})`], ['yes', `Offers OK (${offerCounts.yes})`], ['unknown', `Not asked (${offerCounts.unknown})`], ['stopped', `Said STOP (${offerCounts.stopped})`]].map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={contactFilter === id} className={contactFilter === id ? 'on' : ''} onClick={() => setContactFilter(id)}>{label}</button>
                ))}
              </div>

              <div className="contacts-grid">
                {shownContacts.length === 0 && <p style={{ color: '#888' }}>No contacts here yet.</p>}
                {shownContacts.map(c => (
                  <div key={c.phone_number} className="contact-card glass-card">
                    <div className="contact-card-avatar">{c.name?.charAt(0) || '?'}</div>
                    <div className="contact-card-info">
                      <div className="contact-card-name">{c.name || 'Unknown Customer'}</div>
                      <div className="contact-card-phone">+{c.phone_number}</div>
                      <div className="contact-card-stats">
                        <span>📦 {c.total_orders || 0} Orders</span>
                        <span>💰 ₹{Number(c.lifetime_value || 0).toLocaleString()}</span>
                      </div>
                      {(() => {
                        const st = offerStatus(c);
                        return (
                          <button type="button" className={`pnc-offer-pill ${st}`} onClick={() => toggleOffers(c)}
                            title={st === 'yes' ? 'Tap to stop sending offers' : st === 'stopped' ? 'Customer replied STOP' : 'Tap if this customer agreed to get offers'}>
                            {st === 'yes' ? '✓ Gets offers' : st === 'stopped' ? 'Said STOP' : '+ Mark: agreed to offers'}
                          </button>
                        );
                      })()}
                    </div>
                    <div className="contact-card-actions">
                      <button
                        className="admin-btn admin-btn-primary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => { setSelectedContact(c); setActiveSection('inbox'); }}
                      >
                        <MessageSquare size={14} /> Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MENU BOT ── */}
          {activeSection === 'autoreply' && (
            <div className="crm-section-content">
              <BotSettings />
            </div>
          )}

          {/* ── CAMPAIGNS ── */}
          {activeSection === 'campaigns' && (
            <div className="crm-section-content">
              <OfferBroadcast contacts={contacts} onAddContacts={() => setShowAddContact(true)} onContactsChanged={fetchContacts} />
            </div>
          )}
            {/* ── Settings View ── */}
            {activeSection === 'settings' && (
              <div className="crm-section-content" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', overflowY: 'auto', height: '100%', paddingBottom: '100px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>WhatsApp API Settings</h2>
                <p style={{ color: '#666', marginBottom: '2rem' }}>Configure your Meta WhatsApp Business API credentials here. These details power the CRM.</p>
                <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555', fontSize: '0.9rem' }}>Business Phone Number (Without +)</label>
                    <input 
                      type="text" 
                      value={waSettings.business_phone_number || ''} 
                      onChange={e => setWaSettings({...waSettings, business_phone_number: e.target.value})} 
                      required 
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555', fontSize: '0.9rem' }}>Phone Number ID</label>
                    <input 
                      type="text" 
                      value={waSettings.phone_number_id || ''} 
                      onChange={e => setWaSettings({...waSettings, phone_number_id: e.target.value})} 
                      required 
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555', fontSize: '0.9rem' }}>Access Token (Permanent or Temporary)</label>
                    <input 
                      type="password" 
                      value={waSettings.access_token || ''} 
                      onChange={e => setWaSettings({...waSettings, access_token: e.target.value})} 
                      required 
                      className="admin-input"
                    />
                  </div>
                  <button type="submit" className="admin-btn admin-btn-primary" disabled={isSavingSettings} style={{ alignSelf: 'flex-start', marginTop: '1rem', padding: '0.75rem 2rem' }}>
                    {isSavingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </form>

                <hr style={{ margin: '3rem 0', border: 'none', borderTop: '1px solid #eee' }} />
                
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>Lifetime Dynamic QR Code</h2>
                <p style={{ color: '#666', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  Scan this QR code to automatically start a WhatsApp chat. <br/>
                  If you update the phone number above in the future, the QR code will automatically redirect to the new number without needing to be reprinted.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ background: '#fff', padding: '10px', borderRadius: '12px', display: 'inline-block' }}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/whatsapp')}`} 
                      alt="WhatsApp Dynamic QR Code" 
                      style={{ display: 'block' }}
                    />
                  </div>
                  <a 
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(window.location.origin + '/whatsapp')}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="admin-btn admin-btn-secondary"
                  >
                    Download HD Print-Ready QR Code
                  </a>
                </div>
              </div>
            )}

        </div>
      </div>

      {/* ── Add Contacts Modal ── */}
      {showAddContact && (
        <AddContactsModal
          existingPhones={contacts.filter(c => !c.from_orders).map(c => c.phone_number)}
          onClose={() => setShowAddContact(false)}
          onSaved={fetchContacts}
          onOpenChat={(c) => { setShowAddContact(false); setSelectedContact(c); setActiveSection('inbox'); }}
        />
      )}

    </div>
    </div>
  );
};

export default CRMTab;
