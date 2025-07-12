const express = require('express');
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Order = require('../models/Order');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { auth, authorize, checkOwnership } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reviews
// @desc    Get reviews with filters
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
    const {
        reviewedUser,
        product,
        rating,
        page = 1,
        limit = 20,
        sort = 'createdAt',
        order = 'desc'
    } = req.query;

    const query = { isActive: true };
    const sortOptions = {};

    // Filter by reviewed user
    if (reviewedUser) {
        query.reviewedUser = reviewedUser;
    }

    // Filter by product
    if (product) {
        query.product = product;
    }

    // Filter by rating
    if (rating) {
        query.rating = parseInt(rating);
    }

    // Sort options
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find(query)
        .populate('reviewer', 'firstName lastName profileImage')
        .populate('reviewedUser', 'firstName lastName farmName')
        .populate('product', 'name images')
        .populate('order', 'orderNumber')
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(skip);

    const total = await Review.countDocuments(query);

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

// @route   GET /api/reviews/:id
// @desc    Get review by ID
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id)
        .populate('reviewer', 'firstName lastName profileImage')
        .populate('reviewedUser', 'firstName lastName farmName')
        .populate('product', 'name images price')
        .populate('order', 'orderNumber status');

    if (!review) {
        throw new AppError('Review not found', 404);
    }

    if (!review.isActive) {
        throw new AppError('Review is not available', 404);
    }

    res.json({
        success: true,
        data: { review }
    });
}));

// @route   POST /api/reviews
// @desc    Create new review
// @access  Private
router.post('/',
    auth,
    [
        body('reviewedUser')
            .isMongoId()
            .withMessage('Valid reviewed user ID is required'),
        body('order')
            .isMongoId()
            .withMessage('Valid order ID is required'),
        body('rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('title')
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Review title is required and must be less than 100 characters'),
        body('comment')
            .trim()
            .isLength({ min: 1, max: 1000 })
            .withMessage('Review comment is required and must be less than 1000 characters'),
        body('categories.quality')
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('Quality rating must be between 1 and 5'),
        body('categories.communication')
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('Communication rating must be between 1 and 5'),
        body('categories.delivery')
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('Delivery rating must be between 1 and 5'),
        body('categories.value')
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('Value rating must be between 1 and 5'),
        body('images')
            .optional()
            .isArray()
            .withMessage('Images must be an array'),
        body('replyTo')
            .optional()
            .isMongoId()
            .withMessage('Valid reply review ID is required')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            reviewedUser,
            order: orderId,
            product,
            rating,
            title,
            comment,
            categories,
            images,
            replyTo
        } = req.body;

        // Check if user is reviewing themselves
        if (reviewedUser === req.user._id.toString()) {
            throw new AppError('You cannot review yourself', 400);
        }

        // Verify the order exists and belongs to the user
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404);
        }

        if (order.buyer.toString() !== req.user._id.toString()) {
            throw new AppError('You can only review orders you placed', 403);
        }

        // Check if order is delivered
        if (order.status !== 'delivered') {
            throw new AppError('You can only review delivered orders', 400);
        }

        // Check if user has already reviewed this order
        const existingReview = await Review.findOne({
            order: orderId,
            reviewer: req.user._id
        });

        if (existingReview) {
            throw new AppError('You have already reviewed this order', 400);
        }

        // Verify reviewed user is the farmer from the order
        if (order.farmer.toString() !== reviewedUser) {
            throw new AppError('You can only review the farmer from your order', 400);
        }

        // Create review
        const reviewData = {
            reviewer: req.user._id,
            reviewedUser,
            order: orderId,
            product,
            rating,
            title,
            comment,
            categories,
            images: images || [],
            replyTo
        };

        const review = new Review(reviewData);
        await review.save();

        // Mark review as verified since it's linked to an order
        review.isVerified = true;
        await review.save();

        const populatedReview = await Review.findById(review._id)
            .populate('reviewer', 'firstName lastName profileImage')
            .populate('reviewedUser', 'firstName lastName farmName')
            .populate('product', 'name images')
            .populate('order', 'orderNumber');

        res.status(201).json({
            success: true,
            message: 'Review created successfully',
            data: { review: populatedReview }
        });
    })
);

// @route   PUT /api/reviews/:id
// @desc    Update review
// @access  Private (owner only)
router.put('/:id',
    checkOwnership(Review, 'id'),
    [
        body('rating')
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('title')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Review title must be between 1 and 100 characters'),
        body('comment')
            .optional()
            .trim()
            .isLength({ min: 1, max: 1000 })
            .withMessage('Review comment must be between 1 and 1000 characters'),
        body('categories')
            .optional()
            .isObject()
            .withMessage('Categories must be an object')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const review = req.resource;
        const updateData = req.body;

        // Remove fields that shouldn't be updated
        delete updateData.reviewer;
        delete updateData.reviewedUser;
        delete updateData.order;
        delete updateData.product;
        delete updateData.isVerified;
        delete updateData.isActive;

        Object.assign(review, updateData);
        review.isEdited = true;
        review.editedAt = new Date();
        await review.save();

        const updatedReview = await Review.findById(review._id)
            .populate('reviewer', 'firstName lastName profileImage')
            .populate('reviewedUser', 'firstName lastName farmName')
            .populate('product', 'name images')
            .populate('order', 'orderNumber');

        res.json({
            success: true,
            message: 'Review updated successfully',
            data: { review: updatedReview }
        });
    })
);

// @route   DELETE /api/reviews/:id
// @desc    Delete review
// @access  Private (owner or admin)
router.delete('/:id',
    checkOwnership(Review, 'id'),
    asyncHandler(async (req, res) => {
        const review = req.resource;

        // Soft delete
        await review.softDelete(req.user._id);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    })
);

// @route   POST /api/reviews/:id/helpful
// @desc    Mark review as helpful/unhelpful
// @access  Private
router.post('/:id/helpful',
    auth,
    [
        body('helpful')
            .isBoolean()
            .withMessage('Helpful must be a boolean')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { helpful } = req.body;
        const review = await Review.findById(req.params.id);

        if (!review) {
            throw new AppError('Review not found', 404);
        }

        if (!review.isActive) {
            throw new AppError('Review is not available', 404);
        }

        await review.markHelpful(req.user._id, helpful);

        res.json({
            success: true,
            message: 'Review marked as helpful/unhelpful',
            data: {
                helpfulCount: review.helpfulCount
            }
        });
    })
);

// @route   POST /api/reviews/:id/report
// @desc    Report review
// @access  Private
router.post('/:id/report',
    auth,
    [
        body('reason')
            .isIn(['inappropriate', 'spam', 'fake', 'other'])
            .withMessage('Valid report reason is required')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { reason } = req.body;
        const review = await Review.findById(req.params.id);

        if (!review) {
            throw new AppError('Review not found', 404);
        }

        if (!review.isActive) {
            throw new AppError('Review is not available', 404);
        }

        // Check if user has already reported this review
        if (review.isReported) {
            throw new AppError('Review has already been reported', 400);
        }

        await review.reportReview(reason);

        res.json({
            success: true,
            message: 'Review reported successfully'
        });
    })
);

// @route   GET /api/reviews/stats/:userId
// @desc    Get review statistics for a user
// @access  Public
router.get('/stats/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await require('../models/User').findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const stats = await Review.getStats(userId);
    const averageRating = await Review.getAverageRating(userId);

    res.json({
        success: true,
        data: {
            stats,
            averageRating: averageRating.length > 0 ? averageRating[0] : { averageRating: 0, totalReviews: 0 }
        }
    });
}));

// @route   GET /api/reviews/verified/:userId
// @desc    Get verified reviews for a user
// @access  Public
router.get('/verified/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const user = await require('../models/User').findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const reviews = await Review.find({
        reviewedUser: userId,
        isActive: true,
        isVerified: true
    })
        .populate('reviewer', 'firstName lastName profileImage')
        .populate('product', 'name images')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Review.countDocuments({
        reviewedUser: userId,
        isActive: true,
        isVerified: true
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

module.exports = router; 