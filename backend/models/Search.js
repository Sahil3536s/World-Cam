const mongoose = require('mongoose');

const searchSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // From Firebase Auth
  query: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Search', searchSchema);