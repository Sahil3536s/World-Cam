import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_KEY = 'AIzaSyBxQy5vJRdDLTEGU33BLHKzU9ppiC7rXd8'; 

function App() {
  const [cameras, setCameras] = useState([]);
  const [text, setText] = useState("");
  const fullText = "Scanning global live feeds... Welcome, Sahil.";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(timer);
    }, 70);
    return () => clearInterval(timer);
  }, []);

  const fetchCams = async (query) => {
    try {
      const res = await axios.get(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video&q=${query}&maxResults=12&key=${API_KEY}`
      );
      setCameras(res.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
      })));
    } catch (err) {
      console.error("API Error: Check Key");
    }
  };

  useEffect(() => { fetchCams('live webcam nature'); }, []);

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h1 className="logo">World<span>Cam</span></h1>
        <p className="typewriter">{text}</p>
        
        <input 
          type="text" 
          placeholder="Search (e.g. Tokyo)..." 
          className="search-bar"
          onKeyDown={(e) => e.key === 'Enter' && fetchCams(e.target.value)}
        />
        
        <div className="user-info">
          <p>Developer: Sahil Sehrawat</p>
          <p>Status: 🟢 Connected</p>
        </div>
      </aside>

      <main className="content">
        <div className="camera-grid">
          {cameras.map(cam => (
            <div key={cam.id} className="cam-card">
              <div className="player-wrapper">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${cam.id}?autoplay=0&mute=1`}
                  title={cam.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="iframe-player"
                ></iframe>
              </div>
              <div className="cam-info">
                <h3>{cam.title}</h3>
                <span className="live-tag">LIVE</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;