const express = require('express');
const axios = require('axios');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getSpotifyToken } = require('../utils/spotifyHelper');
const router = express.Router();

// Get recommendations based on mood
router.post('/recommendations', authMiddleware, async (req, res) => {
    try {
        const { mood } = req.body;
        
        // Map mood to Spotify seed genres and attributes
        const moodMapping = {
            'Happy': { genres: ['pop', 'dance', 'happy'], min_energy: 0.7, target_valence: 0.8 },
            'Sad': { genres: ['acoustic', 'sad', 'piano'], max_energy: 0.4, target_valence: 0.2 },
            'Energetic': { genres: ['edm', 'rock', 'work-out'], min_energy: 0.8, target_energy: 0.9 },
            'Calm': { genres: ['chill', 'ambient', 'study'], max_energy: 0.3, target_valence: 0.5 },
            'Stressed': { genres: ['meditation', 'ambient', 'classical'], max_energy: 0.3, target_valence: 0.6 }
        };
        
        const config = moodMapping[mood] || moodMapping['Happy'];
        
        // Get Spotify access token
        const accessToken = await getSpotifyToken();
        
        // Build query parameters
        const seedGenres = config.genres.slice(0, 3).join(',');
        let params = {
            seed_genres: seedGenres,
            limit: 12
        };
        
        if (config.min_energy) params.min_energy = config.min_energy;
        if (config.max_energy) params.max_energy = config.max_energy;
        if (config.target_valence) params.target_valence = config.target_valence;
        if (config.target_energy) params.target_energy = config.target_energy;
        
        // Call Spotify API
        const response = await axios.get('https://api.spotify.com/v1/recommendations', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: params
        });
        
        // Format tracks for frontend
        const tracks = response.data.tracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            albumArt: track.album.images[0]?.url || '',
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls.spotify,
            color: getColorForMood(mood)
        }));
        
        res.json({ success: true, tracks });
        
    } catch (error) {
        console.error('Spotify recommendations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch recommendations' });
    }
});

function getColorForMood(mood) {
    const colors = {
        'Happy': '#FFD700',
        'Sad': '#45B7D1',
        'Energetic': '#FF6B6B',
        'Calm': '#96CEB4',
        'Stressed': '#4ECDC4'
    };
    return colors[mood] || '#667eea';
}

module.exports = router;