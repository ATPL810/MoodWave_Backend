const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const { connectToDatabase, getDb } = require('./config/database');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const moodRoutes = require('./routes/moodRoutes');
const spotifyRoutes = require('./routes/spotifyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ========== SIMPLE CORS CONFIGURATION (NO COMPLEX PATTERNS) ==========
app.use(cors({
    origin: true,  // This allows any origin temporarily - we'll restrict later
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic middleware
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'moodwave-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,  // Set to true only if using HTTPS
        httpOnly: true,
        maxAge: 60 * 60 * 1000
    }
}));

// Simple request logger
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
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
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            mood: '/api/mood',
            spotify: '/api/spotify'
        }
    });
});

// 404 handler - MUST be after all routes
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: `Route ${req.method} ${req.url} not found` 
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ 
        success: false, 
        message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message 
    });
});

// Start server
async function startServer() {
    try {
        await connectToDatabase();
        console.log('✅ Database connected');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(` Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start:', error.message);
        process.exit(1);
    }
}

startServer();