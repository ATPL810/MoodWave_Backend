const { MongoClient } = require('mongodb');

let client;
let db;

async function connectToDatabase() {
    if (db) return db;
    
    try {
        const uri = process.env.MONGODB_URI;
        const dbName = process.env.MONGODB_DB_NAME;
        
        client = new MongoClient(uri);
        await client.connect();
        db = client.db(dbName);
        
        // Create indexes for better performance
        await db.collection('users').createIndex({ username: 1 }, { unique: true });
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('mood_history').createIndex({ userId: 1, createdAt: -1 });
        
        return db;
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}

module.exports = { connectToDatabase, getDb };