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

// CORS - Allow your frontend
app.use(cors({
    origin: ['https://atp1810.github.io', 'http://localhost:5500', 'http://127.0.0.1:5500', 'https://atpl810.github.io'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'moodwave-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }
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
    res.json({ status: 'OK', message: 'MoodWave backend is running' });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'MoodWave API is running' });
});

// 404 handler - NO '*' wildcard! Use (req, res) instead
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
        console.log('✅ Database connected');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('Failed to start:', error);
        process.exit(1);
    }
}

startServer();