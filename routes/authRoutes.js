const express = require('express');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const router = express.Router();

// Register endpoint
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        const existingUser = await UserModel.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already taken' });
        }
        
        const existingEmail = await UserModel.findByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }
        
        const newUser = await UserModel.create({ username, email, password });
        
        res.status(201).json({ 
            success: true, 
            message: 'Registration successful',
            user: newUser
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// Login endpoint
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await UserModel.findByUsername(username);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const isValid = await UserModel.verifyPassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        await UserModel.updateLastLogin(user._id);
        
        const token = jwt.sign(
            { userId: user._id.toString(), username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '1h' }
        );
        
        req.session.userId = user._id.toString();
        req.session.username = user.username;
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Verify token endpoint
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ success: true, user: decoded });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
});

module.exports = router;