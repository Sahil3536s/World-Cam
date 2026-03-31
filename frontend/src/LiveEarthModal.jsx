"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, Satellite, Radio, CloudRain, Wind, Thermometer, Droplets, Gauge, Play, Pause, ChevronLeft, Layers, Plus, Minus, Cloud, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ══════════════════════════════════════════
   WEATHER LAYERS CONFIG
   ══════════════════════════════════════════ */
const WEATHER_LAYERS = [
  { id: 'satellite', label: 'Satellite', icon: Satellite, overlay: 'satellite', description: 'Live satellite imagery', useLeaflet: true },
  { id: 'radar', label: 'Radar', icon: Radio, overlay: 'radar', description: 'Weather radar', useLeaflet: false },
  { id: 'rain', label: 'Precipitation', icon: CloudRain, overlay: 'rainAccu', description: 'Accumulated precipitation', useLeaflet: false },
  { id: 'wind', label: 'Wind', icon: Wind, overlay: 'wind', description: 'Live wind speed & direction', useLeaflet: false },
  { id: 'temp', label: 'Temperature', icon: Thermometer, overlay: 'temp', description: 'Live surface temperature', useLeaflet: false },
  { id: 'clouds', label: 'Clouds', icon: Cloud, overlay: 'clouds', description: 'Cloud cover', useLeaflet: false },
  { id: 'humidity', label: 'Humidity', icon: Droplets, overlay: 'rh', description: 'Relative humidity', useLeaflet: false },
  { id: 'pressure', label: 'Pressure', icon: Gauge, overlay: 'pressure', description: 'Sea-level pressure', useLeaflet: false },
];

const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

/* ══════════════════════════════════════════
   LEAFLET CHILD COMPONENTS
   ══════════════════════════════════════════ */
function MapBridge({ onMapReady }) {
  const map = useMap();
  useEffect(() => { onMapReady(map); }, [map, onMapReady]);
  return null;
}

function ZoomReporter({ onZoomChange }) {
  useMapEvents({ zoomend: (e) => onZoomChange(e.target.getZoom()) });
  return null;
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════ */
export default function LiveEarthModal() {
  const [mapInstance, setMapInstance] = useState(null);
  const [activeLayer, setActiveLayer] = useState('satellite');
  const [leafletZoom, setLeafletZoom] = useState(4);
  const [windyZoom, setWindyZoom] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [currentDate] = useState(new Date());
  const [timeOffset, setTimeOffset] = useState(50);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [windyLoaded, setWindyLoaded] = useState(false);

  const currentLayerCfg = WEATHER_LAYERS.find(l => l.id === activeLayer) || WEATHER_LAYERS[0];
  const isSatellite = currentLayerCfg.useLeaflet;

  // Windy URL for weather layers
  const windyUrl = useMemo(() => {
    if (isSatellite) return '';
    return `https://embed.windy.com/embed2.html?lat=20.5937&lon=78.9629&zoom=${windyZoom}&level=surface&overlay=${currentLayerCfg.overlay}&menu=&message=true&type=map&location=coordinates&metricWind=km%2Fh&metricTemp=%C2%B0C`;
  }, [isSatellite, currentLayerCfg.overlay, windyZoom]);

  const handleMapReady = useCallback((map) => { setMapInstance(map); }, []);

  // Layer switching
  const handleLayerChange = useCallback((layerId) => {
    if (layerId === activeLayer) return;
    setIsTransitioning(true);
    const newLayer = WEATHER_LAYERS.find(l => l.id === layerId);
    if (!newLayer.useLeaflet) setWindyLoaded(false);
    setTimeout(() => {
      setActiveLayer(layerId);
      setTimeout(() => setIsTransitioning(false), 400);
    }, 200);
  }, [activeLayer]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    if (isSatellite && mapInstance) {
      const target = Math.min(mapInstance.getZoom() + 1, 18);
      mapInstance.flyTo(mapInstance.getCenter(), target, { duration: 0.8, easeLinearity: 0.2 });
    } else {
      setWindyZoom(prev => Math.min(prev + 1, 15));
    }
  }, [isSatellite, mapInstance]);

  const handleZoomOut = useCallback(() => {
    if (isSatellite && mapInstance) {
      const target = Math.max(mapInstance.getZoom() - 1, 2);
      mapInstance.flyTo(mapInstance.getCenter(), target, { duration: 0.8, easeLinearity: 0.2 });
    } else {
      setWindyZoom(prev => Math.max(prev - 1, 2));
    }
  }, [isSatellite, mapInstance]);

  const handleLocate = useCallback(() => {
    if (!isSatellite || !mapInstance) return;
    mapInstance.locate({ setView: false, maxZoom: 12 });
    mapInstance.once('locationfound', (e) => {
      mapInstance.flyTo(e.latlng, 10, { duration: 2, easeLinearity: 0.15 });
    });
  }, [isSatellite, mapInstance]);

  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-center bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3 drop-shadow-lg">
          <Map className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" size={28} /> Live Earth &amp; Weather
        </h2>
      </div>

      <div className="map-wrapper">
        {/* ═══ SATELLITE: Leaflet with smooth zoom ═══ */}
        <div className={`windy-iframe-container ${isSatellite ? 'windy-visible' : 'windy-hidden'}`}>
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={4}
            minZoom={2}
            maxZoom={18}
            zoomSnap={0.25}
            zoomDelta={0.5}
            wheelPxPerZoomLevel={180}
            wheelDebounceTime={80}
            fadeAnimation={true}
            zoomAnimation={true}
            zoomControl={false}
            attributionControl={false}
            style={{ width: '100%', height: '100%', borderRadius: '14px' }}
            className="leaflet-smooth-map"
          >
            <TileLayer url={ESRI_SATELLITE} attribution="&copy; Esri" maxZoom={18} />
            <TileLayer url={ESRI_LABELS} maxZoom={18} opacity={0.8} />
            <MapBridge onMapReady={handleMapReady} />
            <ZoomReporter onZoomChange={setLeafletZoom} />
          </MapContainer>
        </div>

        {/* ═══ WEATHER LAYERS: Windy iframe ═══ */}
        {!isSatellite && (
          <div className={`windy-iframe-container ${isTransitioning ? 'windy-transitioning' : 'windy-visible'}`}>
            <iframe
              key={`${activeLayer}-${windyZoom}`}
              src={windyUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              loading="lazy"
              title={`Live Earth — ${activeLayer}`}
              allowFullScreen
              onLoad={() => setWindyLoaded(true)}
            />
          </div>
        )}

        {/* ═══ ZOOM CONTROLS ═══ */}
        <div className="map-zoom-controls">
          <motion.button className="map-zoom-btn" onClick={handleZoomIn} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }} title="Zoom in">
            <Plus size={18} />
          </motion.button>
          <div className="map-zoom-level">{isSatellite ? Math.round(leafletZoom) : windyZoom}</div>
          <motion.button className="map-zoom-btn" onClick={handleZoomOut} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }} title="Zoom out">
            <Minus size={18} />
          </motion.button>
          {isSatellite && (
            <>
              <div className="map-zoom-divider" />
              <motion.button className="map-zoom-btn" onClick={handleLocate} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }} title="My location">
                <Navigation size={16} />
              </motion.button>
            </>
          )}
        </div>

        {/* ═══ WEATHER PANEL (LEFT) ═══ */}
        <div className={`weather-panel ${isPanelCollapsed ? 'weather-panel-collapsed' : ''}`}>
          <div className="weather-panel-header">
            <div className="weather-panel-title">
              <Layers size={16} />
              <span>Layers</span>
            </div>
            <button className="weather-panel-toggle" onClick={() => setIsPanelCollapsed(!isPanelCollapsed)} title={isPanelCollapsed ? 'Expand' : 'Collapse'}>
              <ChevronLeft size={16} className={isPanelCollapsed ? 'weather-toggle-rotated' : ''} />
            </button>
          </div>
          {!isPanelCollapsed && (
            <motion.div className="weather-options-list" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
              {WEATHER_LAYERS.map((layer) => {
                const IconComp = layer.icon;
                const isActive = activeLayer === layer.id;
                return (
                  <button key={layer.id} className={`weather-option ${isActive ? 'weather-option-active' : ''}`} onClick={() => handleLayerChange(layer.id)} title={layer.description}>
                    <IconComp size={18} className={`weather-option-icon ${isActive ? 'weather-icon-active' : ''}`} />
                    <span className="weather-option-label">{layer.label}</span>
                    {isActive && <motion.div className="weather-active-dot" layoutId="activeLayerDot" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* ═══ TIMELINE ═══ */}
        <div className="timeline-control">
          <button className="timeline-play-btn" onClick={() => setIsPlaying(!isPlaying)} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <div className="timeline-date-info">
            <span className="timeline-date">{formatDate(currentDate)}</span>
            <span className="timeline-time">{formatTime(currentDate)}</span>
          </div>
          <div className="timeline-slider-wrapper">
            <input type="range" min="0" max="100" value={timeOffset} onChange={(e) => setTimeOffset(Number(e.target.value))} className="timeline-slider" />
            <div className="timeline-slider-track" style={{ width: `${timeOffset}%` }} />
          </div>
          <div className="timeline-speed"><span>1x</span></div>
        </div>

        {/* ═══ ACTIVE BADGE ═══ */}
        <AnimatePresence mode="wait">
          <motion.div key={activeLayer} className="weather-active-badge" initial={{ opacity: 0, y: -10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }} transition={{ duration: 0.3 }}>
            {(() => { const layer = WEATHER_LAYERS.find(l => l.id === activeLayer); const IC = layer.icon; return (<><IC size={16} /><span>{layer.label}</span></>); })()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
