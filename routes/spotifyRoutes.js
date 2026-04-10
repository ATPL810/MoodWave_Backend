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

// Get recommendations based on mood and audio features
router.post('/recommendations', authMiddleware, async (req, res) => {
    try {
        const { mood, confidence, valence, energy, danceability } = req.body;
        
        // Map mood to audio features (valence = happiness, energy = intensity)
        const moodFeatures = {
            'Happy': { target_valence: 0.8, target_energy: 0.7, target_danceability: 0.7 },
            'Sad': { target_valence: 0.2, target_energy: 0.3, target_danceability: 0.4 },
            'Energetic': { target_valence: 0.6, target_energy: 0.9, target_danceability: 0.7 },
            'Calm': { target_valence: 0.5, target_energy: 0.2, target_danceability: 0.3 },
            'Stressed': { target_valence: 0.4, target_energy: 0.4, target_danceability: 0.5 },
            'Neutral': { target_valence: 0.5, target_energy: 0.5, target_danceability: 0.5 }
        };
        
        const features = moodFeatures[mood] || moodFeatures.Neutral;
        
        // Adjust based on confidence score
        const confidenceAdjustment = (confidence - 50) / 100;
        const adjustedValence = Math.min(0.95, Math.max(0.05, features.target_valence + confidenceAdjustment * 0.2));
        const adjustedEnergy = Math.min(0.95, Math.max(0.05, features.target_energy + confidenceAdjustment * 0.15));
        
        const token = await getSpotifyToken();
        
        // Get recommendations with audio features
        const response = await axios.get('https://api.spotify.com/v1/recommendations', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
                seed_genres: getGenresForMood(mood),
                target_valence: adjustedValence,
                target_energy: adjustedEnergy,
                target_danceability: features.target_danceability,
                limit: 15,
                market: 'US'
            }
        });
        
        // Get audio features for each track
        const trackIds = response.data.tracks.map(track => track.id).join(',');
        const audioFeaturesResponse = await axios.get('https://api.spotify.com/v1/audio-features', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { ids: trackIds }
        });
        
        const audioFeaturesMap = {};
        audioFeaturesResponse.data.audio_features.forEach(feature => {
            if (feature) {
                audioFeaturesMap[feature.id] = {
                    valence: feature.valence,
                    energy: feature.energy,
                    danceability: feature.danceability,
                    tempo: feature.tempo,
                    acousticness: feature.acousticness
                };
            }
        });
        
        const tracks = response.data.tracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            albumArt: track.album.images[0]?.url || '',
            spotifyUri: track.uri,
            previewUrl: track.preview_url,
            externalUrl: track.external_urls.spotify,
            audioFeatures: audioFeaturesMap[track.id] || null,
            color: getColorForMood(mood)
        }));
        
        console.log(`✅ Found ${tracks.length} tracks for mood: ${mood} (valence: ${adjustedValence}, energy: ${adjustedEnergy})`);
        res.json({ success: true, tracks });
        
    } catch (error) {
        console.error('Spotify error:', error.response?.data || error.message);
        res.json({ success: false, tracks: [], error: error.message });
    }
});

// Get audio features for a specific track
router.get('/track-features/:trackId', authMiddleware, async (req, res) => {
    try {
        const { trackId } = req.params;
        const token = await getSpotifyToken();
        
        const response = await axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        res.json({ success: true, features: response.data });
    } catch (error) {
        console.error('Audio features error:', error.message);
        res.json({ success: false, error: error.message });
    }
});

function getGenresForMood(mood) {
    const genres = {
        'Happy': 'pop,dance',
        'Sad': 'acoustic,piano',
        'Energetic': 'edm,rock',
        'Calm': 'chill,ambient',
        'Stressed': 'classical,meditation',
        'Neutral': 'pop,indie'
    };
    return genres[mood] || 'pop';
}

function getColorForMood(mood) {
    const colors = {
        'Happy': '#FFD700', 'Sad': '#45B7D1', 'Energetic': '#FF6B6B',
        'Calm': '#96CEB4', 'Stressed': '#4ECDC4', 'Neutral': '#667eea'
    };
    return colors[mood] || '#667eea';
}

module.exports = router;