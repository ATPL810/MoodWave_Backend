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

// Search tracks by mood
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
        
        // Search for tracks
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
                q: query,
                type: 'track',
                limit: limit,
                market: 'US'
            }
        });
        
        // Get audio features for each track
        const trackIds = response.data.tracks.items.map(track => track.id).join(',');
        let audioFeaturesMap = {};
        
        if (trackIds) {
            const featuresResponse = await axios.get('https://api.spotify.com/v1/audio-features', {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { ids: trackIds }
            });
            
            featuresResponse.data.audio_features.forEach(feature => {
                if (feature) {
                    audioFeaturesMap[feature.id] = {
                        valence: feature.valence,
                        energy: feature.energy,
                        danceability: feature.danceability,
                        tempo: feature.tempo
                    };
                }
            });
        }
        
        const tracks = response.data.tracks.items.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            albumArt: track.album.images[0]?.url || '',
            previewUrl: track.preview_url,
            spotifyUri: track.uri,
            externalUrl: track.external_urls.spotify,
            audioFeatures: audioFeaturesMap[track.id] || null,
            color: getColorForMood(mood)
        }));
        
        console.log(`✅ Found ${tracks.length} Spotify tracks for mood: ${mood}`);
        res.json({ success: true, tracks });
        
    } catch (error) {
        console.error('Spotify error:', error.response?.data || error.message);
        res.json({ success: false, tracks: [], error: error.message });
    }
});

// Get track by ID
router.get('/track/:trackId', authMiddleware, async (req, res) => {
    try {
        const { trackId } = req.params;
        const token = await getSpotifyToken();
        
        const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        res.json({ success: true, track: response.data });
    } catch (error) {
        console.error('Track error:', error.message);
        res.json({ success: false, error: error.message });
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