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
        
        client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        
        await client.connect();
        db = client.db(dbName);
        
        console.log(`✅ Connected to MongoDB: ${dbName}`);
        
        // Create indexes
        await db.collection('users').createIndex({ username: 1 }, { unique: true });
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('mood_history').createIndex({ userId: 1 });
        await db.collection('mood_history').createIndex({ createdAt: -1 });
        
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

module.exports = { connectToDatabase, getDb, closeDatabase };