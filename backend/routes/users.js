const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authorize, checkOwnership } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (with filters)
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const {
    role,
    search,
    location,
    radius = 50,
    page = 1,
    limit = 20,
    sort = 'createdAt',
    order = 'desc'
  } = req.query;

  const query = { isActive: true };
  const sortOptions = {};

  // Role filter
  if (role && ['farmer', 'buyer'].includes(role)) {
    query.role = role;
  }

  // Search filter
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { farmName: { $regex: search, $options: 'i' } }
    ];
  }

  // Location filter (for farmers)
  if (location && location.lat && location.lng) {
    query.role = 'farmer';
    query['location.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(location.lng), parseFloat(location.lat)]
        },
        $maxDistance: parseFloat(radius) * 1000 // Convert km to meters
      }
    };
  }

  // Sort options
  sortOptions[sort] = order === 'desc' ? -1 : 1;

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const users = await User.find(query)
    .select('-password -email -phone')
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip(skip);

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -email -phone');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.isActive) {
    throw new AppError('User account is deactivated', 404);
  }

  res.json({
    success: true,
    data: {
      user: user.getPublicProfile()
    }
  });
}));

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Private (owner or admin)
router.put('/:id',
  checkOwnership(User),
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('phone')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid phone number'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    body('farmName')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Farm name cannot exceed 100 characters'),
    body('farmDescription')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Farm description cannot exceed 1000 characters'),
    body('location')
      .optional()
      .isObject()
      .withMessage('Location must be an object'),
    body('certifications')
      .optional()
      .isArray()
      .withMessage('Certifications must be an array'),
    body('farmingMethods')
      .optional()
      .isArray()
      .withMessage('Farming methods must be an array'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const user = req.resource;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via this route
    delete updateData.password;
    delete updateData.email;
    delete updateData.username;
    delete updateData.role;
    delete updateData.isVerified;
    delete updateData.isActive;

    // Update user
    Object.assign(user, updateData);
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  })
);

// @route   PUT /api/users/:id/password
// @desc    Change password
// @access  Private (owner only)
router.put('/:id/password',
  checkOwnership(User),
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = req.resource;

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

// @route   PUT /api/users/:id/profile-image
// @desc    Update profile image
// @access  Private (owner only)
router.put('/:id/profile-image',
  checkOwnership(User),
  asyncHandler(async (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    const user = req.resource;
    user.profileImage = imageUrl;
    await user.save();

    res.json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        profileImage: user.profileImage
      }
    });
  })
);

// @route   GET /api/users/:id/reviews
// @desc    Get user reviews
// @access  Public
router.get('/:id/reviews', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, rating } = req.query;

  const user = await User.findById(req.params.id);
  
  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }

  const Review = require('../models/Review');
  const reviews = await Review.getByUser(req.params.id, {
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
    rating: rating ? parseInt(rating) : undefined
  });

  const total = await Review.countDocuments({
    reviewedUser: req.params.id,
    isActive: true
  });

  res.json({
    success: true,
    data: {
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// @route   GET /api/users/:id/products
// @desc    Get user products (for farmers)
// @access  Public
router.get('/:id/products', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category, available } = req.query;

  const user = await User.findById(req.params.id);
  
  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }

  if (user.role !== 'farmer') {
    return res.status(400).json({
      success: false,
      message: 'User is not a farmer'
    });
  }

  const Product = require('../models/Product');
  const query = { farmer: req.params.id };

  if (available !== undefined) {
    query.isAvailable = available === 'true';
  }

  if (category) {
    query.category = category;
  }

  const products = await Product.find(query)
    .populate('farmer', 'firstName lastName farmName location rating')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Product.countDocuments(query);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// @route   DELETE /api/users/:id
// @desc    Deactivate user account
// @access  Private (owner or admin)
router.delete('/:id',
  checkOwnership(User),
  asyncHandler(async (req, res) => {
    const user = req.resource;

    // Soft delete - deactivate account
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  })
);

// @route   GET /api/users/stats/overview
// @desc    Get user statistics overview (admin only)
// @access  Private (admin)
router.get('/stats/overview',
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          verifiedCount: {
            $sum: { $cond: ['$isVerified', 1, 0] }
          },
          avgRating: { $avg: '$rating.average' }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const totalActive = await User.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalActive,
        byRole: stats,
        recentUsers: await User.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('firstName lastName role createdAt')
      }
    });
  })
);

module.exports = router; 