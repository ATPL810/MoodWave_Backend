const express = require('express');
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateMoodInput } = require('../middleware/validation');
const router = express.Router();

// Save mood history
router.post('/save', authMiddleware, validateMoodInput, async (req, res) => {
    try {
        const { mood, confidence, description } = req.body;
        const userId = req.user.userId;
        
        const db = getDb();
        const moodEntry = {
            userId,
            mood,
            confidence,
            description: description || '',
            createdAt: new Date()
        };
        
        await db.collection('mood_history').insertOne(moodEntry);
        
        res.json({ success: true, message: 'Mood saved successfully' });
        
    } catch (error) {
        console.error('Save mood error:', error);
        res.status(500).json({ success: false, message: 'Failed to save mood' });
    }
});

// Get mood history for dashboard
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const db = getDb();
        
        const history = await db.collection('mood_history')
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();
        
        res.json({ 
            success: true, 
            history: history.map(entry => ({
                time: entry.createdAt.toLocaleTimeString(),
                mood: entry.mood,
                confidence: entry.confidence
            }))
        });
        
    } catch (error) {
        console.error('Fetch mood history error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch mood history' });
    }
});

// Get mood statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const db = getDb();
        
        const stats = await db.collection('mood_history').aggregate([
            { $match: { userId } },
            { $group: {
                _id: '$mood',
                count: { $sum: 1 },
                avgConfidence: { $avg: '$confidence' }
            }},
            { $sort: { count: -1 } }
        ]).toArray();
        
        res.json({ success: true, stats });
        
    } catch (error) {
        console.error('Fetch mood stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
    }
});

module.exports = router;