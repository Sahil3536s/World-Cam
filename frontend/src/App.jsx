import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, Bell, User, Globe, Flame, LayoutGrid, Settings, Sun, Maximize, X, Radio, Loader2, Map, Home, Camera, Menu, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import localBackgroundImg from './Images/Background.png';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import AuthModal from './AuthModal'; 
import LiveRadioModal from './LiveRadioModal';
import LiveCameraGrid from './LiveCameraGrid';
import LiveEarthModal from './LiveEarthModal';
import LiveCricketModal from './LiveCricketModal';
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
  const [isCricketOpen, setIsCricketOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isPinned, setIsPinned] = useState(window.innerWidth >= 768);
  const [isHovered, setIsHovered] = useState(false);
  const [bgImage, setBgImage] = useState(localBackgroundImg);
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

  const isSidebarExpanded = isPinned || isHovered;

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

  // 🖱️ Scroll-to-navigate: smooth directional view cycling
  const scrollCooldown = useRef(false);
  const scrollDirection = useRef(1); // 1 = down, -1 = up
  const rafId = useRef(null);
  const accumulatedDelta = useRef(0);

  const getCurrentIndex = () => {
    if (isCricketOpen) return 4;
    if (isEarthOpen) return 3;
    if (isRadioOpen) return 2;
    if (showResults && !showLikes) return 1;
    return 0;
  };

  const navigateTo = (index) => {
    switch (index) {
      case 0:
        setShowResults(false); setShowLikes(false); setIsEarthOpen(false); setIsRadioOpen(false); setIsCricketOpen(false);
        break;
      case 1:
        handleOpenLiveCameras();
        setIsCricketOpen(false);
        break;
      case 2:
        setIsRadioOpen(true); setIsEarthOpen(false); setShowResults(false); setShowLikes(false); setIsCricketOpen(false);
        break;
      case 3:
        setIsEarthOpen(true); setIsRadioOpen(false); setShowResults(false); setShowLikes(false); setIsCricketOpen(false);
        break;
      case 4:
        setIsCricketOpen(true); setIsEarthOpen(false); setIsRadioOpen(false); setShowResults(false); setShowLikes(false);
        break;
    }
  };

  useEffect(() => {
    const processScroll = () => {
      const delta = accumulatedDelta.current;
      accumulatedDelta.current = 0;
      rafId.current = null;

      if (scrollCooldown.current || Math.abs(delta) < 40) return;

      const current = getCurrentIndex();
      let next = current;

      if (delta > 0 && current < 4) { next = current + 1; scrollDirection.current = 1; }
      else if (delta < 0 && current > 0) { next = current - 1; scrollDirection.current = -1; }

      if (next !== current) {
        scrollCooldown.current = true;
        navigateTo(next);
        setTimeout(() => { scrollCooldown.current = false; }, 700);
      }
    };

    const handleWheel = (e) => {
      accumulatedDelta.current += e.deltaY;
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(processScroll);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [showResults, showLikes, isRadioOpen, isEarthOpen]);

  // Smooth directional transition variants
  const pageVariants = {
    initial: (dir) => ({ opacity: 0, y: dir * 60, scale: 0.98 }),
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
    exit: (dir) => ({ opacity: 0, y: dir * -40, scale: 0.98, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }),
  };

  const handleSearch = async (query = text) => {
    if (!query) return;
    setIsEarthOpen(false);
    setIsRadioOpen(false);
    setIsCricketOpen(false);
    setShowResults(true);
    setShowLikes(false);
    // Fetch contextual background
    setBgImage(`https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80&q=city,${query}`); 
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
      setIsEarthOpen(false);
      setIsRadioOpen(false);
      setIsCricketOpen(false);
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
    '--bg-image': (!showResults && !showLikes && !isEarthOpen && !isRadioOpen && !isCricketOpen) ? `url(${bgImage})` : "none",
    filter: `brightness(${brightness}%)`, 
    backgroundColor: '#050505',
  };

  return (
    <div className="worldcam-full-container layout" style={containerStyle}>
      
       {/* Sidebar natively incorporated inside flex container layout */}
       <aside 
        className="sidebar"
        style={{ width: isSidebarExpanded ? '240px' : '72px', gap: '10px', padding: '24px 12px' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
         <div className={`flex items-center w-full mb-4 pb-4 transition-all duration-300 ${isSidebarExpanded ? 'justify-between px-2' : 'justify-center'}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
           <Menu size={24} onClick={() => setIsPinned(!isPinned)} className={`text-slate-300 hover:text-white transition-all duration-250 ease-in-out cursor-pointer shrink-0 hover:scale-[1.05] ${isSidebarExpanded ? 'rotate-0' : '-rotate-90'}`} title="Toggle Sidebar" />
         </div>

         <button onClick={() => navigateTo(0)} className={`nav-btn ${getCurrentIndex() === 0 ? 'active' : 'inactive'}`} style={{ height: '48px' }}>
            <Home size={20} className="shrink-0" />
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="sidebar-label">Home</motion.span>
              )}
            </AnimatePresence>
         </button>

         <button onClick={() => navigateTo(1)} className={`nav-btn ${getCurrentIndex() === 1 ? 'active' : 'inactive'}`} style={{ height: '48px' }}>
            {isGridLoading ? <Loader2 size={20} className="animate-spin shrink-0" /> : <Camera size={20} className="shrink-0" />}
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="sidebar-label">Gallery</motion.span>
              )}
            </AnimatePresence>
         </button>

         <button onClick={() => navigateTo(2)} className={`nav-btn ${getCurrentIndex() === 2 ? 'active' : 'inactive'}`} style={{ height: '48px' }}>
            <Radio size={20} className="shrink-0" />
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="sidebar-label">Live</motion.span>
              )}
            </AnimatePresence>
         </button>

         <button onClick={() => navigateTo(3)} className={`nav-btn ${getCurrentIndex() === 3 ? 'active' : 'inactive'}`} style={{ height: '48px' }}>
            <Map size={20} className="shrink-0" />
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="sidebar-label">Map</motion.span>
              )}
            </AnimatePresence>
         </button>

         <button onClick={() => navigateTo(4)} className={`nav-btn ${getCurrentIndex() === 4 ? 'active' : 'inactive'}`} style={{ height: '48px' }}>
            <Trophy size={20} className="shrink-0" />
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="sidebar-label">Cricket</motion.span>
              )}
            </AnimatePresence>
         </button>

         {/* Floating Collapse Button on Edge */}
         <button 
           onClick={() => setIsPinned(!isPinned)}
           className="absolute -right-3 top-32 w-6 h-6 rounded-full flex items-center justify-center text-white hover:scale-110 transition-all z-[200]"
           style={{ background: 'linear-gradient(90deg, #2dd4bf, #3b82f6)', boxShadow: '0 0 10px rgba(59,130,246,0.3)', border: '1px solid rgba(255,255,255,0.2)' }}
         >
           {isPinned ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
         </button>
      </aside>

      {/* Main Content Vertical Layout Wrapper */}
      <div className="content">
        
        <nav className="navbar navbar-main" style={{ width: '100%' }}>
          {/* 📸 CUSTOM LOGO SECTION */}
          <div className="custom-logo" onClick={() => {setShowResults(false); setShowLikes(false); setIsEarthOpen(false); setIsRadioOpen(false);}}>
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

            <Heart className={`nav-icon ${showLikes ? 'text-red-500 fill-red-500' : ''}`} onClick={() => {setShowLikes(true); setIsEarthOpen(false); setIsRadioOpen(false); setShowResults(false);}} />
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

        {/* Dynamic Main Navigated Content Container */}
        <main className="main-content" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
          <AnimatePresence mode="wait" custom={scrollDirection.current}>
        {showLikes ? (
          <motion.main key="likes" custom={scrollDirection.current} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="results-container">
            <h2 className="section-title">❤️ Liked Streams</h2>
            <div className="yt-grid">
              {likedVideos.map(cam => <VideoTile key={cam.id} cam={cam} isLiked={true} onLike={() => toggleLike(cam)} />)}
            </div>
          </motion.main>
        ) : isEarthOpen ? (
          <motion.main key="earth" custom={scrollDirection.current} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 w-full h-full relative">
            <LiveEarthModal />
          </motion.main>
        ) : isRadioOpen ? (
          <motion.main key="radio" custom={scrollDirection.current} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 w-full h-full relative">
            <LiveRadioModal />
          </motion.main>
        ) : isCricketOpen ? (
          <motion.main key="cricket" custom={scrollDirection.current} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 w-full h-full relative">
            <LiveCricketModal />
          </motion.main>
        ) : !showResults ? (
          <motion.header key="hero" custom={scrollDirection.current} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="hero-full-view">
            <div className="hero-dark-mask" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.75))' }}></div>
            
            <div className="hero-content-main flex flex-col items-center" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <motion.div 
                  className="logo-shutter shadow-[0_0_40px_rgba(255,120,50,0.5)]" 
                  style={{width: '90px', height: '90px', margin: '0 auto 20px', background: 'linear-gradient(135deg, #3b82f6, #ef4444, #f59e0b)', border: '2px solid rgba(255,255,255,0.2)'}}
                  animate={{ y: [0, -6, 0] }} 
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                  <Globe size={45} color="white" />
              </motion.div>
              
              <h1 className="hero-title-colorful text-center" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.35)' }}>{text}<span className="blink">|</span></h1>
              <p className="hero-subtitle">Explore live cameras from cities, beaches, streets and landmarks worldwide.</p>
              
              <div className="flex mt-6 justify-center">
                <button className="btn-explore-glow" onClick={() => handleSearch('live webcam')}>Start Exploring</button>
              </div>
            </div>

            <div className="scroll-indicator">
              <span className="text-sm uppercase tracking-widest font-semibold opacity-80">Scroll to explore</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
            </div>
          </motion.header>
        ) : (
          <motion.main key="results" custom={scrollDirection.current} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="results-container">
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