const express = require('express');
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

// Save mood history
router.post('/save', authMiddleware, async (req, res) => {
    try {
        const { mood, confidence, description } = req.body;
        const userId = req.user.userId;
        
        const db = getDb();
        const moodEntry = {
            userId,
            mood,
            confidence,
            description,
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

module.exports = router;