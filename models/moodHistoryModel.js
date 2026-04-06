const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');

class MoodHistoryModel {
    static getCollection() {
        const db = getDb();
        return db.collection('mood_history');
    }
    
    static async saveMood(userId, moodData) {
        const collection = this.getCollection();
        
        const moodEntry = {
            userId: new ObjectId(userId),
            mood: moodData.mood,
            confidence: moodData.confidence,
            description: moodData.description || '',
            facialMood: moodData.facialMood || null,
            voiceMood: moodData.voiceMood || null,
            textMood: moodData.textMood || null,
            createdAt: new Date()
        };
        
        const result = await collection.insertOne(moodEntry);
        return result;
    }
    
    static async getUserMoodHistory(userId, limit = 20) {
        const collection = this.getCollection();
        
        const history = await collection
            .find({ userId: new ObjectId(userId) })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
        
        return history.map(entry => ({
            id: entry._id,
            mood: entry.mood,
            confidence: entry.confidence,
            description: entry.description,
            time: entry.createdAt,
            formattedTime: entry.createdAt.toLocaleTimeString(),
            formattedDate: entry.createdAt.toLocaleDateString()
        }));
    }
    
    static async getMoodStats(userId) {
        const collection = this.getCollection();
        
        const stats = await collection.aggregate([
            { $match: { userId: new ObjectId(userId) } },
            { 
                $group: {
                    _id: '$mood',
                    count: { $sum: 1 },
                    avgConfidence: { $avg: '$confidence' },
                    lastOccurrence: { $max: '$createdAt' }
                }
            },
            { $sort: { count: -1 } }
        ]).toArray();
        
        const total = stats.reduce((sum, s) => sum + s.count, 0);
        
        return {
            totalEntries: total,
            moods: stats.map(s => ({
                mood: s._id,
                count: s.count,
                percentage: Math.round((s.count / total) * 100),
                avgConfidence: Math.round(s.avgConfidence),
                lastOccurrence: s.lastOccurrence
            }))
        };
    }
    
    static async getWeeklyMoodTrend(userId) {
        const collection = this.getCollection();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const trend = await collection.aggregate([
            { 
                $match: { 
                    userId: new ObjectId(userId),
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        mood: '$mood'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.date',
                    moods: {
                        $push: {
                            mood: '$_id.mood',
                            count: '$count'
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();
        
        return trend;
    }
}

module.exports = MoodHistoryModel;