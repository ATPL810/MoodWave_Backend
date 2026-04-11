const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

// Spotify credentials
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'https://moodwave-backend-4.onrender.com/api/spotify/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://atpl810.github.io/MoodWave';

// Store tokens (in production, use database)
const userTokens = new Map();

// Generate random state for security
function generateState() {
    return Math.random().toString(36).substring(2, 15);
}

// Login - redirect to Spotify auth
router.get('/login', (req, res) => {
    const state = generateState();
    const scope = 'user-read-private user-read-email streaming user-modify-playback-state user-read-playback-state';
    
    const authUrl = 'https://accounts.spotify.com/authorize?' + querystring.stringify({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI,
        state: state
    });
    
    res.json({ success: true, authUrl });
});

// Callback from Spotify
router.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const error = req.query.error || null;
    
    if (error) {
        console.error('Spotify auth error:', error);
        return res.redirect(`${FRONTEND_URL}/?spotify_error=${error}`);
    }
    
    if (!code) {
        return res.redirect(`${FRONTEND_URL}/?spotify_error=no_code`);
    }
    
    try {
        const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        
        const response = await axios.post('https://accounts.spotify.com/api/token',
            querystring.stringify({
                code: code,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            }),
            {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        const { access_token, refresh_token, expires_in } = response.data;
        
        // Store tokens (in production, associate with user)
        const tokenId = generateState();
        userTokens.set(tokenId, {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: Date.now() + (expires_in * 1000)
        });
        
        // Redirect to frontend with success
        res.redirect(`${FRONTEND_URL}/?spotify_connected=true`);
        
    } catch (error) {
        console.error('Token exchange error:', error.response?.data || error.message);
        res.redirect(`${FRONTEND_URL}/?spotify_error=token_exchange_failed`);
    }
});

// Check connection status
router.get('/status', (req, res) => {
    const connected = userTokens.size > 0;
    res.json({ success: true, connected });
});

// Get client credentials token (fallback)
async function getClientCredentialsToken() {
    try {
        const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        
        const response = await axios.post('https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        return response.data.access_token;
    } catch (error) {
        console.error('Client credentials error:', error.response?.data || error.message);
        throw error;
    }
}

// Get user token
function getUserToken() {
    const firstToken = userTokens.values().next().value;
    return firstToken?.accessToken || null;
}

// Search tracks by mood
router.post('/recommendations', authMiddleware, async (req, res) => {
    try {
        const { mood, confidence, limit = 12 } = req.body;
        
        // Map moods to Spotify audio features
        const moodParams = {
            'Happy': { target_valence: 0.8, target_energy: 0.7, min_valence: 0.6 },
            'Sad': { target_valence: 0.2, target_energy: 0.3, max_valence: 0.4 },
            'Energetic': { target_energy: 0.9, target_valence: 0.6, min_energy: 0.7 },
            'Calm': { target_energy: 0.2, target_valence: 0.5, max_energy: 0.4 },
            'Stressed': { target_energy: 0.3, target_valence: 0.4, max_energy: 0.5 }
        };
        
        const params = moodParams[mood] || { target_valence: 0.5, target_energy: 0.5 };
        
        // Get token (user token preferred, fallback to client credentials)
        let token = getUserToken();
        if (!token) {
            token = await getClientCredentialsToken();
        }
        
        // Get recommendations based on audio features
        const response = await axios.get('https://api.spotify.com/v1/recommendations', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
                limit: limit,
                market: 'US',
                seed_genres: getGenresForMood(mood),
                ...params
            }
        });
        
        const tracks = response.data.tracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            albumArt: track.album.images[0]?.url || '',
            previewUrl: track.preview_url,
            spotifyUri: track.uri,
            externalUrl: track.external_urls.spotify,
            color: getColorForMood(mood)
        }));
        
        console.log(`✅ Found ${tracks.length} Spotify tracks for mood: ${mood}`);
        res.json({ success: true, tracks });
        
    } catch (error) {
        console.error('Spotify recommendations error:', error.response?.data || error.message);
        
        // If token expired, clear and retry once
        if (error.response?.status === 401) {
            userTokens.clear();
            try {
                const token = await getClientCredentialsToken();
                const response = await axios.get('https://api.spotify.com/v1/recommendations', {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { limit: limit || 12, market: 'US', seed_genres: 'pop' }
                });
                
                const tracks = response.data.tracks.map(track => ({
                    id: track.id,
                    name: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    albumArt: track.album.images[0]?.url || '',
                    previewUrl: track.preview_url,
                    externalUrl: track.external_urls.spotify,
                    color: getColorForMood(mood)
                }));
                
                return res.json({ success: true, tracks });
            } catch (retryError) {
                console.error('Retry failed:', retryError.message);
            }
        }
        
        res.json({ success: false, tracks: [], error: error.message });
    }
});

function getGenresForMood(mood) {
    const genreMap = {
        'Happy': 'pop,dance,disco',
        'Sad': 'sad,acoustic,blues',
        'Energetic': 'rock,edm,workout',
        'Calm': 'ambient,classical,chill',
        'Stressed': 'ambient,meditation,piano'
    };
    return genreMap[mood] || 'pop';
}

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