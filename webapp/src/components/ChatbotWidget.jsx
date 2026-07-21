import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { getChatbotResponse } from '../utils/chatbotLogic';
import { supabase } from '../supabaseClient';
import './ChatbotWidget.css';

const ChatbotWidget = ({ phoneNumber, defaultMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! 👋 Welcome to Pure-Nutrix. How can I help you today? You can ask me about our products, pricing, or orders.",
      options: ["Product Info", "Track Order", "Chat with Human"],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [dbProducts, setDbProducts] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Fetch products from database to make bot aware of real inventory
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('name, price, category, description, short_description');
      if (data) setDbProducts(data);
    };
    fetchProducts();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleOpenWhatsApp = () => {
    const targetPhone = phoneNumber || '919057607030';
    const encodedMessage = encodeURIComponent(defaultMessage || "Hi, I need help with my Pure-Nutrix order.");
    window.open(`https://wa.me/${targetPhone}?text=${encodedMessage}`, '_blank');
  };

  const handleSendMessage = (text) => {
    const msgText = text || inputValue.trim();
    if (!msgText) return;

    // Add user message
    const newMessages = [...messages, {
      id: Date.now(),
      sender: 'user',
      text: msgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }];
    
    setMessages(newMessages);
    setInputValue('');

    // Simulate bot thinking delay
    setTimeout(() => {
      const response = getChatbotResponse(msgText, dbProducts);
      
      if (response.action === 'open_whatsapp') {
        // Automatically append bot response and open whatsapp
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'bot',
          text: response.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setTimeout(handleOpenWhatsApp, 1000);
        return;
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: response.text,
        options: response.options,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 600);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chatbot-widget-container">
      {isOpen && (
        <div className="chatbot-window">
          {/* Cute Full Body Robot Sitting on Top */}
          <div className="cute-robot-overlay">
            <svg viewBox="0 0 200 200" className="robot-svg">
              <g className="robot-hover-group">
                {/* Antenna */}
                <path d="M100 40 L100 20" stroke="#7367F0" strokeWidth="4" />
                <circle cx="100" cy="15" r="6" fill="#FACC15" className="antenna-bulb" />

                {/* Head */}
                <rect x="65" y="40" width="70" height="50" rx="12" fill="#fff" stroke="#7367F0" strokeWidth="4" />
                
                {/* Ears */}
                <path d="M 65 60 L 55 60 L 55 70 L 65 70 Z" fill="#7367F0" />
                <path d="M 135 60 L 145 60 L 145 70 L 135 70 Z" fill="#7367F0" />

                {/* Eyes */}
                <circle cx="85" cy="65" r="6" fill="#7367F0" className="robot-eye" />
                <circle cx="115" cy="65" r="6" fill="#7367F0" className="robot-eye" />

                {/* Cheeks */}
                <circle cx="75" cy="75" r="4" fill="#ff9999" opacity="0.8" />
                <circle cx="125" cy="75" r="4" fill="#ff9999" opacity="0.8" />

                {/* Neck */}
                <rect x="92" y="90" width="16" height="10" fill="#7367F0" />

                {/* Body */}
                <rect x="60" y="100" width="80" height="60" rx="15" fill="#fff" stroke="#7367F0" strokeWidth="4" />
                
                {/* Screen on body */}
                <rect x="75" y="110" width="50" height="30" rx="5" fill="#f8f9fa" stroke="#7367F0" strokeWidth="2" />
                <path d="M 85 125 L 95 115 L 105 130 L 115 120" stroke="#28c76f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" className="heartbeat" />

                {/* Arms */}
                <g className="robot-arm-left" style={{ transformOrigin: '60px 110px' }}>
                  <path d="M 60 110 Q 30 100 40 140" stroke="#7367F0" strokeWidth="12" fill="none" strokeLinecap="round" />
                </g>
                <g className="robot-arm-right" style={{ transformOrigin: '140px 110px' }}>
                  <path d="M 140 110 Q 170 100 160 140" stroke="#7367F0" strokeWidth="12" fill="none" strokeLinecap="round" />
                </g>

                {/* Legs dangling below the body */}
                <g className="robot-leg-left" style={{ transformOrigin: '80px 160px' }}>
                  <path d="M 80 160 L 80 190" stroke="#7367F0" strokeWidth="10" strokeLinecap="round" />
                  <rect x="70" y="190" width="20" height="12" rx="6" fill="#7367F0" />
                </g>
                <g className="robot-leg-right" style={{ transformOrigin: '120px 160px' }}>
                  <path d="M 120 160 L 120 190" stroke="#7367F0" strokeWidth="10" strokeLinecap="round" />
                  <rect x="110" y="190" width="20" height="12" rx="6" fill="#7367F0" />
                </g>
              </g>
            </svg>
          </div>

          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <span style={{ fontSize: '1.2rem' }}>🤖</span>
              </div>
              <div>
                <h3 className="chatbot-title">NutriBot</h3>
                <p className="chatbot-status">Online & Ready to Help!</p>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-msg ${msg.sender}`}>
                <div className="chat-bubble">{msg.text}</div>
                <div className="chat-time">{msg.time}</div>
                {msg.options && (
                  <div className="chat-options">
                    {msg.options.map((opt, idx) => (
                      <button 
                        key={idx} 
                        className={`chat-chip ${opt === 'Chat with Human' ? 'primary' : ''}`}
                        onClick={() => {
                          if (opt === 'Chat with Human') {
                            handleOpenWhatsApp();
                          } else {
                            handleSendMessage(opt);
                          }
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <input
              type="text"
              placeholder="Type your question..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button 
              className="chatbot-send" 
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim()}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {!isOpen && (
        <button 
          className="chatbot-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Open Help Assistant"
        >
          <svg viewBox="0 0 200 200" className="fab-robot-svg">
            <g className="fab-robot-body">
              <path d="M100 50 L100 30" stroke="#fff" strokeWidth="6" />
              <circle cx="100" cy="25" r="8" fill="#FACC15" className="antenna-bulb" />
              <rect x="60" y="50" width="80" height="60" rx="15" fill="#fff" />
              <rect x="50" y="70" width="10" height="20" rx="5" fill="#fff" />
              <rect x="140" y="70" width="10" height="20" rx="5" fill="#fff" />
              <circle cx="80" cy="80" r="8" fill="#28c76f" className="robot-eye" />
              <circle cx="120" cy="80" r="8" fill="#28c76f" className="robot-eye" />
              <rect x="70" y="120" width="60" height="50" rx="15" fill="#fff" />
              <g className="fab-arm-left" style={{ transformOrigin: '70px 130px' }}>
                <path d="M 70 130 Q 40 120 50 160" stroke="#fff" strokeWidth="12" fill="none" strokeLinecap="round" />
              </g>
              <g className="fab-arm-right" style={{ transformOrigin: '130px 130px' }}>
                <path d="M 130 130 Q 160 120 150 160" stroke="#fff" strokeWidth="12" fill="none" strokeLinecap="round" />
              </g>
            </g>
          </svg>
        </button>
      )}
    </div>
  );
};

export default ChatbotWidget;
