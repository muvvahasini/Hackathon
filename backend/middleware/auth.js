const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');

            if (user && user.isActive) {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        // Continue without authentication if token is invalid
        next();
    }
};

// Role-based authorization middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Authentication required.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

// Check if user owns the resource
const checkOwnership = (model, paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[paramName];
            const resource = await model.findById(resourceId);

            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found.'
                });
            }

            // Check if user owns the resource or is admin
            const ownerField = resource.user ? 'user' : 'farmer';
            const isOwner = resource[ownerField].toString() === req.user._id.toString();
            const isAdmin = req.user.role === 'admin';

            if (!isOwner && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only modify your own resources.'
                });
            }

            req.resource = resource;
            next();
        } catch (error) {
            console.error('Ownership check error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error.'
            });
        }
    };
};

// Rate limiting for specific actions
const rateLimit = (maxRequests = 5, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();

    return (req, res, next) => {
        const key = req.user ? req.user._id.toString() : req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old requests
        if (requests.has(key)) {
            requests.set(key, requests.get(key).filter(timestamp => timestamp > windowStart));
        } else {
            requests.set(key, []);
        }

        const userRequests = requests.get(key);

        if (userRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }

        userRequests.push(now);
        next();
    };
};

module.exports = {
    auth,
    optionalAuth,
    authorize,
    checkOwnership,
    rateLimit
}; 