// Input validation middleware
function validateRegistration(req, res, next) {
    const { username, email, password, confirmPassword } = req.body;
    
    const errors = [];
    
    // Username validation
    if (!username || username.trim().length < 3) {
        errors.push('Username must be at least 3 characters');
    }
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
    }
    
    // Email validation
    if (!email) {
        errors.push('Email is required');
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        errors.push('Please enter a valid email address');
    }
    
    // Password validation
    if (!password) {
        errors.push('Password is required');
    }
    if (password && password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    if (password && !/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
        errors.push('Password must contain at least one uppercase and one lowercase letter');
    }
    
    // Confirm password
    if (password !== confirmPassword) {
        errors.push('Passwords do not match');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    
    next();
}

function validateLogin(req, res, next) {
    const { username, password } = req.body;
    
    if (!username || username.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Username is required' });
    }
    
    if (!password || password.length === 0) {
        return res.status(400).json({ success: false, message: 'Password is required' });
    }
    
    next();
}

function validateMoodInput(req, res, next) {
    const { mood, confidence } = req.body;
    const validMoods = ['Happy', 'Sad', 'Energetic', 'Calm', 'Stressed', 'Neutral'];
    
    if (!mood || !validMoods.includes(mood)) {
        return res.status(400).json({ success: false, message: 'Invalid mood value' });
    }
    
    if (!confidence || confidence < 0 || confidence > 100) {
        return res.status(400).json({ success: false, message: 'Confidence must be between 0 and 100' });
    }
    
    next();
}

module.exports = { validateRegistration, validateLogin, validateMoodInput };