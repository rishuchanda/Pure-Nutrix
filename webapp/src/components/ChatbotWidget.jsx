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
          {/* Cute Robot Sitting on Top */}
          <div className="cute-robot-overlay">
            <svg viewBox="0 0 100 100" className="robot-svg">
              <g className="robot-body-group">
                {/* Antenna */}
                <line x1="50" y1="25" x2="50" y2="10" stroke="#7367F0" strokeWidth="4" />
                <circle cx="50" cy="8" r="6" fill="#FACC15" className="antenna-bulb" />
                {/* Head */}
                <rect x="25" y="25" width="50" height="40" rx="10" fill="#fff" stroke="#7367F0" strokeWidth="4" />
                {/* Ears */}
                <rect x="15" y="35" width="10" height="20" rx="4" fill="#7367F0" />
                <rect x="75" y="35" width="10" height="20" rx="4" fill="#7367F0" />
                {/* Eyes */}
                <circle cx="38" cy="45" r="5" fill="#7367F0" className="robot-eye left-eye" />
                <circle cx="62" cy="45" r="5" fill="#7367F0" className="robot-eye right-eye" />
                {/* Smile */}
                <path d="M 40 55 Q 50 62 60 55" stroke="#7367F0" strokeWidth="3" fill="none" strokeLinecap="round" />
                {/* Arms waving */}
                <path d="M 25 45 Q 10 40 5 25" stroke="#7367F0" strokeWidth="5" fill="none" strokeLinecap="round" className="robot-arm-left" />
                <path d="M 75 45 Q 90 40 95 25" stroke="#7367F0" strokeWidth="5" fill="none" strokeLinecap="round" className="robot-arm-right" />
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
          <svg viewBox="0 0 100 100" className="fab-robot-svg">
            <g className="fab-robot-body">
              <line x1="50" y1="20" x2="50" y2="5" stroke="#fff" strokeWidth="4" />
              <circle cx="50" cy="5" r="5" fill="#FACC15" className="antenna-bulb" />
              <rect x="25" y="20" width="50" height="40" rx="10" fill="#fff" />
              <rect x="15" y="30" width="10" height="20" rx="4" fill="#fff" />
              <rect x="75" y="30" width="10" height="20" rx="4" fill="#fff" />
              <circle cx="38" cy="40" r="5" fill="#28c76f" className="robot-eye" />
              <circle cx="62" cy="40" r="5" fill="#28c76f" className="robot-eye" />
              <path d="M 40 50 Q 50 55 60 50" stroke="#28c76f" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
          </svg>
        </button>
      )}
    </div>
  );
};

export default ChatbotWidget;
