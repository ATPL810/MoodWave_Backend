function validateRegistration(req, res, next) {
    const { username, email, password, confirmPassword } = req.body;
    
    if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    if (username.length < 3) {
        return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    
    if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    
    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    
    next();
}

function validateLogin(req, res, next) {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    
    next();
}

function validateMoodInput(req, res, next) {
    const { mood, confidence } = req.body;
    
    if (!mood) {
        return res.status(400).json({ success: false, message: 'Mood is required' });
    }
    
    const validMoods = ['Happy', 'Sad', 'Energetic', 'Calm', 'Stressed', 'Neutral'];
    if (!validMoods.includes(mood)) {
        return res.status(400).json({ success: false, message: 'Invalid mood value' });
    }
    
    next();
}

module.exports = { validateRegistration, validateLogin, validateMoodInput };