const express = require('express');
const axios = require('axios');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

let spotifyToken = null;
let tokenExpiry = null;

async function getSpotifyToken() {
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
        throw error;
    }
}

// Search tracks by mood keywords
router.post('/recommendations', authMiddleware, async (req, res) => {
    try {
        const { mood, confidence, limit = 12 } = req.body;
        
        // Search queries for each mood
        const searchQueries = {
            'Happy': 'happy upbeat pop dance',
            'Sad': 'sad emotional acoustic piano',
            'Energetic': 'workout energetic rock edm',
            'Calm': 'calm relaxing ambient peaceful',
            'Stressed': 'meditation relaxing classical calm',
            'Neutral': 'popular music hits'
        };
        
        const query = searchQueries[mood] || searchQueries.Neutral;
        const token = await getSpotifyToken();
        
        // Search instead of recommendations (more reliable)
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
                q: query,
                type: 'track',
                limit: limit,
                market: 'US'
            }
        });
        
        const tracks = response.data.tracks.items.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls.spotify,
            albumArt: track.album.images[0]?.url || '',
            popularity: track.popularity,
            color: getColorForMood(mood)
        }));
        
        console.log(`✅ Found ${tracks.length} tracks for mood: ${mood}`);
        res.json({ success: true, tracks });
        
    } catch (error) {
        console.error('Spotify error:', error.response?.data || error.message);
        // Return mock tracks as last resort
        const mockTracks = getMockTracks(req.body.mood);
        res.json({ success: true, tracks: mockTracks, mock: true });
    }
});

function getMockTracks(mood) {
    const mockData = {
        'Happy': [
            { id: '1', name: 'Happy', artist: 'Pharrell Williams', previewUrl: 'https://p.scdn.co/mp3-preview/1e6a5c6b8f9e4d2a8b7c6d5e4f3a2b1c', color: '#FFD700' },
            { id: '2', name: 'Can\'t Stop The Feeling', artist: 'Justin Timberlake', color: '#FF6B6B' },
            { id: '3', name: 'Uptown Funk', artist: 'Mark Ronson', color: '#4ECDC4' }
        ],
        'Sad': [
            { id: '4', name: 'Someone Like You', artist: 'Adele', color: '#45B7D1' },
            { id: '5', name: 'Fix You', artist: 'Coldplay', color: '#96CEB4' }
        ],
        'Energetic': [
            { id: '6', name: 'Eye of the Tiger', artist: 'Survivor', color: '#FF6B6B' },
            { id: '7', name: 'Stronger', artist: 'Kanye West', color: '#4ECDC4' }
        ],
        'Calm': [
            { id: '8', name: 'Weightless', artist: 'Marconi Union', color: '#96CEB4' },
            { id: '9', name: 'Clair de Lune', artist: 'Debussy', color: '#FFEAA7' }
        ],
        'Stressed': [
            { id: '10', name: 'Here Comes The Sun', artist: 'The Beatles', color: '#4ECDC4' },
            { id: '11', name: 'Three Little Birds', artist: 'Bob Marley', color: '#45B7D1' }
        ]
    };
    return mockData[mood] || mockData.Happy;
}

function getColorForMood(mood) {
    const colors = {
        'Happy': '#FFD700', 'Sad': '#45B7D1', 'Energetic': '#FF6B6B',
        'Calm': '#96CEB4', 'Stressed': '#4ECDC4', 'Neutral': '#667eea'
    };
    return colors[mood] || '#667eea';
}

module.exports = router;