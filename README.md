🌍 WorldCam

WorldCam is a cloud-based live webcam explorer that lets users discover and watch live camera streams from locations around the world. The application combines live video, interactive maps, search, and user features into a modern, responsive interface.

✨ Features
🌎 Explore Global Webcams — Discover live webcam streams from different locations around the world.
📺 Live Streaming — Watch live webcam streams through YouTube Live integration.
🗺️ Interactive Map — Explore webcam locations using Mapbox GL.
🔍 Search — Quickly find webcams based on locations.
🔐 User Authentication — Secure user login using Firebase Authentication.
❤️ Liked Webcams — Save your favorite webcams for quick access.
☀️ Brightness Control — Adjust the video viewing experience with an integrated brightness slider.
📱 Responsive Design — Optimized for desktop, tablet, and mobile screens.
🪟 Modern UI — Glassmorphism-inspired interface with smooth animations and a macOS-style floating navigation bar.


🛠️ Tech Stack
Frontend: React.js
Build Tool: Vite
Styling: CSS
Maps: Mapbox GL
Authentication & Data: Firebase
Live Video: YouTube Live
Deployment: Vercel
Version Control: Git & GitHub
🏗️ Architecture
                    ┌─────────────────┐
                    │     WorldCam    │
                    │   React + Vite  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐   ┌───────────┐   ┌──────────┐
        │ Firebase │   │ Mapbox GL │   │ YouTube  │
        │          │   │           │   │   Live   │
        └──────────┘   └───────────┘   └──────────┘
              │
              ▼
       Authentication
       & User Data

       
🚀 Getting Started
Prerequisites
Make sure you have installed:
Node.js
npm
Git

Installation
Clone the repository:
git clone https://github.com/Sahil3536s/World-Cam.git

Navigate to the project:
cd World-Cam

Install dependencies:
npm install

Start the development server:
npm run dev

Open the local development URL shown in your terminal.

🔑 Environment Variables

Create a .env file in the root directory and add your required API configuration:

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id

VITE_MAPBOX_TOKEN=your_mapbox_token

Never commit your API keys or other sensitive credentials to GitHub.

🌐 Live Demo
WorldCam:
https://world-cam.vercel.app/

📂 Project Structure
World-Cam/
│
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── assets/
│   └── ...
│
├── .env
├── package.json
├── vite.config.js
└── README.md

🎯 Future Improvements
 Add more webcam sources
 Add webcam categories
 Add location-based filtering
 Improve mobile experience
 Add recently viewed webcams
 Add webcam status monitoring
 Add dark/light theme options
 
👨‍💻 Author
Sahil Sehrawat
GitHub: https://github.com/Sahil3536s
⭐ Support

If you like WorldCam, consider giving the repository a ⭐ on GitHub.
