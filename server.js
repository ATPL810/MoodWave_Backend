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

// ========== FIXED CORS CONFIGURATION ==========
const allowedOrigins = [
    process.env.FRONTEND_URL
].filter(Boolean); // Remove undefined values

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        
        // Check if origin is allowed
        const isAllowed = allowedOrigins.some(allowed => {
            if (!allowed) return false;
            // Exact match or starts with (for subpaths)
            return origin === allowed || origin.startsWith(allowed);
        });
        
        if (isAllowed) {
            console.log('✅ CORS allowed for:', origin);
            callback(null, true);
        } else {
            console.log('❌ CORS blocked for:', origin);
            console.log('Allowed origins:', allowedOrigins);
            callback(new Error('CORS not allowed'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    exposedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Rest of your middleware
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 60 * 60 * 1000 // 1 hour
    }
}));

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - Origin: ${req.headers.origin}`);
    next();
});

// Database connection middleware
let dbConnected = false;

app.use(async (req, res, next) => {
    if (!dbConnected) {
        try {
            const db = await connectToDatabase();
            req.db = db;
            dbConnected = true;
        } catch (error) {
            console.error('Database connection failed:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Database connection failed. Please try again later.' 
            });
        }
    }
    req.db = getDb();
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/spotify', spotifyRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        if (req.db) {
            await req.db.command({ ping: 1 });
        }
        res.json({ 
            status: 'OK', 
            message: 'MoodWave backend is running',
            database: 'connected',
            timestamp: new Date().toISOString(),
            cors: {
                allowedOrigins: allowedOrigins
            }
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            message: 'Database connection issue',
            database: 'disconnected'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({ 
        success: false, 
        message: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong!' 
            : err.message 
    });
});

// Start server
async function startServer() {
    try {
        await connectToDatabase();
        console.log('✅ Database connected successfully');
        console.log('✅ CORS allowed origins:', allowedOrigins);
        
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();