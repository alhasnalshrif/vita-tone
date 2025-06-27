const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

// Validation middleware
const validateSignup = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
];

const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')        .notEmpty()
        .withMessage('Password is required'),
];

// Sign up route
router.post('/signup', validateSignup, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, password } = req.body;

        // Check if user already exists with timeout handling
        let existingUser;
        try {
            existingUser = await User.findOne({ email: email.toLowerCase() }).maxTimeMS(10000);
        } catch (dbError) {
            console.error('Database timeout on user lookup:', dbError);
            return res.status(503).json({
                success: false,
                message: 'Database connection timeout. Please try again.',
                error: 'SERVICE_UNAVAILABLE'
            });
        }

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const saltRounds = process.env.BCRYPT_ROUNDS || 12;
        const hashedPassword = await bcrypt.hash(password, parseInt(saltRounds));

        // Create new user with timeout handling
        const newUser = new User({
            full_name: name.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            last_login: new Date()
        });

        try {
            await newUser.save({ maxTimeMS: 10000 });
        } catch (dbError) {
            console.error('Database timeout on user creation:', dbError);
            return res.status(503).json({
                success: false,
                message: 'Database connection timeout. Please try again.',
                error: 'SERVICE_UNAVAILABLE'
            });
        }

        // Generate token
        const token = generateToken(newUser);

        // Remove password from response
        const userResponse = {
            id: newUser._id,
            name: newUser.full_name,
            email: newUser.email,
            createdAt: newUser.createdAt
        };

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: userResponse,
            token
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        // Handle specific MongoDB/Mongoose errors
        if (error.name === 'MongooseError' || error.name === 'MongoError') {
            return res.status(503).json({
                success: false,
                message: 'Database service temporarily unavailable. Please try again.',
                error: 'DATABASE_ERROR'
            });
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
        });
    }
});

// Sign in route
router.post('/signin', validateLogin, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user with timeout handling
        let user;
        try {
            user = await User.findOne({ email: email.toLowerCase() }).maxTimeMS(10000);
        } catch (dbError) {
            console.error('Database timeout on user lookup:', dbError);
            return res.status(503).json({
                success: false,
                message: 'Database connection timeout. Please try again.',
                error: 'SERVICE_UNAVAILABLE'
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login with timeout handling
        user.last_login = new Date();
        try {
            await user.save({ maxTimeMS: 10000 });
        } catch (dbError) {
            console.warn('Failed to update last login time:', dbError);
            // Don't fail the login for this non-critical operation
        }

        // Generate token
        const token = generateToken(user);

        // Remove password from response
        const userResponse = {
            id: user._id,
            name: user.full_name,
            email: user.email,
            createdAt: user.createdAt,
            lastLogin: user.last_login
        };

        res.json({
            success: true,
            message: 'Signed in successfully',
            user: userResponse,
            token
        });

    } catch (error) {
        console.error('Signin error:', error);
        
        // Handle specific MongoDB/Mongoose errors
        if (error.name === 'MongooseError' || error.name === 'MongoError') {
            return res.status(503).json({
                success: false,
                message: 'Database service temporarily unavailable. Please try again.',
                error: 'DATABASE_ERROR'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
        });
    }
});

// Get user profile (protected route)
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: user.getProfileData()
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
});

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        { 
            userId: user._id,
            email: user.email,
            name: user.full_name
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

// Logout route (client-side mainly, but can be used for token invalidation)
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
