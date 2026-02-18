import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Map as MapIcon, Heart, Bell, User, Globe, Flame, LayoutGrid, Settings, Sun, Maximize, X } from 'lucide-react';
import './App.css';

const API_KEY = 'AIzaSyBxQy5vJRdDLTEGU33BLHKzU9ppiC7rXd8';

export default function App() {
  const [cameras, setCameras] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [text, setText] = useState("");
  const fullText = "Watch the World Live";

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

  const toggleLike = (video) => {
    setLikedVideos(prev => prev.find(v => v.id === video.id) ? prev.filter(v => v.id !== video.id) : [...prev, video]);
  };

  return (
    <div className="worldcam-full-container" style={{ filter: `brightness(${brightness}%)` }}>
      {/* 1️⃣ NAVBAR: FIXED ALIGNMENT */}
      <nav className="navbar-main">
        <div className="nav-brand" onClick={() => {setShowResults(false); setShowLikes(false);}}>
          <Globe className="text-blue-500 animate-pulse" /> <span>WorldCam</span>
        </div>
        
        <div className="nav-center">
          <div className="yt-search-pill">
            <input placeholder="Search" onKeyDown={(e) => e.key === 'Enter' && handleSearch(e.target.value)} />
            <button onClick={() => handleSearch()} className="search-icon-btn"><Search size={18} /></button>
          </div>
        </div>

        <div className="nav-right">
          <Settings className="nav-icon" onClick={() => setIsSettingsOpen(!isSettingsOpen)} />
          <Heart className={`nav-icon ${showLikes ? 'text-red-500 fill-red-500' : ''}`} onClick={() => setShowLikes(true)} />
          <Bell className="nav-icon" />
          <div className="profile-dot" />
        </div>
      </nav>

      {/* 2️⃣ SETTINGS PANEL */}
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
            <p className="soon-tag">🚀 VR Mode: Coming Soon</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showLikes ? (
          <motion.main key="likes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="results-container">
            <h2 className="section-title">❤️ Liked Streams</h2>
            <div className="yt-grid">
              {likedVideos.map(cam => <VideoTile key={cam.id} cam={cam} isLiked={true} onLike={() => toggleLike(cam)} />)}
            </div>
          </motion.main>
        ) : !showResults ? (
          /* 🏠 SCREEN A: FULL HERO */
          <motion.header key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hero-full-view">
            <div className="hero-dark-mask"></div>
            <div className="hero-content-main">
              <motion.img src="https://cdn-icons-png.flaticon.com/512/4144/4144482.png" className="hero-globe" animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity }} />
              <h1 className="hero-title-colorful">{text}<span className="blink">|</span></h1>
              
              <div className="tag-group">
                {['Paris', 'Taj Mahal', 'Burj Khalifa', 'Eiffel Tower'].map(tag => (
                  <button key={tag} onClick={() => handleSearch(tag)} className="hero-tag">{tag}</button>
                ))}
              </div>
              
              <button className="btn-explore-glow" onClick={() => handleSearch('live webcam')}>Start Exploring</button>
            </div>
          </motion.header>
        ) : (
          /* 📱 SCREEN B: DASHBOARD */
          <motion.main key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="results-container">
            <div className="dashboard-head">
              <div className="flex-gap"><Flame color="#f97316"/> <h2>Trending Streams</h2></div>
              <LayoutGrid size={20} className="text-gray-500" />
            </div>
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
          <span className="live-pill">LIVE</span>
          <div className="tile-btns">
            <Heart className={`icon ${isLiked ? 'liked' : ''}`} onClick={onLike} />
            <Maximize className="icon" onClick={() => setFull(!full)} />
          </div>
        </div>
      </div>
      <div className="tile-meta">
        <div className="chan-icon" />
        <h3>{cam.title}</h3>
      </div>
    </motion.div>
  );
}