import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { getChatbotResponse } from '../utils/chatbotLogic';
import CuteRobot from './CuteRobot';
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
        <>
          {/* Cute Robot Overlay (Sitting on top of chat window) */}
          <div className="cute-robot-overlay">
            <CuteRobot />
          </div>
          <div 
            className="chatbot-window"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
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
        </>
      )}

      {!isOpen && (
        <div 
          className="chatbot-closed-state"
          onClick={() => setIsOpen(true)}
          role="button"
          tabIndex={0}
        >
          <span className="chatbot-tooltip">Need help?</span>
          <div className="chatbot-fab-robot">
            <CuteRobot />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
