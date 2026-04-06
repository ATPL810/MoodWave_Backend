const { MongoClient } = require('mongodb');

let client;
let db;
let isConnected = false;

async function connectToDatabase() {
    // Return existing connection if already connected
    if (db && isConnected) {
        console.log('Using existing database connection');
        return db;
    }
    
    try {
        const uri = process.env.MONGODB_URI;
        const dbName = process.env.MONGODB_DB_NAME;
        
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        
        console.log('Connecting to MongoDB Atlas...');
        
        // Create MongoDB client with options for better performance
        client = new MongoClient(uri, {
            maxPoolSize: 10,           // Maximum number of connections in pool
            minPoolSize: 2,            // Minimum number of connections
            maxIdleTimeMS: 60000,      // How long a connection can stay idle
            connectTimeoutMS: 10000,   // Connection timeout
            socketTimeoutMS: 45000,    // Socket timeout
            serverSelectionTimeoutMS: 5000  // Server selection timeout
        });
        
        // Connect to the database
        await client.connect();
        
        // Select the database
        db = client.db(dbName);
        isConnected = true;
        
        console.log(`Successfully connected to MongoDB Atlas database: ${dbName}`);
        
        // Test the connection by listing collections
        const collections = await db.listCollections().toArray();
        console.log(`Available collections: ${collections.map(c => c.name).join(', ') || 'none yet'}`);
        
        // Create indexes for better query performance
        await createIndexes();
        
        return db;
        
    } catch (error) {
        console.error('MongoDB Atlas connection failed:', error);
        isConnected = false;
        throw error;
    }
}

async function createIndexes() {
    if (!db) return;
    
    try {
        // Users collection indexes
        const usersCollection = db.collection('users');
        await usersCollection.createIndex({ username: 1 }, { unique: true });
        await usersCollection.createIndex({ email: 1 }, { unique: true });
        console.log('✅ Users collection indexes created');
        
        // Mood history collection indexes
        const moodHistoryCollection = db.collection('mood_history');
        await moodHistoryCollection.createIndex({ userId: 1, createdAt: -1 });
        await moodHistoryCollection.createIndex({ createdAt: -1 });
        console.log('✅ Mood history collection indexes created');
        
    } catch (error) {
        console.error('Index creation warning:', error);
        // Indexes might already exist, continue anyway
    }
}

function getDb() {
    if (!db || !isConnected) {
        throw new Error('Database not initialized. Call connectToDatabase() first.');
    }
    return db;
}

async function closeDatabase() {
    if (client) {
        await client.close();
        isConnected = false;
        db = null;
        console.log('Database connection closed');
    }
}

// Handle application shutdown gracefully
process.on('SIGINT', async () => {
    console.log('Received SIGINT. Closing database connection...');
    await closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Closing database connection...');
    await closeDatabase();
    process.exit(0);
});

module.exports = { connectToDatabase, getDb, closeDatabase };