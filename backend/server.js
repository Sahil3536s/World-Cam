const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose'); 
const cors = require('cors');
require('dotenv').config();

const Search = require('./models/Search'); 

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

app.get('/api/search', async (req, res) => {
  const { q, uid } = req.query;

  try {
    if (uid && q) {
      await Search.create({ userId: uid, query: q });
    }

    // 🔥 PRECISE API CALL
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: 'snippet',
        type: 'video', // Strictly search for videos
        videoEmbeddable: 'true',
        q: q,
        maxResults: 20,
        safeSearch: 'none', // Prevents over-filtering
        relevanceLanguage: 'en', // Broadens result variety
        key: process.env.YOUTUBE_API_KEY 
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error("Backend Error:", error.message);
    res.status(500).json({ error: "Backend failed to fetch" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));