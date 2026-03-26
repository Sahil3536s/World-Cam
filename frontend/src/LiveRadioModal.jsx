import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Radio } from 'lucide-react';
import Globe from 'react-globe.gl';
import { RadioBrowserApi } from 'radio-browser-api';

export default function LiveRadioModal({ isOpen, onClose }) {
  const [stations, setStations] = useState([]);
  const [playingStation, setPlayingStation] = useState(null);
  const audioRef = useRef(null);
  const globeRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (stations.length === 0) fetchStations();
    } else {
      stopAudio();
    }
  }, [isOpen]);

  const fetchStations = async () => {
    try {
      const api = new RadioBrowserApi('MyRadioApp');
      const results = await api.searchStations({
        hasGeoInfo: true,
        hideBroken: true,
        limit: 100,
      });

      const mappedStations = results
        .filter(s => s.geoLat !== null && s.geoLong !== null)
        .map((s) => ({
          lat: s.geoLat,
          lng: s.geoLong,
          name: s.name,
          country: s.country,
          streamUrl: s.urlResolved,
          size: Math.random() * 0.2 + 0.05, // Randomized small sizes for the dots
        }));
      setStations(mappedStations);
    } catch (error) {
      console.error("Error fetching stations:", error);
    }
  };

  const playStation = (station) => {
    stopAudio();
    setPlayingStation(station);
    const audio = new Audio(station.streamUrl);
    audio.play().catch(e => console.error("Audio playback error:", e));
    audioRef.current = audio;
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPlayingStation(null);
  };

  const handleClose = () => {
    stopAudio();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full h-full md:w-[90vw] md:h-[90vh] bg-black/60 border border-white/20 rounded-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="pointer-events-auto">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-lg">
                <Radio className="text-blue-500 animate-pulse" /> Live Radio
              </h2>
              {playingStation ? (
                <p className="text-sm text-blue-400 mt-1 drop-shadow-lg font-medium">
                  🎵 Playing: {playingStation.name}
                </p>
              ) : (
                <p className="text-sm text-gray-300 mt-1 drop-shadow-lg">
                  Click on a glowing point to listen
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="pointer-events-auto text-white hover:text-red-400 transition bg-black/50 p-2 rounded-full backdrop-blur-md border border-white/10"
            >
              <X size={24} />
            </button>
          </div>

          <div className="w-full h-full cursor-pointer relative">
            <Globe
              ref={globeRef}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
              backgroundColor="rgba(0,0,0,0)"
              pointsData={stations}
              pointLat="lat"
              pointLng="lng"
              pointLabel={(d) => `
                <div style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); padding: 8px 12px; border-radius: 8px; color: white; font-family: inherit; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                  <strong>${d.name}</strong><br/>
                  <span style="font-size: 12px; color: #a0aec0;">${d.country || 'Unknown'}</span>
                </div>
              `}
              pointColor={() => "#3b82f6"} // Glowing blue color
              pointAltitude="size"
              pointRadius="size"
              pointsMerge={false}
              onPointClick={playStation}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
