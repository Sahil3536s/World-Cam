import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, Bell, User, Globe, Flame, LayoutGrid, Settings, Sun, Maximize, X } from 'lucide-react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import AuthModal from './AuthModal'; 
import './App.css';

const API_KEY = 'AIzaSyBxQy5vJRdDLTEGU33BLHKzU9ppiC7rXd8';

export default function App() {
  const [cameras, setCameras] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [user, setUser] = useState(null); 
  const [showResults, setShowResults] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [text, setText] = useState("");
  const fullText = "Watch the World Live";

  // 🖱️ Refs to detect clicks outside of menus
  const accountRef = useRef(null);
  const settingsRef = useRef(null);

  // 🛡️ Auth Observer & Auto-Open Login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAuthOpen(false);
        const userRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setLikedVideos(docSnap.data().likedVideos || []);
        }
      } else {
        setLikedVideos([]);
        setIsAuthOpen(true);
      }
    });
    return () => unsub();
  }, []);

  // 🔒 Effect to close menus when clicking anywhere else
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✍️ Typewriter Effect
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = async (query) => {
    if (!query) return;
    setShowResults(true);
    setShowLikes(false);
    try {
      const res = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video&q=${query}&maxResults=12&key=${API_KEY}`);
      setCameras(res.data.items.map(i => ({ id: i.id.videoId, title: i.snippet.title })));
    } catch (e) { console.error("Search Error"); }
  };

  const toggleLike = async (video) => {
    if (!user) { setIsAuthOpen(true); return; }
    const userRef = doc(db, "users", user.uid);
    const isAlreadyLiked = likedVideos.some(v => v.id === video.id);
    try {
      if (isAlreadyLiked) {
        await updateDoc(userRef, { likedVideos: arrayRemove(video) });
        setLikedVideos(prev => prev.filter(v => v.id !== video.id));
      } else {
        await updateDoc(userRef, { likedVideos: arrayUnion(video) });
        setLikedVideos(prev => [...prev, video]);
      }
    } catch (error) { console.error("Firebase Error", error); }
  };

  return (
    <div className="worldcam-full-container" style={{ filter: `brightness(${brightness}%)` }}>
      <nav className="navbar-main">
        {/* 📸 CUSTOM LOGO SECTION */}
        <div className="custom-logo" onClick={() => {setShowResults(false); setShowLikes(false);}}>
          <div className="logo-shutter">
            <Globe className="logo-inner-globe" size={20} />
          </div>
          <span className="brand-text">World<span>Cam</span></span>
        </div>
        
        <div className="nav-center">
          <div className="yt-search-pill">
            <input placeholder="Search" onKeyDown={(e) => e.key === 'Enter' && handleSearch(e.target.value)} />
            <button onClick={() => handleSearch()} className="search-icon-btn"><Search size={18} /></button>
          </div>
        </div>

        <div className="nav-right">
          {/* ⚙️ SETTINGS WITH OUTSIDE-CLICK PROTECTION */}
          <div className="settings-container" ref={settingsRef}>
            <Settings className="nav-icon" onClick={() => setIsSettingsOpen(!isSettingsOpen)} />
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="settings-popup glass">
                  <div className="settings-head">
                    <h3>Brightness</h3>
                    <X size={18} onClick={() => setIsSettingsOpen(false)} style={{cursor: 'pointer'}}/>
                  </div>
                  <div className="setting-control">
                    <Sun size={18} />
                    <input type="range" min="30" max="150" value={brightness} onChange={(e) => setBrightness(e.target.value)} />
                  </div>
                  <p className="soon-tag">🚀 Region: asia-south1</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Heart className={`nav-icon ${showLikes ? 'text-red-500 fill-red-500' : ''}`} onClick={() => setShowLikes(true)} />
          <Bell className="nav-icon" />
          
          {user ? (
            <div className="profile-container" ref={accountRef}>
              <div className="profile-trigger" onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}>
                <div className="profile-avatar-box">
                  {user.email[0].toUpperCase()}
                </div>
              </div>

              <AnimatePresence>
                {isAccountMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="account-dropdown"
                  >
                    <div className="dropdown-header">
                      <div className="header-avatar">{user.email[0].toUpperCase()}</div>
                      <div>
                        <p className="user-name">Sahil Sehrawat</p>
                        <p className="user-email">{user.email}</p>
                      </div>
                    </div>
                    <div className="dropdown-divider" />
                    <div className="dropdown-item">
                      <User size={18} /> <span>Account Details</span>
                      {/* 🔑 SHOWS EMAIL & PASSWORD MASK */}
                      <div className="item-details-hover">
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Password:</strong> ••••••••••</p>
                        <p><strong>Joined:</strong> {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="dropdown-divider" />
                    <div className="dropdown-logout" onClick={() => signOut(auth)}>Sign out</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button className="login-pill-nav" onClick={() => setIsAuthOpen(true)}>Login</button>
          )}
        </div>
      </nav>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} /> 

      <AnimatePresence mode="wait">
        {showLikes ? (
          <motion.main key="likes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="results-container">
            <h2 className="section-title">❤️ Liked Streams</h2>
            <div className="yt-grid">
              {likedVideos.map(cam => <VideoTile key={cam.id} cam={cam} isLiked={true} onLike={() => toggleLike(cam)} />)}
            </div>
          </motion.main>
        ) : !showResults ? (
          <motion.header key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hero-full-view">
            <motion.div 
                className="logo-shutter" 
                style={{width: '100px', height: '100px', margin: '0 auto 20px'}}
                animate={{ y: [0, -20, 0] }} 
                transition={{ duration: 4, repeat: Infinity }}
            >
                <Globe size={50} color="white"/>
            </motion.div>
            <h1 className="hero-title-colorful">{text}<span className="blink">|</span></h1>
            <button className="btn-explore-glow" onClick={() => handleSearch('live webcam')}>Start Exploring</button>
          </motion.header>
        ) : (
          <motion.main key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="results-container">
            <div className="yt-grid">
              {cameras.map(cam => <VideoTile key={cam.id} cam={cam} isLiked={likedVideos.some(v => v.id === cam.id)} onLike={() => toggleLike(cam)} />)}
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

function VideoTile({ cam, onLike, isLiked }) {
  const [full, setFull] = useState(false);
  return (
    <motion.div whileHover={{ y: -10 }} className={`video-tile ${full ? 'fs-mode' : ''}`}>
      <div className="thumbnail-box">
        <iframe src={`https://www.youtube.com/embed/${cam.id}?autoplay=1&mute=1`} title={cam.title} allowFullScreen />
        <div className="tile-overlay">
          <Heart className={`icon ${isLiked ? 'liked' : ''}`} onClick={(e) => { e.stopPropagation(); onLike(cam); }} />
          <Maximize className="icon" onClick={() => setFull(!full)} />
        </div>
      </div>
      <div className="tile-meta"><h3>{cam.title}</h3></div>
    </motion.div>
  );
}