import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider, githubProvider } from './firebase'; // Import your initialized services
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEmail('');
    setPassword('');
    setError('');
    setIsLoading(false);
  }, [isOpen, isLogin]);

  const handleSocialLogin = async (provider) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await signInWithPopup(auth, provider);
      const userRef = doc(db, "users", res.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, { email: res.user.email || '', likedVideos: [] });
      }
      onClose();
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message.replace('Firebase:', '').trim());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    
    setIsLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", res.user.uid), {
          email: email,
          likedVideos: []
        });
      }
      onClose();
    } catch (err) {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            setError("Invalid email or password.");
        } else if (err.code === 'auth/email-already-in-use') {
            setError("Email is already registered. Try logging in.");
        } else {
            setError(err.message.replace('Firebase:', '').trim());
        }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="auth-overlay">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300, duration: 0.2 }}
            className="auth-modal-glass"
          >
            {/* Close Button */}
            <button className="auth-close-btn" onClick={onClose}>
              <X size={20} />
            </button>

            {/* HEADER */}
            <div className="auth-header">
              <div className="auth-icon-badge flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(220,50,50,0.35)]">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-white stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div className="auth-title">
                {isLogin ? 'Welcome back' : 'Create an Account'}
              </div>
              <div className="auth-subtitle">
                {isLogin ? 'Sign in to your WorldCam account' : 'Sign up for a WorldCam account'}
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, height: 0 }} 
                  animate={{ opacity: 1, y: 0, height: 'auto' }} 
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  style={{ overflow: 'hidden' }}
                  className="auth-error-msg"
                >
                  <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: '13px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="auth-form-card">
              
              {/* EMAIL */}
              <div className="auth-form-group">
                <div className="auth-label-row">
                  <label>Email Address</label>
                </div>
                <div className="auth-input-wrapper">
                  <Mail className="auth-input-icon" />
                  <input 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} 
                    required
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="auth-form-group">
                <div className="auth-label-row">
                  <label>Password</label>
                  {isLogin && <a href="#" className="auth-forgot-link">Forgot password?</a>}
                </div>
                <div className="auth-input-wrapper">
                  <Lock className="auth-input-icon" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter your password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} 
                    required
                  />
                  <button 
                    type="button" 
                    className="auth-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* SIGN IN BUTTON */}
              <button 
                type="submit"
                disabled={isLoading}
                className="auth-submit-btn"
              >
                {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
              </button>
            </form>

            {/* DIVIDER */}
            <div className="auth-divider">
              <span>or continue with</span>
            </div>

            {/* SOCIAL BUTTONS */}
            <div className="auth-social-grid">
              <button type="button" onClick={() => handleSocialLogin(googleProvider)} disabled={isLoading} className="auth-social-btn">
                <svg viewBox="0 0 24 24" className="w-[16px] h-[16px]">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button type="button" onClick={() => handleSocialLogin(githubProvider)} disabled={isLoading} className="auth-social-btn">
                <svg viewBox="0 0 24 24" className="w-[16px] h-[16px]">
                  <path fill="#FFFFFF" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                GitHub
              </button>
            </div>

            {/* FOOTER */}
            <div className="auth-footer">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="auth-toggle-link">
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}