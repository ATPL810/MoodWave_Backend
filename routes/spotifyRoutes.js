const express = require('express');
const axios = require('axios');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let spotifyToken = null;
let tokenExpiry = null;

async function getSpotifyToken() {
    if (spotifyToken && tokenExpiry && Date.now() < tokenExpiry) {
        return spotifyToken;
    }
    
    try {
        const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        
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

// Expanded mock tracks for each mood (fallback when Spotify fails)
const MOCK_TRACKS = {
    Happy: [
        { id: 'h1', name: 'Happy', artist: 'Pharrell Williams', albumArt: '', externalUrl: 'https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCH', color: '#FFD700' },
        { id: 'h2', name: 'Walking On Sunshine', artist: 'Katrina & The Waves', albumArt: '', externalUrl: 'https://open.spotify.com/track/05wIrZSwuaVWhcv5FfqeH0', color: '#FFD700' },
        { id: 'h3', name: 'Can\'t Stop The Feeling', artist: 'Justin Timberlake', albumArt: '', externalUrl: 'https://open.spotify.com/track/77j6af0Q5PqH2Xh8Wq0O5K', color: '#FFD700' },
        { id: 'h4', name: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', albumArt: '', externalUrl: 'https://open.spotify.com/track/32OlwWuMpZ6b0aN2RZOeMS', color: '#FFD700' },
        { id: 'h5', name: 'I Gotta Feeling', artist: 'Black Eyed Peas', albumArt: '', externalUrl: 'https://open.spotify.com/track/2H1047e0oMSj10dgp7p2VG', color: '#FFD700' },
        { id: 'h6', name: 'Shake It Off', artist: 'Taylor Swift', albumArt: '', externalUrl: 'https://open.spotify.com/track/2oq5dRcvN2eRJ0yD8D0D0D', color: '#FFD700' }
    ],
    Sad: [
        { id: 's1', name: 'Someone Like You', artist: 'Adele', albumArt: '', externalUrl: 'https://open.spotify.com/track/3bNv3VuUOKgrf5hu3YcuRo', color: '#45B7D1' },
        { id: 's2', name: 'Fix You', artist: 'Coldplay', albumArt: '', externalUrl: 'https://open.spotify.com/track/7LVHVU3tWfcxj5aiPFEW4Q', color: '#45B7D1' },
        { id: 's3', name: 'All I Want', artist: 'Kodaline', albumArt: '', externalUrl: 'https://open.spotify.com/track/0NlGoUyOJSuSHmngoibVAs', color: '#45B7D1' },
        { id: 's4', name: 'Say Something', artist: 'A Great Big World', albumArt: '', externalUrl: 'https://open.spotify.com/track/6Vc5wAMmXdKIAM7WUoEb7N', color: '#45B7D1' },
        { id: 's5', name: 'Skinny Love', artist: 'Bon Iver', albumArt: '', externalUrl: 'https://open.spotify.com/track/3B3eOgLJSqPEA0RfboIQVM', color: '#45B7D1' },
        { id: 's6', name: 'The Night We Met', artist: 'Lord Huron', albumArt: '', externalUrl: 'https://open.spotify.com/track/0QZ5yyl6B6utIWkxeBDxQN', color: '#45B7D1' }
    ],
    Energetic: [
        { id: 'e1', name: 'Eye of the Tiger', artist: 'Survivor', albumArt: '', externalUrl: 'https://open.spotify.com/track/2KH16WveTQWT6KOG9Rg6e2', color: '#FF6B6B' },
        { id: 'e2', name: 'Stronger', artist: 'Kanye West', albumArt: '', externalUrl: 'https://open.spotify.com/track/0j2T0R9dR9qdJYsB7ciXhf', color: '#FF6B6B' },
        { id: 'e3', name: 'Thunderstruck', artist: 'AC/DC', albumArt: '', externalUrl: 'https://open.spotify.com/track/57bgtoPSgt236HzfBOd8kj', color: '#FF6B6B' },
        { id: 'e4', name: 'Don\'t Stop Me Now', artist: 'Queen', albumArt: '', externalUrl: 'https://open.spotify.com/track/5T8EDUDqKcs6OSOwEsfqG7', color: '#FF6B6B' },
        { id: 'e5', name: 'Levels', artist: 'Avicii', albumArt: '', externalUrl: 'https://open.spotify.com/track/5UqCQaDshqbIk3pkhy4Pjg', color: '#FF6B6B' },
        { id: 'e6', name: 'Titanium', artist: 'David Guetta ft. Sia', albumArt: '', externalUrl: 'https://open.spotify.com/track/0lQn50x1bzkr2RcN8JwJjU', color: '#FF6B6B' },
        { id: 'e7', name: 'Believer', artist: 'Imagine Dragons', albumArt: '', externalUrl: 'https://open.spotify.com/track/0pqnGHJpmpxLKifKRmU6WP', color: '#FF6B6B' },
        { id: 'e8', name: 'Can\'t Hold Us', artist: 'Macklemore & Ryan Lewis', albumArt: '', externalUrl: 'https://open.spotify.com/track/3bidbhpOYeV4knp8AIu8Xn', color: '#FF6B6B' }
    ],
    Calm: [
        { id: 'c1', name: 'Weightless', artist: 'Marconi Union', albumArt: '', externalUrl: 'https://open.spotify.com/track/4c1Hj1QxN8K8K8K8K8K8K8', color: '#96CEB4' },
        { id: 'c2', name: 'Clair de Lune', artist: 'Claude Debussy', albumArt: '', externalUrl: 'https://open.spotify.com/track/5hxukp7zZrA2cWf1Uq1Yg4', color: '#96CEB4' },
        { id: 'c3', name: 'River Flows In You', artist: 'Yiruma', albumArt: '', externalUrl: 'https://open.spotify.com/track/3x7Ni6n4X0gK0gK0gK0gK0', color: '#96CEB4' },
        { id: 'c4', name: 'Gymnopédie No.1', artist: 'Erik Satie', albumArt: '', externalUrl: 'https://open.spotify.com/track/5NGtFXVpXSvwunEIGeviY3', color: '#96CEB4' },
        { id: 'c5', name: 'Holocene', artist: 'Bon Iver', albumArt: '', externalUrl: 'https://open.spotify.com/track/1ILEKd4NUJKBn7dRc7c7c7', color: '#96CEB4' },
        { id: 'c6', name: 'Bloom', artist: 'The Paper Kites', albumArt: '', externalUrl: 'https://open.spotify.com/track/0k0k0k0k0k0k0k0k0k0k0', color: '#96CEB4' }
    ],
    Stressed: [
        { id: 't1', name: 'Breathe Me', artist: 'Sia', albumArt: '', externalUrl: 'https://open.spotify.com/track/5hxukp7zZrA2cWf1Uq1Yg4', color: '#4ECDC4' },
        { id: 't2', name: 'Three Little Birds', artist: 'Bob Marley', albumArt: '', externalUrl: 'https://open.spotify.com/track/3bNv3VuUOKgrf5hu3YcuRo', color: '#4ECDC4' },
        { id: 't3', name: 'Let It Be', artist: 'The Beatles', albumArt: '', externalUrl: 'https://open.spotify.com/track/0j2T0R9dR9qdJYsB7ciXhf', color: '#4ECDC4' },
        { id: 't4', name: 'Here Comes The Sun', artist: 'The Beatles', albumArt: '', externalUrl: 'https://open.spotify.com/track/6dGnYIeXmHdcikdzNNDMm2', color: '#4ECDC4' },
        { id: 't5', name: 'What A Wonderful World', artist: 'Louis Armstrong', albumArt: '', externalUrl: 'https://open.spotify.com/track/29U7stRjqHU6rMiS8BfaI9', color: '#4ECDC4' },
        { id: 't6', name: 'Somewhere Over The Rainbow', artist: 'Israel Kamakawiwo\'ole', albumArt: '', externalUrl: 'https://open.spotify.com/track/0lQn50x1bzkr2RcN8JwJjU', color: '#4ECDC4' },
        { id: 't7', name: 'Hallelujah', artist: 'Jeff Buckley', albumArt: '', externalUrl: 'https://open.spotify.com/track/3pR5f8f8f8f8f8f8f8f8f8', color: '#4ECDC4' },
        { id: 't8', name: 'The Sound of Silence', artist: 'Simon & Garfunkel', albumArt: '', externalUrl: 'https://open.spotify.com/track/4hNhWrq5hNhWrq5hNhWrq5', color: '#4ECDC4' }
    ],
    Neutral: [
        { id: 'n1', name: 'Blinding Lights', artist: 'The Weeknd', albumArt: '', externalUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b', color: '#667eea' },
        { id: 'n2', name: 'Shape of You', artist: 'Ed Sheeran', albumArt: '', externalUrl: 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3', color: '#667eea' },
        { id: 'n3', name: 'Stay', artist: 'The Kid LAROI & Justin Bieber', albumArt: '', externalUrl: 'https://open.spotify.com/track/5PjdY0CKGZdEuoNab3yDmX', color: '#667eea' },
        { id: 'n4', name: 'Levitating', artist: 'Dua Lipa', albumArt: '', externalUrl: 'https://open.spotify.com/track/39LLxExYz6ewLAcYrzQQyP', color: '#667eea' },
        { id: 'n5', name: 'As It Was', artist: 'Harry Styles', albumArt: '', externalUrl: 'https://open.spotify.com/track/4Dvkj6JhhA12EX05fT7y2e', color: '#667eea' },
        { id: 'n6', name: 'Flowers', artist: 'Miley Cyrus', albumArt: '', externalUrl: 'https://open.spotify.com/track/4aK6J1x5t7t7t7t7t7t7t7', color: '#667eea' }
    ]
};

// Map moods to Spotify genres and audio features
const MOOD_CONFIG = {
    Happy: {
        seed_genres: 'pop,dance,disco,funk',
        target_valence: 0.8,
        target_energy: 0.7,
        min_valence: 0.6,
        target_danceability: 0.7
    },
    Sad: {
        seed_genres: 'sad,acoustic,blues,soul',
        target_valence: 0.2,
        target_energy: 0.3,
        max_valence: 0.4,
        max_energy: 0.5
    },
    Energetic: {
        seed_genres: 'rock,edm,workout,metal,electronic',
        target_energy: 0.9,
        target_valence: 0.6,
        min_energy: 0.7,
        target_tempo: 140
    },
    Calm: {
        seed_genres: 'ambient,classical,chill,piano',
        target_energy: 0.2,
        target_valence: 0.5,
        max_energy: 0.4,
        target_acousticness: 0.8
    },
    Stressed: {
        seed_genres: 'ambient,meditation,piano,acoustic',
        target_energy: 0.3,
        target_valence: 0.4,
        max_energy: 0.5,
        target_instrumentalness: 0.7
    }
};

router.post('/recommendations', authMiddleware, async (req, res) => {
    try {
        const { mood, confidence, limit = 12 } = req.body;
        const config = MOOD_CONFIG[mood] || MOOD_CONFIG.Neutral;
        
        // Try Spotify first
        try {
            const token = await getSpotifyToken();
            
            const response = await axios.get('https://api.spotify.com/v1/recommendations', {
                headers: { 'Authorization': `Bearer ${token}` },
                params: {
                    limit: limit,
                    market: 'US',
                    seed_genres: config.seed_genres,
                    target_valence: config.target_valence,
                    target_energy: config.target_energy,
                    min_valence: config.min_valence,
                    max_valence: config.max_valence,
                    min_energy: config.min_energy,
                    max_energy: config.max_energy,
                    target_danceability: config.target_danceability,
                    target_tempo: config.target_tempo,
                    target_acousticness: config.target_acousticness,
                    target_instrumentalness: config.target_instrumentalness
                }
            });
            
            if (response.data.tracks && response.data.tracks.length > 0) {
                const tracks = response.data.tracks.map(track => ({
                    id: track.id,
                    name: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    albumArt: track.album.images[0]?.url || '',
                    previewUrl: track.preview_url,
                    externalUrl: track.external_urls.spotify,
                    color: getColorForMood(mood)
                }));
                
                console.log(`✅ Found ${tracks.length} Spotify tracks for mood: ${mood}`);
                return res.json({ success: true, tracks, source: 'spotify' });
            }
        } catch (spotifyError) {
            console.error('Spotify API error:', spotifyError.response?.data || spotifyError.message);
        }
        
        // Fallback to mock tracks
        const mockTracks = MOCK_TRACKS[mood] || MOCK_TRACKS.Neutral;
        const shuffled = [...mockTracks].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, limit);
        
        console.log(`📦 Using ${selected.length} mock tracks for mood: ${mood}`);
        res.json({ success: true, tracks: selected, source: 'mock' });
        
    } catch (error) {
        console.error('Recommendations error:', error);
        const fallbackTracks = MOCK_TRACKS.Neutral.slice(0, limit);
        res.json({ success: true, tracks: fallbackTracks, source: 'fallback' });
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