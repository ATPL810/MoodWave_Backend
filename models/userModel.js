const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

class UserModel {
    static getCollection() {
        const db = getDb();
        return db.collection('users');
    }
    
    static async create(userData) {
        const { username, email, password } = userData;
        const collection = this.getCollection();
        
        // Hash password with salt rounds = 10
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const user = {
            username: username.toLowerCase().trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            createdAt: new Date(),
            lastLogin: null,
            moodCount: 0,
            preferences: {
                theme: 'light',
                notifications: true
            }
        };
        
        const result = await collection.insertOne(user);
        
        // Return user without password
        return {
            _id: result.insertedId,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt
        };
    }
    
    static async findByUsername(username) {
        const collection = this.getCollection();
        return await collection.findOne({ username: username.toLowerCase().trim() });
    }
    
    static async findByEmail(email) {
        const collection = this.getCollection();
        return await collection.findOne({ email: email.toLowerCase().trim() });
    }
    
    static async findById(id) {
        const collection = this.getCollection();
        try {
            return await collection.findOne({ _id: new ObjectId(id) });
        } catch (error) {
            console.error('Invalid ObjectId:', id);
            return null;
        }
    }
    
    static async updateLastLogin(id) {
        const collection = this.getCollection();
        return await collection.updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { lastLogin: new Date() },
                $inc: { moodCount: 1 }
            }
        );
    }
    
    static async updatePreferences(id, preferences) {
        const collection = this.getCollection();
        return await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { preferences } }
        );
    }
    
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
    
    static async deleteUser(id) {
        const collection = this.getCollection();
        
        // Also delete user's mood history
        const moodCollection = getDb().collection('mood_history');
        await moodCollection.deleteMany({ userId: id });
        
        return await collection.deleteOne({ _id: new ObjectId(id) });
    }
}

module.exports = UserModel;