// test-db.js - Run with: node test-db.js

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testConnection() {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME;
    
    console.log('Testing MongoDB Atlas connection...');
    console.log(`Database: ${dbName}`);
    
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB Atlas!');
        
        const db = client.db(dbName);
        
        // Test insert
        const testCollection = db.collection('test');
        await testCollection.insertOne({ test: true, timestamp: new Date() });
        console.log('✅ Test write successful');
        
        // Test read
        const result = await testCollection.findOne({ test: true });
        console.log('✅ Test read successful:', result);
        
        // Clean up
        await testCollection.deleteMany({ test: true });
        console.log('✅ Test cleanup successful');
        
        // List all collections
        const collections = await db.listCollections().toArray();
        console.log('📁 Existing collections:', collections.map(c => c.name));
        
        console.log('\n🎉 Database is working perfectly!');
        
    } catch (error) {
        console.error('❌ Connection failed:', error);
    } finally {
        await client.close();
        console.log('Connection closed');
    }
}

testConnection();