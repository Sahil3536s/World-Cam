import React, { useState } from 'react';
import { auth, db } from './firebase'; // Import your initialized services
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { X } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        // Login existing user
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Create new user and initialize their database entry
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", res.user.uid), {
          email: email,
          likedVideos: []
        });
      }
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <button className="close-btn" onClick={onClose}><X /></button>
        <h2>{isLogin ? 'Login to WorldCam' : 'Create Account'}</h2>
        <form onSubmit={handleSubmit}>
          <input 
            type="email" 
            placeholder="Email Address" 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="auth-submit-btn">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <p onClick={() => setIsLogin(!isLogin)} className="toggle-auth">
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
}