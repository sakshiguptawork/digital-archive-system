const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verifies JWT Bearer token and attaches authenticated user to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      message: 'Not authorized: authentication token is missing'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        message: 'Not authorized: user account no longer exists'
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      message: 'Not authorized: invalid or expired token'
    });
  }
};

/**
 * Enforces Role-Based Access Control (RBAC) for one or more permitted roles.
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Not authorized: user context missing'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: role '${req.user.role}' does not have permission for this action`
      });
    }

    return next();
  };
};

module.exports = { protect, authorizeRoles };
