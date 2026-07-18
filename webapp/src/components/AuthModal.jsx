import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (error) throw error;
        setMessage('Registration successful! Please check your email to verify your account.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose(); // Close modal on successful login
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setMessage(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="auth-modal-overlay"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="auth-modal-container glass-card"
          >
            <button className="auth-close-btn" onClick={onClose}>
              <X size={24} />
            </button>
            
            <div className="auth-modal-header">
              <h2 className="text-gradient">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
              <p>{isSignUp ? 'Join Pure Nutrix today' : 'Sign in to your account'}</p>
            </div>

            {error && <div className="auth-alert auth-error">{error}</div>}
            {message && <div className="auth-alert auth-success">{message}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              {isSignUp && (
                <div className="auth-input-group">
                  <User className="auth-input-icon" size={20} />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              
              <div className="auth-input-group">
                <Mail className="auth-input-icon" size={20} />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="auth-input-group">
                <Lock className="auth-input-icon" size={20} />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
                {loading ? <Loader2 className="spinner" size={20} /> : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
            </form>

            <div className="auth-modal-footer">
              <span style={{ marginRight: '8px' }}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </span>
              <button 
                type="button" 
                className="auth-toggle-btn text-gold" 
                onClick={toggleMode}
                style={{ cursor: 'pointer', pointerEvents: 'auto', padding: '0.5rem', fontSize: '1rem' }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
