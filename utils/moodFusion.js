// Advanced mood fusion algorithm
function fuseMoodWithWeights(facialMood, voiceMood, textMood, facialAccuracy, voiceAccuracy, textAccuracy) {
    // Define mood categories with their valence and energy levels
    const moodProperties = {
        'Happy': { valence: 0.9, energy: 0.7, weight: 1.0 },
        'Sad': { valence: 0.2, energy: 0.3, weight: 0.9 },
        'Energetic': { valence: 0.7, energy: 0.9, weight: 1.0 },
        'Calm': { valence: 0.6, energy: 0.2, weight: 0.8 },
        'Stressed': { valence: 0.3, energy: 0.6, weight: 0.7 },
        'Neutral': { valence: 0.5, energy: 0.5, weight: 0.5 }
    };
    
    const moods = [facialMood, voiceMood, textMood];
    const accuracies = [facialAccuracy, voiceAccuracy, textAccuracy];
    
    // Weighted scoring system
    let scores = {
        'Happy': 0,
        'Sad': 0,
        'Energetic': 0,
        'Calm': 0,
        'Stressed': 0,
        'Neutral': 0
    };
    
    moods.forEach((mood, index) => {
        if (mood && moodProperties[mood]) {
            const weight = accuracies[index] / 100;
            scores[mood] += weight * moodProperties[mood].weight;
            
            // Add similarity scores to related moods
            for (const [otherMood, properties] of Object.entries(moodProperties)) {
                const valenceDiff = Math.abs(moodProperties[mood].valence - properties.valence);
                const energyDiff = Math.abs(moodProperties[mood].energy - properties.energy);
                const similarity = 1 - ((valenceDiff + energyDiff) / 2);
                scores[otherMood] += weight * similarity * 0.5;
            }
        }
    });
    
    // Find highest scoring mood
    let fusedMood = 'Neutral';
    let maxScore = 0;
    
    for (const [mood, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            fusedMood = mood;
        }
    }
    
    // Calculate confidence
    let confidenceSum = 0;
    let count = 0;
    moods.forEach((mood, index) => {
        if (mood === fusedMood) {
            confidenceSum += accuracies[index];
            count++;
        }
    });
    
    // Add score-based confidence boost
    const scoreBoost = Math.min(20, maxScore * 10);
    const baseConfidence = count > 0 ? confidenceSum / count : 70;
    const finalConfidence = Math.min(98, Math.round(baseConfidence + scoreBoost));
    
    // Generate personalized description
    const descriptions = {
        'Happy': `Your radiant energy is unmistakable! With ${finalConfidence}% confidence, we've detected pure joy in your expression, voice, and words. Here's a playlist that celebrates your happiness.`,
        'Sad': `We sense you're going through something. Our ${finalConfidence}% confidence analysis picked up emotional depth in your demeanor. These thoughtfully selected tracks acknowledge your feelings.`,
        'Energetic': `Your dynamic spirit is contagious! At ${finalConfidence}% confidence, we've identified your high-energy state. Get ready for tracks that match your vibrant pace.`,
        'Calm': `Peace radiates from you. With ${finalConfidence}% confidence, we've detected your serene state. Let these tranquil sounds enhance your inner calm.`,
        'Stressed': `Life can be overwhelming. Our ${finalConfidence}% confidence analysis suggests you could use some relief. These calming tracks are here to help you decompress.`,
        'Neutral': `You're in a balanced state of mind. Based on our ${finalConfidence}% confidence analysis, here's a versatile mix that matches your centered energy.`
    };
    
    return {
        mood: fusedMood,
        confidence: finalConfidence,
        description: descriptions[fusedMood] || `Based on our ${finalConfidence}% confidence analysis, we've curated these tracks for you.`,
        scores: scores,
        rawData: { facialMood, voiceMood, textMood, facialAccuracy, voiceAccuracy, textAccuracy }
    };
}

function generateMoodInsights(moodHistory) {
    if (!moodHistory || moodHistory.length === 0) {
        return {
            dominantMood: 'Neutral',
            moodStability: 0,
            recommendation: 'Start your mood journey by trying our music recommendation feature!'
        };
    }
    
    // Calculate dominant mood
    const moodCounts = {};
    moodHistory.forEach(entry => {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    
    let dominantMood = 'Neutral';
    let maxCount = 0;
    for (const [mood, count] of Object.entries(moodCounts)) {
        if (count > maxCount) {
            maxCount = count;
            dominantMood = mood;
        }
    }
    
    // Calculate mood stability (how consistent the mood has been)
    let changes = 0;
    for (let i = 1; i < moodHistory.length; i++) {
        if (moodHistory[i].mood !== moodHistory[i-1].mood) {
            changes++;
        }
    }
    const stability = Math.max(0, 100 - (changes / moodHistory.length * 100));
    
    // Generate insight
    let insight = '';
    if (dominantMood === 'Happy') {
        insight = 'You\'ve been predominantly happy! Keep spreading that positive energy.';
    } else if (dominantMood === 'Sad') {
        insight = 'We notice you\'ve been feeling down lately. Remember, it\'s okay to not be okay. Music can be a great companion.';
    } else if (dominantMood === 'Stressed') {
        insight = 'Your stress levels have been elevated. Consider taking breaks and listening to calming music.';
    } else if (dominantMood === 'Energetic') {
        insight = 'Your energy has been high! Great time for productive tasks and upbeat activities.';
    } else if (dominantMood === 'Calm') {
        insight = 'You\'ve maintained a peaceful state. This is excellent for focus and relaxation.';
    } else {
        insight = 'Your moods have been varied. Music can help you navigate different emotional states.';
    }
    
    return {
        dominantMood,
        stability: Math.round(stability),
        insight,
        moodDistribution: moodCounts
    };
}

module.exports = { fuseMoodWithWeights, generateMoodInsights };