import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, Bell, User, Globe, Flame, LayoutGrid, Settings, Sun, Maximize, X, Radio, Loader2, Map, Home, Camera, Menu } from 'lucide-react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import localBackgroundImg from './Images/Background.png';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import AuthModal from './AuthModal'; 
import LiveRadioModal from './LiveRadioModal';
import LiveCameraGrid from './LiveCameraGrid';
import LiveEarthModal from './LiveEarthModal';
import LiveEarthButton from './LiveEarthButton';
import { fetchWindyWebcams } from './mockApi';
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
  const [isRadioOpen, setIsRadioOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [text, setText] = useState("");
  const [isGridLoading, setIsGridLoading] = useState(false);
  const [isEarthOpen, setIsEarthOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isPinned, setIsPinned] = useState(window.innerWidth >= 768);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const fullText = "Watch the World Live";
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsPinned(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSidebarExpanded = isPinned || (!isMobile && isSidebarHovered);

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

  const handleOpenLiveCameras = async () => {
    setIsGridLoading(true);
    try {
      const data = await fetchWindyWebcams();
      setCameras(data);
      setShowResults(true);
      setShowLikes(false);
    } catch (error) {
      console.error("Error fetching cameras", error);
    } finally {
      setIsGridLoading(false);
    }
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

  const containerStyle = { 
    filter: `brightness(${brightness}%)`, 
    display: 'flex', 
    flexDirection: 'row',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#050505',
    backgroundImage: (!showResults && !showLikes) ? `url(${localBackgroundImg})` : "none",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    overflow: 'hidden'
  };

  return (
    <div className="worldcam-full-container layout" style={containerStyle}>
      
      {/* Sidebar natively incorporated inside flex container layout */}
      <aside 
        className="sidebar"
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        style={{ width: isSidebarExpanded ? '240px' : '72px', height: '100vh', flexShrink: 0, position: 'relative', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(20, 25, 40, 0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '24px 12px', transition: 'width 0.3s ease', boxShadow: 'inset -2px 0 20px rgba(0,0,0,0.3)' }}
      >
         <div className={`flex items-center w-full mb-6 transition-all duration-300 ${isSidebarExpanded ? 'justify-between px-2' : 'justify-center'}`}>
           <Menu size={24} onClick={() => setIsPinned(!isPinned)} className="text-slate-300 hover:text-white transition-transform duration-300 cursor-pointer shrink-0 hover:scale-110" title="Toggle Sidebar" />
         </div>

         <button onClick={() => {setShowResults(false); setShowLikes(false);}} className={`flex items-center gap-4 w-full text-white transition-all outline-none hover:scale-[1.03] group overflow-hidden ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`} style={{ height: '48px', paddingLeft: '12px', paddingRight: '12px', borderRadius: '14px', background: 'linear-gradient(90deg, #00c6ff, #0072ff)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 0 25px rgba(0,114,255,0.4)', transition: 'all 0.25s ease' }}>
            <Home size={20} className="text-white shrink-0 transition-transform duration-250 group-hover:scale-110" />
            <span className={`tracking-wide whitespace-nowrap transition-opacity duration-250 font-semibold ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>Home</span>
         </button>

         <button onClick={handleOpenLiveCameras} className={`flex items-center gap-4 w-full text-slate-400 hover:text-white transition-all outline-none hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(0,150,255,0.2)] hover:bg-white/10 group overflow-hidden ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`} style={{ height: '48px', paddingLeft: '12px', paddingRight: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.25s ease' }}>
            {isGridLoading ? <Loader2 size={20} className="animate-spin text-slate-400 shrink-0" /> : <Camera size={20} className="text-slate-400 shrink-0 transition-transform duration-250 group-hover:scale-110 group-hover:text-white" />}
            <span className={`tracking-wide whitespace-nowrap transition-opacity duration-250 font-medium ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>Live Cameras</span>
         </button>

         <button onClick={() => setIsRadioOpen(true)} className={`flex items-center gap-4 w-full text-slate-400 hover:text-white transition-all outline-none hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(0,150,255,0.2)] hover:bg-white/10 group overflow-hidden ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`} style={{ height: '48px', paddingLeft: '12px', paddingRight: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.25s ease' }}>
            <Radio size={20} className="text-slate-400 shrink-0 transition-transform duration-250 group-hover:scale-110 group-hover:text-white" />
            <span className={`tracking-wide whitespace-nowrap transition-opacity duration-250 font-medium ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>Live Radio</span>
         </button>

         <button onClick={() => setIsEarthOpen(true)} className={`flex items-center gap-4 w-full text-slate-400 hover:text-white transition-all outline-none hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(0,150,255,0.2)] hover:bg-white/10 group overflow-hidden ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`} style={{ height: '48px', paddingLeft: '12px', paddingRight: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.25s ease' }}>
            <Map size={20} className="text-slate-400 shrink-0 transition-transform duration-250 group-hover:scale-110 group-hover:text-white" />
            <span className={`tracking-wide whitespace-nowrap transition-opacity duration-250 font-medium ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>Live Earth</span>
         </button>
      </aside>

      {/* Main Content Vertical Layout Wrapper */}
      <div className="content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        
        <nav className="navbar navbar-main" style={{ height: '70px', width: '100%', position: 'relative', flexShrink: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center' }}>
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
        <LiveRadioModal isOpen={isRadioOpen} onClose={() => setIsRadioOpen(false)} />
        <LiveEarthModal isOpen={isEarthOpen} onClose={() => setIsEarthOpen(false)} />

        {/* Dynamic Main Navigated Content Container */}
        <main className="main-content" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
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
            <div className="hero-dark-mask" style={{ background: 'linear-gradient(to bottom, rgba(5,5,5,0.2) 0%, #050505 100%)' }}></div>
            
            <div className="hero-content-main flex flex-col items-center">
              <motion.div 
                  className="logo-shutter shadow-[0_0_40px_rgba(59,130,246,0.6)]" 
                  style={{width: '90px', height: '90px', margin: '0 auto 20px', background: 'linear-gradient(135deg, #3b82f6, #ef4444, #f59e0b)', border: '2px solid rgba(255,255,255,0.2)'}}
                  animate={{ y: [0, -15, 0] }} 
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                  <Globe size={45} color="white" />
              </motion.div>
              
              <h1 className="hero-title-colorful text-center">{text}<span className="blink">|</span></h1>
              <p className="hero-subtitle">Explore live cameras from cities, beaches, streets and landmarks worldwide.</p>
              
              <div className="flex gap-6 mt-6 flex-wrap justify-center">
                <button className="btn-explore-glow" onClick={() => handleSearch('live webcam')}>Start Exploring</button>
                <button className="btn-glass-outline" onClick={handleOpenLiveCameras} disabled={isGridLoading}>
                  {isGridLoading ? "Loading..." : "View Live Cameras"}
                </button>
              </div>
            </div>

            <div className="scroll-indicator">
              <span className="text-sm uppercase tracking-widest font-semibold opacity-80">Scroll to explore</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
            </div>
          </motion.header>
        ) : (
          <motion.main key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="results-container">
            <div className="yt-grid">
              {cameras.map(cam => <VideoTile key={cam.id} cam={cam} isLiked={likedVideos.some(v => v.id === cam.id)} onLike={() => toggleLike(cam)} />)}
            </div>
          </motion.main>
        )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function VideoTile({ cam, onLike, isLiked }) {
  const [full, setFull] = useState(false);
  const embedUrl = cam.streamUrl || `https://www.youtube.com/embed/${cam.id}?autoplay=1&mute=1`;

  return (
    <motion.div whileHover={{ y: -10 }} className={`video-tile ${full ? 'fs-mode' : ''}`}>
      <div className="thumbnail-box">
        <iframe src={embedUrl} title={cam.title} allowFullScreen allow="autoplay; encrypted-media; fullscreen" />
        <div className="tile-overlay">
          <Heart className={`icon ${isLiked ? 'liked' : ''}`} onClick={(e) => { e.stopPropagation(); onLike(cam); }} />
          <Maximize className="icon" onClick={() => setFull(!full)} />
        </div>
      </div>
      <div className="tile-meta"><h3>{cam.title}</h3></div>
    </motion.div>
  );
}