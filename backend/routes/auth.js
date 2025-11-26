const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const User = require('../models/User');

// POST /api/auth/register - Register new user
router.post('/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, username } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Check if username is provided and already exists
      if (username) {
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }

      // Create new user (password will be hashed by pre-save hook)
      const newUser = new User({
        email: email.toLowerCase(),
        password,
        name: name || username, // Use name or username as fallback
        username: username || undefined, // Optional username from server folder
        isAdmin: false,
      });

      await newUser.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: newUser._id.toString(), 
          email: newUser.email,
          isAdmin: newUser.isAdmin,
        },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: newUser._id.toString(),
          email: newUser.email,
          name: newUser.name,
          username: newUser.username,
          isAdmin: newUser.isAdmin,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        message: 'Error registering user',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// POST /api/auth/login - Login user
router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').exists().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user in database and include password for comparison
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password using model method
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Update last login
      await user.updateLastLogin();

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id.toString(), 
          email: user.email,
          isAdmin: user.isAdmin,
        },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          username: user.username,
          isAdmin: user.isAdmin,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        message: 'Error logging in',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// GET /api/auth/me - Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    
    // Find user in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

      res.json({
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          username: user.username,
          isAdmin: user.isAdmin,
        },
      });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// POST /api/auth/guest - Create guest session
router.post('/guest', async (req, res) => {
  try {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate a guest token
    const token = jwt.sign(
      { 
        userId: guestId, 
        isGuest: true,
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Guest session created',
      token,
      user: {
        id: guestId,
        isGuest: true,
      },
    });
  } catch (error) {
    console.error('Guest session error:', error);
    res.status(500).json({ 
      message: 'Error creating guest session',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/auth/convert-guest - Convert guest to registered user
router.post('/convert-guest',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      if (!decoded.isGuest) {
        return res.status(400).json({ message: 'Not a guest account' });
      }

      const { email, password, name } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Create new user (password will be hashed by pre-save hook)
      const newUser = new User({
        email: email.toLowerCase(),
        password,
        name,
        isAdmin: false,
      });
      
      await newUser.save();

      // Generate new token for registered user
      const newToken = jwt.sign(
        { 
          userId: newUser._id.toString(), 
          email: newUser.email,
          isAdmin: newUser.isAdmin,
        },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.json({
        message: 'Guest account converted successfully',
        token: newToken,
        user: {
          id: newUser._id.toString(),
          email: newUser.email,
          name: newUser.name,
          username: newUser.username,
          isAdmin: newUser.isAdmin,
        },
      });
    } catch (error) {
      console.error('Convert guest error:', error);
      res.status(500).json({ 
        message: 'Error converting guest account',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;