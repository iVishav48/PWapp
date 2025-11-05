const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // For guest access, create a temporary user ID based on session
      req.user = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isAuthenticated: false,
        isGuest: true,
      };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      isAuthenticated: true,
      isGuest: false,
      isAdmin: decoded.isAdmin || false,
    };

    next();
  } catch (error) {
    // Invalid token, treat as guest
    req.user = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isAuthenticated: false,
      isGuest: true,
    };
    next();
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user.isAuthenticated) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user.isAuthenticated || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { auth, requireAuth, requireAdmin };