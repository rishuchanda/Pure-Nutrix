import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, User, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: isSignUp ? { full_name: fullName } : {},
        }
      });
      if (error) throw error;
      setIsOtpSent(true);
      setResendTimer(30);
      setMessage('A 6-digit code has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });
      if (error) throw error;
      onClose(); // Close modal on successful login
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setMessage(null);
    setIsOtpSent(false);
    setOtp('');
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

            {!isOtpSent ? (
              <form onSubmit={handleSendOtp} className="auth-form">
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

                <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
                  {loading ? <Loader2 className="spinner" size={20} /> : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="auth-form">
                <p style={{ textAlign: 'center', marginBottom: '15px', color: 'var(--color-text-secondary)' }}>
                  Enter the 6-digit code sent to <strong>{email}</strong>
                </p>
                <div className="auth-input-group" style={{ background: '#f8f9fa', border: '2px solid #D4AF37', borderRadius: '8px', padding: '5px' }}>
                  <KeyRound className="auth-input-icon" size={20} />
                  <input
                    type="text"
                    placeholder="6-Digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    style={{ letterSpacing: '2px', textAlign: 'center', fontSize: '1.2rem' }}
                  />
                </div>

                <button type="submit" className="btn-primary auth-submit-btn" disabled={loading || otp.length < 6}>
                  {loading ? <Loader2 className="spinner" size={20} /> : 'Verify & Login'}
                </button>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button 
                    type="button" 
                    className="btn-outline auth-submit-btn" 
                    onClick={() => setIsOtpSent(false)}
                    disabled={loading}
                    style={{ flex: 1, margin: 0 }}
                  >
                    Change Email
                  </button>
                  <button 
                    type="button" 
                    className="btn-outline auth-submit-btn" 
                    onClick={handleSendOtp}
                    disabled={loading || resendTimer > 0}
                    style={{ flex: 1, margin: 0, opacity: resendTimer > 0 ? 0.6 : 1 }}
                  >
                    {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}

            {!isOtpSent && (
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
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
