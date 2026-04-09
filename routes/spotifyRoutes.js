const express = require('express');
const axios = require('axios');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

// Spotify token cache
let spotifyToken = null;
let tokenExpiry = null;

async function getSpotifyToken() {
    // Check cache
    if (spotifyToken && tokenExpiry && Date.now() < tokenExpiry) {
        console.log('Using cached Spotify token');
        return spotifyToken;
    }
    
    try {
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        
        console.log('Fetching new Spotify token...');
        
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
        
        console.log('✅ Spotify token obtained successfully');
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
        
        console.log(`Fetching recommendations for mood: ${mood}`);
        
        // Map mood to seed genres
        const moodGenres = {
            'Happy': ['pop', 'dance', 'happy'],
            'Sad': ['acoustic', 'piano', 'sad'],
            'Energetic': ['edm', 'rock', 'work-out'],
            'Calm': ['chill', 'ambient', 'study'],
            'Stressed': ['meditation', 'classical', 'ambient'],
            'Neutral': ['pop', 'indie', 'alternative']
        };
        
        const genres = moodGenres[mood] || moodGenres.Neutral;
        const seedGenres = genres.slice(0, 2).join(',');
        
        const token = await getSpotifyToken();
        
        const response = await axios.get('https://api.spotify.com/v1/recommendations', {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                seed_genres: seedGenres,
                limit: Math.min(limit, 20),
                market: 'US'
            }
        });
        
        const tracks = response.data.tracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls.spotify,
            albumArt: track.album.images[0]?.url || '',
            popularity: track.popularity,
            color: getColorForMood(mood)
        }));
        
        console.log(`✅ Found ${tracks.length} Spotify tracks for ${mood}`);
        res.json({ success: true, tracks });
        
    } catch (error) {
        console.error('Spotify API error:', error.response?.data || error.message);
        // Return empty array instead of error
        res.json({ success: false, tracks: [], message: 'Spotify temporarily unavailable' });
    }
});

// Search endpoint as fallback
router.post('/search', authMiddleware, async (req, res) => {
    try {
        const { query, limit = 12 } = req.body;
        const token = await getSpotifyToken();
        
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { q: query, type: 'track', limit, market: 'US' }
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