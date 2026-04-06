const { getDb } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
    static getCollection() {
        const db = getDb();
        return db.collection('users');
    }
    
    static async create(userData) {
        const { username, email, password } = userData;
        const collection = this.getCollection();
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const user = {
            username,
            email,
            password: hashedPassword,
            createdAt: new Date(),
            lastLogin: null
        };
        
        const result = await collection.insertOne(user);
        return { _id: result.insertedId, username, email, createdAt: user.createdAt };
    }
    
    static async findByUsername(username) {
        const collection = this.getCollection();
        return await collection.findOne({ username });
    }
    
    static async findByEmail(email) {
        const collection = this.getCollection();
        return await collection.findOne({ email });
    }
    
    static async findById(id) {
        const { ObjectId } = require('mongodb');
        const collection = this.getCollection();
        return await collection.findOne({ _id: new ObjectId(id) });
    }
    
    static async updateLastLogin(id) {
        const { ObjectId } = require('mongodb');
        const collection = this.getCollection();
        return await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { lastLogin: new Date() } }
        );
    }
    
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}

module.exports = UserModel;