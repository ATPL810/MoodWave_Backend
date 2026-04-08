// routes/spotifyRoutes.js
const express = require('express');
const axios = require('axios');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getSpotifyToken } = require('../utils/spotifyHelper');
const router = express.Router();

// Get recommendations based on mood with dynamic audio features
router.post('/recommendations', authMiddleware, async (req, res) => {
    try {
        const { mood, confidence, target_valence, target_energy, target_danceability, limit = 12 } = req.body;
        
        const accessToken = await getSpotifyToken();
        
        // Map mood to seed genres
        const moodGenres = {
            'Happy': ['pop', 'dance', 'happy'],
            'Sad': ['acoustic', 'sad', 'piano'],
            'Energetic': ['edm', 'rock', 'work-out'],
            'Calm': ['chill', 'ambient', 'study'],
            'Stressed': ['meditation', 'ambient', 'classical'],
            'Neutral': ['pop', 'indie', 'alternative']
        };
        
        const genres = moodGenres[mood] || moodGenres.Neutral;
        const seedGenres = genres.slice(0, 2).join(',');
        
        // Build params with dynamic audio features
        const params = {
            seed_genres: seedGenres,
            limit: Math.min(limit, 100),
            market: 'US'
        };
        
        // Add target audio features if provided
        if (target_valence) params.target_valence = target_valence;
        if (target_energy) params.target_energy = target_energy;
        if (target_danceability) params.target_danceability = target_danceability;
        
        // Add min/max based on confidence
        if (confidence) {
            const confidenceAdjustment = (confidence - 50) / 100;
            if (target_valence) {
                params.min_valence = Math.max(0, target_valence - 0.2 - confidenceAdjustment);
                params.max_valence = Math.min(1, target_valence + 0.2 + confidenceAdjustment);
            }
        }
        
        const response = await axios.get('https://api.spotify.com/v1/recommendations', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            params: params
        });
        
        const tracks = response.data.tracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            albumArt: track.album.images[0]?.url || '',
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls.spotify,
            popularity: track.popularity,
            color: getColorForMood(mood)
        }));
        
        res.json({ success: true, tracks });
        
    } catch (error) {
        console.error('Spotify recommendations error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch recommendations' });
    }
});

// Search endpoint as fallback
router.post('/search', authMiddleware, async (req, res) => {
    try {
        const { query, limit = 12 } = req.body;
        const accessToken = await getSpotifyToken();
        
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            params: { q: query, type: 'track', limit: limit, market: 'US' }
        });
        
        const tracks = response.data.tracks.items.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            albumArt: track.album.images[0]?.url || '',
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls.spotify,
            popularity: track.popularity,
            color: '#667eea'
        }));
        
        res.json({ success: true, tracks });
        
    } catch (error) {
        console.error('Spotify search error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to search tracks' });
    }
});

// Get track preview by name and artist
router.get('/track-preview/:trackName/:artistName', authMiddleware, async (req, res) => {
    try {
        const { trackName, artistName } = req.params;
        const accessToken = await getSpotifyToken();
        
        // Search for the track
        const searchQuery = `${decodeURIComponent(trackName)} ${decodeURIComponent(artistName)}`;
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            params: {
                q: searchQuery,
                type: 'track',
                limit: 1,
                market: 'US'
            }
        });
        
        const track = response.data.tracks.items[0];
        if (track && track.preview_url) {
            res.json({ success: true, previewUrl: track.preview_url });
        } else {
            res.json({ success: false, message: 'No preview available' });
        }
    } catch (error) {
        console.error('Track preview error:', error);
        res.json({ success: false, message: 'Failed to fetch preview' });
    }
});

function getColorForMood(mood) {
    const colors = {
        'Happy': '#FFD700',
        'Sad': '#45B7D1',
        'Energetic': '#FF6B6B',
        'Calm': '#96CEB4',
        'Stressed': '#4ECDC4',
        'Neutral': '#667eea'
    };
    return colors[mood] || '#667eea';
}

module.exports = router;