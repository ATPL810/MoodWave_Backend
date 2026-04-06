const axios = require('axios');

let cachedToken = null;
let tokenExpiry = null;

async function getSpotifyToken() {
    // Check if token is still valid
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedToken;
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
        
        cachedToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Expire 1 minute early
        
        return cachedToken;
        
    } catch (error) {
        console.error('Failed to get Spotify token:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { getSpotifyToken };