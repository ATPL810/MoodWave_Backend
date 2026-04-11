const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const { connectToDatabase, getDb } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
    'https://atpl810.github.io',
    'https://atpl810.github.io/MoodWave',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5000'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        // Check if origin is allowed
        if (allowedOrigins.includes(origin) || origin.includes('github.io')) {
            callback(null, true);
        } else {
            console.log('Blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());
// Session configuration with production-ready settings
app.use(session({
    secret: process.env.SESSION_SECRET || 'moodwave_super_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 60 * 60 * 1000, // 1 hour
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
    // Suppress the memory store warning since we're fine with it for now
    // For production scale, you'd use connect-mongo or redis
    store: new session.MemoryStore()
}));

// Logging middleware
app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
    next();
});

// Database connection middleware
app.use(async (req, res, next) => {
    try {
        if (!getDb()) {
            await connectToDatabase();
        }
        next();
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ success: false, message: 'Database connection error' });
    }
});

// Routes
const authRoutes = require('./routes/authRoutes');
const moodRoutes = require('./routes/moodRoutes');
const spotifyRoutes = require('./routes/spotifyRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/spotify', spotifyRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'MoodWave backend is running',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'MoodWave API is running',
        endpoints: ['/api/auth', '/api/mood', '/api/spotify', '/api/health']
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
});

async function startServer() {
    try {
        await connectToDatabase();
        console.log('✅ Database connected successfully');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🌐 Allowed origins:`, allowedOrigins);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;