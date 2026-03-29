import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Play, Pause, Signal, Globe as GlobeIcon, Zap } from 'lucide-react';
import Globe from 'react-globe.gl';
import { RadioBrowserApi } from 'radio-browser-api';

export default function LiveRadioModal() {
  const [stations, setStations] = useState([]);
  const [playingStation, setPlayingStation] = useState(null);
  const audioRef = useRef(null);
  const globeRef = useRef(null);

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
        limit: 40, // Optimized for performance and visual clarity
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

  // 🛰️ SIGNAL ARCS (Neon pulsing lines)
  const arcsData = useMemo(() => {
    if (stations.length < 2) return [];
    // Connect stations in a network-like pattern
    return stations.slice(0, 30).map((s, i) => {
      const next = stations[(i + 5) % stations.length];
      return {
        startLat: s.lat,
        startLng: s.lng,
        endLat: next.lat,
        endLng: next.lng,
        color: ['#3b82f6', '#0ea5e9']
      };
    });
  }, [stations]);

  // 🌍 GLOBE CONFIG
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      globeRef.current.pointOfView({ altitude: 2.2 });
    }
  }, [stations]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
      
      {/* 🌌 IMMERSIVE SPACE BACKGROUND */}
      <div 
        className="absolute inset-0 z-0 opacity-60"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1506318137071-a8e063b4bcc0?auto=format&fit=crop&q=80&w=2000')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="absolute inset-0 z-1 bg-gradient-radial from-transparent via-black/40 to-black/90 pointer-events-none" />

      {/* 🛰️ HEADER OVERLAY */}
      <div className="absolute top-10 left-10 z-20 pointer-events-none">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-2xl backdrop-blur-xl">
              <Radio className="text-blue-400 animate-pulse" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-widest uppercase">Deep Space Radio</h2>
              <p className="text-[10px] font-bold text-blue-400/70 tracking-[0.3em] uppercase">Interstellar Broadcasting Network</p>
            </div>
          </div>
          <AnimatePresence>
            {playingStation && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                className="mt-6 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-2xl flex items-center gap-4 border-l-4 border-l-blue-500 shadow-2xl pointer-events-auto"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                  <Activity size={20} className="text-white animate-bounce" />
                </div>
                <div>
                  <div className="text-sm font-black text-white truncate max-w-[200px]">{playingStation.name}</div>
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{playingStation.tags}</div>
                </div>
                <button onClick={stopAudio} className="ml-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><Pause size={16}/></button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* 🔮 THE GLOBE */}
      <div className="z-10 w-full h-full cursor-grab active:cursor-grabbing">
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)"
          
          showAtmosphere={true}
          atmosphereColor="#3b82f6"
          atmosphereAltitude={0.15}

          // Points (Broadcasters)
          pointsData={stations}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => "#3b82f6"}
          pointAltitude={0.01}
          pointRadius={0.4}
          pointsMerge={false}

          // Arcs (Signal Lines)
          arcsData={arcsData}
          arcColor="color"
          arcDashLength={0.4}
          arcDashGap={4}
          arcDashAnimateTime={2000}
          arcStroke={0.5}

          // Floating HTML Elements (Cards)
          htmlElementsData={stations.slice(0, 15)} // Show subset of cards for cleaner UI
          htmlLat="lat"
          htmlLng="lng"
          htmlElement={(d) => {
            const el = document.createElement('div');
            el.innerHTML = `
              <div class="radio-card group">
                <div class="card-inner">
                  <div class="card-header">
                    <span class="station-name">${d.name}</span>
                    <span class="genre">${d.tags}</span>
                  </div>
                  <div class="card-footer">
                    <div class="signal-bar">
                      <div class="signal-fill" style="width: ${Math.random() * 40 + 60}%"></div>
                    </div>
                    <button class="play-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                  </div>
                </div>
                <div class="card-glow"></div>
              </div>
            `;
            el.querySelector('.play-btn').onclick = () => playStation(d);
            return el;
          }}
        />
      </div>

      {/* 🎨 COMPACT CSS FOR FLOATING CARDS */}
      <style>{`
        .radio-card {
          position: relative;
          padding: 1px;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transform: translate(-50%, -100%);
          margin-top: -30px;
          pointer-events: auto;
        }
        .radio-card:hover { border-color: #3b82f6; transform: translate(-50%, -105%) scale(1.1); }
        
        .card-inner {
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 10px 14px;
          border-radius: 12px;
          width: 160px;
          position: relative;
          z-index: 2;
        }
        .card-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
          z-index: 1;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .radio-card:hover .card-glow { opacity: 1; }

        .station-name { display: block; font-size: 10px; font-weight: 900; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; margin-bottom: 2px; }
        .genre { font-size: 8px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); }
        .signal-bar { width: 60px; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
        .signal-fill { height: 100%; background: #3b82f6; box-shadow: 0 0 10px #3b82f6; }
        
        .play-btn { width: 24px; height: 24px; background: #3b82f6; border-radius: 8px; display: flex; items-center: center; justify-content: center; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .play-btn:hover { background: #60a5fa; transform: scale(1.1); }

        /* Animation for Signal Arcs */
        @keyframes pulseArc {
          0% { opacity: 0.3; stroke-width: 0.5; }
          50% { opacity: 1; stroke-width: 1.5; }
          100% { opacity: 0.3; stroke-width: 0.5; }
        }
      `}</style>
    </div>
  );
}

// 🛰️ Missing Import Helper
function Activity({ size, className }) {
  return <Zap size={size} className={className} />;
}
