const { MongoClient } = require('mongodb');
require('dotenv').config();

let db = null;
let client = null;

async function connectToDatabase() {
    if (db) return db;
    
    try {
        const uri = process.env.MONGODB_URI;
        const dbName = process.env.MONGODB_DB_NAME || 'moodwave';
        
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        
        // FIXED: Removed deprecated options for MongoDB driver v6+
        client = new MongoClient(uri);
        
        await client.connect();
        db = client.db(dbName);
        
        console.log(`✅ Connected to MongoDB: ${dbName}`);
        
        // Create indexes (wrapped in try-catch to handle existing indexes)
        try {
            await db.collection('users').createIndex({ username: 1 }, { unique: true });
            await db.collection('users').createIndex({ email: 1 }, { unique: true });
            await db.collection('mood_history').createIndex({ userId: 1 });
            await db.collection('mood_history').createIndex({ createdAt: -1 });
            console.log('✅ Database indexes created/verified');
        } catch (indexError) {
            // Indexes might already exist, that's fine
            console.log('ℹ️ Indexes already exist or creation skipped:', indexError.message);
        }
        
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call connectToDatabase() first.');
    }
    return db;
}

async function closeDatabase() {
    if (client) {
        await client.close();
        db = null;
        client = null;
        console.log('Database connection closed');
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    await closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeDatabase();
    process.exit(0);
});

module.exports = { connectToDatabase, getDb, closeDatabase };