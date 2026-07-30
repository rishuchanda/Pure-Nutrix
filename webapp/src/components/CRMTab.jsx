import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  Search, Send, MessageSquare, TrendingUp, Users, Plus,
  X, Bot, UserPlus, Edit2, Check, ChevronRight,
  Inbox, Megaphone, Settings, Trash2, Phone, RefreshCcw
} from 'lucide-react';
import './CRMTab.css';

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
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);

  // Auto-Reply State
  const [autoReplies, setAutoReplies] = useState(DEFAULT_AUTO_REPLIES);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');
  const [newReplyText, setNewReplyText] = useState('');
  const [editingRule, setEditingRule] = useState(null);

  // Campaign State
  const [bulkMessage, setBulkMessage] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignChannel, setCampaignChannel] = useState('whatsapp'); // whatsapp | email | both
  const [isSendingBlast, setIsSendingBlast] = useState(false);
  const [blastResult, setBlastResult] = useState(null);

  // Settings State
  const [waSettings, setWaSettings] = useState({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Template States
  const [customInboxTemplate, setCustomInboxTemplate] = useState('hello_world');
  const [campaignTemplate, setCampaignTemplate] = useState('');

  const messagesEndRef = useRef(null);

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
            m.id === payload.new.id || m.meta_message_id === payload.new.meta_message_id
              ? { ...m, status: payload.new.status }
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
            const phone = o.customer_mobile ? '91' + o.customer_mobile.replace(/[^0-9]/g, '') : null;
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
  const handleSendMessage = async (e) => {
    e.preventDefault();
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
      await supabase.from('whatsapp_contacts').upsert({
        phone_number: selectedContact.phone_number,
        name: selectedContact.name || null,
        last_message_at: new Date().toISOString()
      }, { onConflict: 'phone_number' });

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
      await supabase.from('whatsapp_contacts').upsert({
        phone_number: selectedContact.phone_number,
        name: selectedContact.name || null,
        last_message_at: new Date().toISOString()
      }, { onConflict: 'phone_number' });

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone_number: selectedContact.phone_number,
          type: 'template',
          template_name: templateName
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


  // ─── Add New Contact ──────────────────────────────────────────────────────
  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContactPhone.trim()) return;
    setIsAddingContact(true);
    try {
      const phone = newContactPhone.replace(/[^0-9]/g, '');
      const { error } = await supabase.from('whatsapp_contacts').upsert({
        phone_number: phone,
        name: newContactName.trim() || null,
        last_message_at: new Date().toISOString()
      }, { onConflict: 'phone_number' });
      if (error) throw error;
      const newContact = { phone_number: phone, name: newContactName.trim() || null, lifetime_value: 0, total_orders: 0, last_message_at: new Date().toISOString() };
      setContacts(prev => [newContact, ...prev.filter(c => c.phone_number !== phone)]);
      setShowAddContact(false);
      setNewContactName('');
      setNewContactPhone('');
      setSelectedContact(newContact);
      setActiveSection('inbox');
    } catch (err) {
      alert('Failed to add contact: ' + err.message);
    } finally {
      setIsAddingContact(false);
    }
  };

  // ─── Campaign Blast ───────────────────────────────────────────────────────
  const handleSendBlast = async () => {
    if (!bulkMessage.trim()) return;
    if ((campaignChannel === 'email' || campaignChannel === 'both') && !campaignSubject.trim()) {
      alert("Please enter an email subject.");
      return;
    }
    if (!window.confirm(`Send this message to ${filteredContacts.length} contacts via ${campaignChannel.toUpperCase()}?`)) return;
    setIsSendingBlast(true);
    setBlastResult(null);
    let sent = 0, failed = 0;
    
    for (const contact of filteredContacts) {
      let contactSuccess = false;
      try {
        const messageText = bulkMessage.replace('{{name}}', contact.name || 'Customer');
        let waSuccess = true;
        let emailSuccess = true;

        if (campaignChannel === 'whatsapp' || campaignChannel === 'both') {
          // If a campaignTemplate is provided, send as template, else fallback to text
          const payload = campaignTemplate.trim() ? {
            phone_number: contact.phone_number,
            type: 'template',
            template_name: campaignTemplate.trim(),
            template_language: 'en',
            template_components: [] // You can add variable mapping logic here later if needed
          } : {
            phone_number: contact.phone_number,
            message: messageText,
            type: 'text'
          };
          const { data } = await supabase.functions.invoke('send-whatsapp', { body: payload });
          waSuccess = !!data?.success;
        }
        
        if (campaignChannel === 'email' || campaignChannel === 'both') {
          if (contact.email) {
            const htmlMessage = messageText.replace(/\n/g, '<br/>');
            const { data } = await supabase.functions.invoke('send-email', {
              body: { 
                to: contact.email, 
                subject: campaignSubject.replace('{{name}}', contact.name || 'Customer'),
                html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">${htmlMessage}</div>`
              }
            });
            emailSuccess = !!data?.success;
          } else {
             // If they don't have an email but channel is 'email' only, it's a fail.
             if (campaignChannel === 'email') emailSuccess = false;
          }
        }

        if ((campaignChannel === 'whatsapp' && waSuccess) || 
            (campaignChannel === 'email' && emailSuccess) || 
            (campaignChannel === 'both' && (waSuccess || emailSuccess))) {
           contactSuccess = true;
        }

        if (contactSuccess) { sent++; } else { failed++; }
        await new Promise(r => setTimeout(r, 300)); // Rate limit
      } catch { failed++; }
    }
    setBlastResult({ sent, failed });
    setIsSendingBlast(false);
    setBulkMessage('');
    setCampaignSubject('');
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
    { id: 'autoreply', label: 'Auto-Reply', icon: Bot },
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
    <div className="crm-fullscreen-container">
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
          <div><div className="stat-value">{autoReplyEnabled ? 'ON' : 'OFF'}</div><div className="stat-label">Auto-Reply</div></div>
        </div>
        <div className="crm-top-actions">
          <button className="admin-btn admin-btn-primary crm-add-btn" onClick={() => setShowAddContact(true)}>
            <UserPlus size={16} /> New Contact
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
                            <span className="msg-text">{msg.message_body}</span>
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
                <div style={{ padding: '0.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Custom Template (24h bypass):</span>
                  <input type="text" value={customInboxTemplate} onChange={e => setCustomInboxTemplate(e.target.value)} placeholder="hello_world" style={{ padding: '4px 8px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', width: '120px' }} />
                  <button onClick={handleSendTemplate} className="admin-btn" style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#fff', border: '1px solid #cbd5e1' }} disabled={isSending}>Send Template</button>
                </div>
                <form className="chat-input-area" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="chat-send-btn" disabled={!messageInput.trim() || isSending}>
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
                  <p>{contacts.length} contacts total</p>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={() => setShowAddContact(true)}>
                  <Plus size={16} /> Add Contact
                </button>
              </div>

              <div className="contacts-grid">
                {filteredContacts.map(c => (
                  <div key={c.phone_number} className="contact-card glass-card">
                    <div className="contact-card-avatar">{c.name?.charAt(0) || '?'}</div>
                    <div className="contact-card-info">
                      <div className="contact-card-name">{c.name || 'Unknown Customer'}</div>
                      <div className="contact-card-phone">+{c.phone_number}</div>
                      <div className="contact-card-stats">
                        <span>📦 {c.total_orders || 0} Orders</span>
                        <span>💰 ₹{Number(c.lifetime_value || 0).toLocaleString()}</span>
                      </div>
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

          {/* ── AUTO-REPLY ── */}
          {activeSection === 'autoreply' && (
            <div className="crm-section-content">
              <div className="crm-section-header">
                <div>
                  <h2>Auto-Reply Chatbot</h2>
                  <p>Set keyword-based automatic responses for incoming messages.</p>
                </div>
                <div className="toggle-wrapper">
                  <span>{autoReplyEnabled ? 'Enabled' : 'Disabled'}</span>
                  <div
                    className={`toggle ${autoReplyEnabled ? 'on' : 'off'}`}
                    onClick={() => setAutoReplyEnabled(p => !p)}
                  >
                    <div className="toggle-knob" />
                  </div>
                </div>
              </div>

              {/* Add new rule */}
              <div className="autoreply-add-form glass-card">
                <h4><Plus size={16} /> Add New Rule</h4>
                <div className="autoreply-form-row">
                  <div className="input-group-inline">
                    <label>Keyword (trigger word)</label>
                    <input
                      className="admin-input"
                      type="text"
                      placeholder="e.g. return, offer, help"
                      value={newKeyword}
                      onChange={e => setNewKeyword(e.target.value)}
                    />
                  </div>
                  <div className="input-group-inline" style={{ flex: 2 }}>
                    <label>Auto-Reply Message</label>
                    <input
                      className="admin-input"
                      type="text"
                      placeholder="The reply to send when this keyword is detected..."
                      value={newReplyText}
                      onChange={e => setNewReplyText(e.target.value)}
                    />
                  </div>
                  <button
                    className="admin-btn admin-btn-primary"
                    style={{ alignSelf: 'flex-end', padding: '0.65rem 1.2rem' }}
                    onClick={handleAddAutoReply}
                    disabled={!newKeyword.trim() || !newReplyText.trim()}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>

              {/* Existing rules */}
              <div className="autoreply-rules-list">
                {autoReplies.map(rule => (
                  <div key={rule.id} className="autoreply-rule-card glass-card">
                    {editingRule?.id === rule.id ? (
                      <div className="autoreply-form-row">
                        <input
                          className="admin-input"
                          value={editingRule.keyword}
                          onChange={e => setEditingRule(p => ({ ...p, keyword: e.target.value }))}
                        />
                        <input
                          className="admin-input"
                          style={{ flex: 2 }}
                          value={editingRule.reply}
                          onChange={e => setEditingRule(p => ({ ...p, reply: e.target.value }))}
                        />
                        <button className="admin-btn admin-btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => handleSaveEdit(rule.id)}><Check size={16} /></button>
                        <button className="admin-btn admin-btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setEditingRule(null)}><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="rule-display">
                        <div className="rule-keyword">"{rule.keyword}"</div>
                        <ChevronRight size={16} opacity={0.5} />
                        <div className="rule-reply">{rule.reply}</div>
                        <div className="rule-actions">
                          <button className="icon-btn" onClick={() => setEditingRule(rule)}><Edit2 size={15} /></button>
                          <button className="icon-btn danger" onClick={() => handleDeleteAutoReply(rule.id)}><Trash2 size={15} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CAMPAIGNS ── */}
          {activeSection === 'campaigns' && (
            <div className="crm-section-content">
              <div className="crm-section-header">
                <div>
                  <h2>Broadcast Campaign</h2>
                  <p>Send a message to all {filteredContacts.length} contacts at once.</p>
                </div>
              </div>

              <div className="campaign-layout">
                <div className="campaign-form glass-card">
                  <h3>Compose Message</h3>
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input type="radio" name="campaignChannel" checked={campaignChannel === 'whatsapp'} onChange={() => setCampaignChannel('whatsapp')} />
                      WhatsApp Only
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input type="radio" name="campaignChannel" checked={campaignChannel === 'email'} onChange={() => setCampaignChannel('email')} />
                      Email Only
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input type="radio" name="campaignChannel" checked={campaignChannel === 'both'} onChange={() => setCampaignChannel('both')} />
                      Both (WhatsApp + Email)
                    </label>
                  </div>
                  
                  <p className="campaign-tip">Use <code>{'{{name}}'}</code> to personalize with customer name.</p>

                  {(campaignChannel === 'email' || campaignChannel === 'both') && (
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="Email Subject (e.g. Special Offer for {{name}}!)"
                      value={campaignSubject}
                      onChange={(e) => setCampaignSubject(e.target.value)}
                      style={{ marginBottom: '10px' }}
                    />
                  )}

                  {(campaignChannel === 'whatsapp' || campaignChannel === 'both') && (
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '5px' }}>Meta Approved Template Name (Required for WhatsApp Offers)</label>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="e.g. monsoon_offer, new_deal"
                        value={campaignTemplate}
                        onChange={(e) => setCampaignTemplate(e.target.value)}
                        style={{ marginBottom: '5px' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Note: If you leave this blank, it sends a standard text message (which fails if the customer hasn't messaged you in 24 hrs).</span>
                    </div>
                  )}

                  <textarea
                    className="admin-input campaign-textarea"
                    rows="8"
                    placeholder={`Hi {{name}},\n\n🌿 Exciting news from Pure-Nutrix!\n\nWe have a special monsoon offer just for you...\n\n(Note: WhatsApp will ignore this text if a Template Name is provided above. Emails will use this text.)`}
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                  />

                  {blastResult && (
                    <div className="blast-result">
                      ✅ Sent: {blastResult.sent} &nbsp; ❌ Failed: {blastResult.failed}
                    </div>
                  )}

                  <button
                    className="admin-btn admin-btn-primary campaign-send-btn"
                    onClick={handleSendBlast}
                    disabled={!bulkMessage.trim() || isSendingBlast || filteredContacts.length === 0}
                  >
                    {isSendingBlast
                      ? <><RefreshCcw size={16} className="spinning" /> Sending...</>
                      : <><Send size={16} /> Send to {filteredContacts.length} Contacts</>
                    }
                  </button>
                </div>

                <div className="campaign-audience glass-card">
                  <h3>Audience ({filteredContacts.length})</h3>
                  <div className="campaign-search">
                    <Search size={14} />
                    <input type="text" placeholder="Filter audience..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="audience-list">
                    {filteredContacts.map(c => (
                      <div key={c.phone_number} className="audience-item">
                        <div className="contact-avatar small">{c.name?.charAt(0) || '?'}</div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{c.name || 'Unknown'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>+{c.phone_number}</div>
                        </div>
                        <span className="audience-ltv">₹{Number(c.lifetime_value || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

      {/* ── Add Contact Modal ── */}
      {showAddContact && (
        <div className="crm-modal-overlay" onClick={() => setShowAddContact(false)}>
          <div className="crm-modal glass-card" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h3><UserPlus size={20} /> Add New Contact</h3>
              <button className="icon-btn" onClick={() => setShowAddContact(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddContact} className="crm-modal-body">
              <div className="input-group">
                <label>Full Name</label>
                <input
                  className="admin-input"
                  type="text"
                  placeholder="Raman Sharma"
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>WhatsApp Number (with country code) *</label>
                <input
                  className="admin-input"
                  type="text"
                  placeholder="919876543210"
                  value={newContactPhone}
                  onChange={e => setNewContactPhone(e.target.value)}
                  required
                />
                <small style={{ color: '#9ca3af', marginTop: '0.25rem' }}>Include country code, no + or spaces (e.g. 919876543210)</small>
              </div>
              <div className="crm-modal-actions">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowAddContact(false)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={isAddingContact}>
                  {isAddingContact ? 'Adding...' : <><Check size={16} /> Add & Open Chat</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
    </div>
  );
};

export default CRMTab;
