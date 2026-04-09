const express = require('express');
const axios = require('axios');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

// Spotify token cache
let spotifyToken = null;
let tokenExpiry = null;

async function getSpotifyToken() {
    // Check if cached token is still valid
    if (spotifyToken && tokenExpiry && Date.now() < tokenExpiry) {
        return spotifyToken;
    }
    
    try {
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        
        const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        spotifyToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
        
        console.log('✅ Spotify token obtained');
        return spotifyToken;
    } catch (error) {
        console.error('Spotify token error:', error.response?.data || error.message);
        throw new Error('Failed to get Spotify token');
    }
}

// Recommendations endpoint
router.post('/recommendations', authMiddleware, async (req, res) => {
    try {
        const { mood, confidence, limit = 12 } = req.body;
        
        // Map mood to seed genres and audio features
        const moodConfig = {
            'Happy': { genres: ['pop', 'dance'], target_valence: 0.8, target_energy: 0.7 },
            'Sad': { genres: ['acoustic', 'piano'], target_valence: 0.2, target_energy: 0.3 },
            'Energetic': { genres: ['edm', 'rock'], target_energy: 0.9, target_valence: 0.6 },
            'Calm': { genres: ['chill', 'ambient'], target_energy: 0.2, target_valence: 0.5 },
            'Stressed': { genres: ['meditation', 'classical'], target_energy: 0.3, target_valence: 0.4 },
            'Neutral': { genres: ['pop', 'indie'], target_valence: 0.5, target_energy: 0.5 }
        };
        
        const config = moodConfig[mood] || moodConfig.Neutral;
        const seedGenres = config.genres.slice(0, 2).join(',');
        
        const token = await getSpotifyToken();
        
        const params = {
            seed_genres: seedGenres,
            limit: Math.min(limit, 20),
            market: 'US'
        };
        
        if (config.target_valence) params.target_valence = config.target_valence;
        if (config.target_energy) params.target_energy = config.target_energy;
        
        // Adjust based on confidence
        if (confidence) {
            const adjustment = (confidence - 50) / 100;
            if (params.target_valence) {
                params.min_valence = Math.max(0, params.target_valence - 0.2);
                params.max_valence = Math.min(1, params.target_valence + 0.2);
            }
        }
        
        const response = await axios.get('https://api.spotify.com/v1/recommendations', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: params
        });
        
        const tracks = response.data.tracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls.spotify,
            albumArt: track.album.images[0]?.url || '',
            color: getColorForMood(mood)
        }));
        
        console.log(`✅ Found ${tracks.length} tracks for mood: ${mood}`);
        res.json({ success: true, tracks });
        
    } catch (error) {
        console.error('Recommendations error:', error.response?.data || error.message);
        // Return empty array instead of error
        res.json({ success: false, tracks: [], message: 'Could not fetch recommendations' });
    }
});

// Search endpoint
router.post('/search', authMiddleware, async (req, res) => {
    try {
        const { query, limit = 12 } = req.body;
        const token = await getSpotifyToken();
        
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { q: query, type: 'track', limit: limit, market: 'US' }
        });
        
        const tracks = response.data.tracks.items.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls.spotify,
            albumArt: track.album.images[0]?.url || '',
            color: '#667eea'
        }));
        
        res.json({ success: true, tracks });
    } catch (error) {
        console.error('Search error:', error.message);
        res.json({ success: false, tracks: [] });
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