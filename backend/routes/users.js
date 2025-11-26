const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, requireAuth } = require('../middleware/auth');
const router = express.Router();

// --- REGISTER A NEW USER (compatibility with server folder) ---
// @route   POST /api/users/register
// @access  Public
// This route provides compatibility with server folder while using backend auth
router.post(
  '/register',
  [
    check('username', 'Username is required').optional().not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, name } = req.body;

      // Check if user already exists
      let user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      // Check if username is provided and already exists
      if (username) {
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
          return res
            .status(400)
            .json({ errors: [{ msg: 'Username already exists' }] });
        }
      }

      // Create new user
      user = new User({
        username: username || undefined,
        email: email.toLowerCase(),
        password,
        name: name || username || email.split('@')[0], // Fallback to email prefix
      });

      // Password will be hashed by pre-save hook in User model
      await user.save();

      // Create and return a JWT token (compatible with server folder format)
      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '5h' },
        (err, token) => {
          if (err) {
            console.error('JWT sign error:', err);
            return res.status(500).json({ errors: [{ msg: 'Server error' }] });
          }
          res.json({ token });
        }
      );
    } catch (error) {
      console.error('Registration error:', error.message);
      res.status(500).json({ errors: [{ msg: 'Server error' }] });
    }
  }
);

// --- LOGIN A USER (compatibility with server folder) ---
// @route   POST /api/users/login
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
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
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      // Compare passwords using model method
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      // Update last login
      await user.updateLastLogin();

      // Create and return a JWT token (compatible with server folder format)
      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '5h' },
        (err, token) => {
          if (err) {
            console.error('JWT sign error:', err);
            return res.status(500).json({ errors: [{ msg: 'Server error' }] });
          }
          res.json({ token });
        }
      );
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({ errors: [{ msg: 'Server error' }] });
    }
  }
);

// --- GET USER PROFILE (compatibility with server folder) ---
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', auth, requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;