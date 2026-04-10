const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const { connectToDatabase } = require('./config/database');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const moodRoutes = require('./routes/moodRoutes');
const spotifyRoutes = require('./routes/spotifyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - NO WILDCARD '*' in app.options
const allowedOrigins = [
    'https://atp1810.github.io',
    'https://atpl810.github.io',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        // Allow if origin is in allowed list or contains github.io
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('github.io')) {
            callback(null, true);
        } else {
            console.log('Blocked origin:', origin);
            // Temporarily allow all for testing
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Type', 'Authorization']
}));

// REMOVED the problematic line: app.options('*', cors());
// The cors middleware above already handles OPTIONS preflight requests

app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'moodwave-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        httpOnly: true,
        maxAge: 60 * 60 * 1000 
    }
}));

// Logging middleware
app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.url}`);
    next();
});

// Database connection middleware
app.use(async (req, res, next) => {
    try {
        if (!req.db) {
            req.db = await connectToDatabase();
        }
        next();
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ success: false, message: 'Database connection error' });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/spotify', spotifyRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'MoodWave backend is running',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'MoodWave API is running',
        endpoints: ['/api/auth', '/api/mood', '/api/spotify', '/api/health']
    });
});

// 404 handler - NO wildcard '*' here either
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
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();