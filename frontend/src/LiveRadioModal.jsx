import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Radio } from 'lucide-react';
import Globe from 'react-globe.gl';
import { RadioBrowserApi } from 'radio-browser-api';

export default function LiveRadioModal() {
  const [stations, setStations] = useState([]);
  const [playingStation, setPlayingStation] = useState(null);
  const audioRef = useRef(null);
  const globeRef = useRef(null);

  useEffect(() => {
    if (stations.length === 0) fetchStations();
    return () => stopAudio(); // Auto-stop radio when tab unmounts
  }, []);

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

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-black/60">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-center bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 drop-shadow-lg">
            <Radio className="text-blue-500 animate-pulse drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" size={28} /> Live Radio
          </h2>
          {playingStation ? (
            <p className="text-[15px] text-blue-300 mt-1 drop-shadow-lg font-medium tracking-wide">
              🎵 Playing: {playingStation.name}
            </p>
          ) : (
            <p className="text-[15px] text-gray-300 mt-1 drop-shadow-lg tracking-wide">
              Select a glowing broadcaster point to tune in
            </p>
          )}
        </div>
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
    </div>
  );
}
