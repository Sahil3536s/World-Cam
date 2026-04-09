import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Play, Pause, Zap } from 'lucide-react';
import Globe from 'react-globe.gl';
import { RadioBrowserApi } from 'radio-browser-api';

export default function LiveRadioModal() {
  const [stations, setStations] = useState([]);
  const [playingStation, setPlayingStation] = useState(null);
  const audioRef = useRef(null);
  const globeRef = useRef(null);
  const containerRef = useRef(null);

  // 🚀 FETCH RADIOS
  useEffect(() => {
    fetchStations();
    return () => stopAudio();
  }, []);

  const fetchStations = async () => {
    try {
      const api = new RadioBrowserApi('WorldCamApp');
      const results = await api.searchStations({
        hasGeoInfo: true,
        limit: 40,
        hideBroken: true
      });

      const mapped = results
        .filter(s => s.geoLat && s.geoLong)
        .map(s => ({
          lat: s.geoLat,
          lng: s.geoLong,
          name: s.name,
          tags: s.tags?.[0] || 'Radio',
          bitrate: s.bitrate || '128',
          streamUrl: s.urlResolved,
          id: s.stationuuid
        }));
      setStations(mapped);
    } catch (e) {
      console.error("Radio Error:", e);
    }
  };

  // 🎧 AUDIO LOGIC
  const playStation = (station) => {
    if (audioRef.current) stopAudio();
    setPlayingStation(station);
    const audio = new Audio(station.streamUrl);
    audio.play().catch(err => console.error("Playback failed", err));
    audioRef.current = audio;
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingStation(null);
  };

  // 🛰️ SIGNAL ARCS
  const arcsData = useMemo(() => {
    if (stations.length < 2) return [];
    return stations.slice(0, 25).map((s, i) => {
      const next = stations[(i + 5) % stations.length];
      return {
        startLat: s.lat,
        startLng: s.lng,
        endLat: next.lat,
        endLng: next.lng,
        color: ['rgba(77,166,255,0.5)', 'rgba(59,130,246,0.15)']
      };
    });
  }, [stations]);

  // 🌍 GLOBE CONFIG — Photorealistic slow rotation
  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enableZoom = true;
      controls.minDistance = 200;
      controls.maxDistance = 600;
      globeRef.current.pointOfView({ altitude: 2.0 });
    }
  }, [stations]);

  return (
    <div ref={containerRef} style={styles.container}>
      
      {/* 🌌 SPACE BACKGROUND — Dark gradient, no heavy noise */}
      <div style={styles.spaceBg} />
      <div style={styles.spaceOverlay} />

      {/* ✨ Subtle starfield (CSS-based, lightweight) */}
      <div style={styles.starfield} />

      {/* 📡 CENTERED HEADER — Title + Subtitle above globe */}
      <div style={styles.headerContainer}>
        <motion.div 
          initial={{ opacity: 0, y: -30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={styles.headerInner}
        >
          <div style={styles.radioIconWrap}>
            <Radio style={styles.radioIcon} size={20} />
          </div>
          <h1 style={styles.title}>DEEP SPACE RADIO</h1>
          <p style={styles.subtitle}>Interstellar Broadcasting Network</p>
        </motion.div>
      </div>

      {/* 🎵 NOW PLAYING — Centered floating card */}
      <AnimatePresence>
        {playingStation && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            style={styles.nowPlaying}
          >
            <div style={styles.npPulse}>
              <Activity size={18} style={{ color: 'white' }} />
            </div>
            <div style={styles.npInfo}>
              <div style={styles.npName}>{playingStation.name}</div>
              <div style={styles.npTag}>{playingStation.tags}</div>
            </div>
            <button onClick={stopAudio} style={styles.npStop}>
              <Pause size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔮 THE GLOBE — Photorealistic Earth */}
      <div style={styles.globeContainer}>
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)"
          
          showAtmosphere={true}
          atmosphereColor="rgba(77,166,255,0.6)"
          atmosphereAltitude={0.18}

          // Points
          pointsData={stations}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => "#4DA6FF"}
          pointAltitude={0.012}
          pointRadius={0.35}
          pointsMerge={false}

          // Arcs
          arcsData={arcsData}
          arcColor="color"
          arcDashLength={0.5}
          arcDashGap={4}
          arcDashAnimateTime={2500}
          arcStroke={0.4}

          // Floating HTML Cards
          htmlElementsData={stations.slice(0, 12)}
          htmlLat="lat"
          htmlLng="lng"
          htmlElement={(d) => {
            const el = document.createElement('div');
            el.innerHTML = `
              <div class="rc-card">
                <div class="rc-inner">
                  <div class="rc-name">${d.name}</div>
                  <div class="rc-genre">${d.tags}</div>
                  <div class="rc-footer">
                    <div class="rc-signal"><div class="rc-signal-fill" style="width:${Math.random() * 35 + 60}%"></div></div>
                    <button class="rc-play">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            `;
            el.querySelector('.rc-play').onclick = () => playStation(d);
            return el;
          }}
        />
      </div>

      {/* 🎨 SCOPED CSS */}
      <style>{`
        /* ─── Radio Cards — Refined Glassmorphism ─── */
        .rc-card {
          transform: translate(-50%, -100%);
          margin-top: -6px;
          pointer-events: auto;
          transition: transform 0.3s ease, filter 0.3s ease;
          filter: drop-shadow(0 6px 16px rgba(0,0,0,0.45));
        }
        .rc-card:hover {
          transform: translate(-50%, -106%) scale(1.05);
          filter: drop-shadow(0 8px 24px rgba(59,130,246,0.2));
        }
        .rc-inner {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 11px 14px;
          width: 165px;
        }
        .rc-name {
          font-size: 10px;
          font-weight: 800;
          color: rgba(255,255,255,0.92);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 2px;
          font-family: 'Inter', sans-serif;
        }
        .rc-genre {
          font-size: 8px;
          font-weight: 700;
          color: rgba(77,166,255,0.8);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: 'Inter', sans-serif;
        }
        .rc-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 9px;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .rc-signal {
          width: 58px;
          height: 2.5px;
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
          overflow: hidden;
        }
        .rc-signal-fill {
          height: 100%;
          background: linear-gradient(90deg, #3B82F6, #4DA6FF);
          border-radius: 3px;
        }
        .rc-play {
          width: 24px;
          height: 24px;
          background: rgba(59,130,246,0.85);
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(59,130,246,0.3);
        }
        .rc-play:hover {
          background: rgba(77,166,255,0.95);
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}

// 🛰️ Helper
function Activity({ size, style }) {
  return <Zap size={size} style={style} />;
}

// ═══════════════════════════════════════════
// 🎨 INLINE STYLES — Apple Vision Pro Clean
// ═══════════════════════════════════════════
const styles = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    background: '#020617',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Deep space gradient background
  spaceBg: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 50% 40%, rgba(15,23,42,0.6) 0%, rgba(2,6,23,1) 70%)',
    zIndex: 0,
  },

  // Soft vignette overlay
  spaceOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 50% 50%, transparent 30%, rgba(2,6,23,0.85) 100%)',
    zIndex: 1,
    pointerEvents: 'none',
  },

  // Subtle CSS starfield
  starfield: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    pointerEvents: 'none',
    opacity: 0.25,
    backgroundImage: `
      radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,0.6) 0%, transparent 100%),
      radial-gradient(1px 1px at 28% 55%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1.2px 1.2px at 45% 25%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(1px 1px at 60% 72%, rgba(255,255,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 75% 40%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(1px 1px at 88% 15%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 92% 78%, rgba(255,255,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 8% 85%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(1px 1px at 50% 8%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 35% 92%, rgba(255,255,255,0.3) 0%, transparent 100%)
    `,
    backgroundSize: '700px 500px',
  },

  // ─── Centered Header ───
  headerContainer: {
    position: 'absolute',
    top: '18px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 30,
    pointerEvents: 'none',
    textAlign: 'center',
  },
  headerInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  radioIconWrap: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'rgba(59,130,246,0.12)',
    border: '1px solid rgba(59,130,246,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  radioIcon: {
    color: '#4DA6FF',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#f1f5f9',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    margin: 0,
    fontFamily: "'Inter', 'SF Pro Display', sans-serif",
    textShadow: '0 0 40px rgba(77,166,255,0.15), 0 0 80px rgba(59,130,246,0.08)',
  },
  subtitle: {
    fontSize: '0.68rem',
    fontWeight: 600,
    color: 'rgba(77,166,255,0.5)',
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },

  // ─── Now Playing ───
  nowPlaying: {
    position: 'absolute',
    bottom: '90px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(15,23,42,0.7)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '12px 18px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    pointerEvents: 'auto',
  },
  npPulse: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(59,130,246,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 16px rgba(59,130,246,0.35)',
    flexShrink: 0,
  },
  npInfo: {
    minWidth: 0,
  },
  npName: {
    fontSize: '0.82rem',
    fontWeight: 800,
    color: '#f1f5f9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '180px',
    fontFamily: "'Inter', sans-serif",
  },
  npTag: {
    fontSize: '0.6rem',
    fontWeight: 700,
    color: 'rgba(77,166,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    fontFamily: "'Inter', sans-serif",
  },
  npStop: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.7)',
    transition: 'all 0.25s ease',
    flexShrink: 0,
    padding: 0,
  },

  // ─── Globe ───
  globeContainer: {
    position: 'absolute',
    inset: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
  },
};
