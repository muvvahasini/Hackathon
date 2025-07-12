const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { auth, authorize, checkOwnership } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filters
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const {
    search,
    category,
    farmer,
    minPrice,
    maxPrice,
    certification,
    growingMethod,
    seasonality,
    location,
    radius = 50,
    sort = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 20,
    available = 'true'
  } = req.query;

  const query = { isAvailable: available === 'true' };

  // Search filter
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Farmer filter
  if (farmer) {
    query.farmer = farmer;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query['price.amount'] = {};
    if (minPrice) query['price.amount'].$gte = parseFloat(minPrice);
    if (maxPrice) query['price.amount'].$lte = parseFloat(maxPrice);
  }

  // Certification filter
  if (certification) {
    query.certifications = certification;
  }

  // Growing method filter
  if (growingMethod) {
    query.growingMethod = growingMethod;
  }

  // Seasonality filter
  if (seasonality) {
    query.seasonality = seasonality;
  }

  // Location filter
  if (location && location.lat && location.lng) {
    query['farmer.location.coordinates'] = {
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
  const sortOptions = {};
  sortOptions[sort] = order === 'desc' ? -1 : 1;

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const products = await Product.find(query)
    .populate('farmer', 'firstName lastName farmName location rating')
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip(skip);

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

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const products = await Product.find({ 
    isAvailable: true, 
    isFeatured: true 
  })
    .populate('farmer', 'firstName lastName farmName location rating')
    .sort({ rating: -1, createdAt: -1 })
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: { products }
  });
}));

// @route   GET /api/products/categories
// @desc    Get product categories
// @access  Public
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await Product.aggregate([
    { $match: { isAvailable: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price.amount' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.json({
    success: true,
    data: { categories }
  });
}));

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('farmer', 'firstName lastName farmName location rating bio');

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Increment view count
  await product.incrementViews();

  res.json({
    success: true,
    data: { product }
  });
}));

// @route   POST /api/products
// @desc    Create new product
// @access  Private (farmers only)
router.post('/',
  auth,
  authorize('farmer'),
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Product name is required and must be less than 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Product description is required and must be less than 1000 characters'),
    body('category')
      .isIn(['vegetables', 'fruits', 'herbs', 'grains', 'dairy', 'eggs', 'meat', 'poultry', 'fish', 'honey', 'flowers', 'seeds', 'plants', 'other'])
      .withMessage('Invalid category'),
    body('price.amount')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('price.unit')
      .isIn(['lb', 'kg', 'piece', 'bunch', 'dozen', 'bag', 'bottle', 'jar', 'custom'])
      .withMessage('Invalid price unit'),
    body('quantity.available')
      .isFloat({ min: 0 })
      .withMessage('Available quantity must be a positive number'),
    body('quantity.unit')
      .isIn(['lb', 'kg', 'piece', 'bunch', 'dozen', 'bag', 'bottle', 'jar', 'custom'])
      .withMessage('Invalid quantity unit'),
    body('images')
      .optional()
      .isArray()
      .withMessage('Images must be an array'),
    body('certifications')
      .optional()
      .isArray()
      .withMessage('Certifications must be an array'),
    body('growingMethod')
      .optional()
      .isIn(['organic', 'permaculture', 'hydroponics', 'aquaponics', 'vertical-farming', 'traditional', 'other'])
      .withMessage('Invalid growing method'),
    body('seasonality')
      .optional()
      .isIn(['spring', 'summer', 'fall', 'winter', 'year-round'])
      .withMessage('Invalid seasonality'),
    body('deliveryOptions.pickup')
      .optional()
      .isBoolean()
      .withMessage('Pickup option must be a boolean'),
    body('deliveryOptions.delivery')
      .optional()
      .isBoolean()
      .withMessage('Delivery option must be a boolean'),
    body('deliveryOptions.deliveryRadius')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Delivery radius must be a positive number'),
    body('deliveryOptions.deliveryFee')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Delivery fee must be a positive number'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const productData = {
      ...req.body,
      farmer: req.user._id
    };

    // Set primary image if not specified
    if (productData.images && productData.images.length > 0) {
      const hasPrimary = productData.images.some(img => img.isPrimary);
      if (!hasPrimary) {
        productData.images[0].isPrimary = true;
      }
    }

    const product = new Product(productData);
    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('farmer', 'firstName lastName farmName location rating');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product: populatedProduct }
    });
  })
);

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (owner only)
router.put('/:id',
  checkOwnership(Product, 'id'),
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Product name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Product description must be between 1 and 1000 characters'),
    body('price.amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('quantity.available')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Available quantity must be a positive number')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const product = req.resource;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.farmer;
    delete updateData.rating;
    delete updateData.views;
    delete updateData.favorites;

    Object.assign(product, updateData);
    await product.save();

    const updatedProduct = await Product.findById(product._id)
      .populate('farmer', 'firstName lastName farmName location rating');

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product: updatedProduct }
    });
  })
);

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (owner only)
router.delete('/:id',
  checkOwnership(Product, 'id'),
  asyncHandler(async (req, res) => {
    const product = req.resource;
    await product.remove();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  })
);

// @route   POST /api/products/:id/favorite
// @desc    Toggle product favorite
// @access  Private
router.post('/:id/favorite',
  auth,
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    await product.toggleFavorite(req.user._id);

    res.json({
      success: true,
      message: 'Favorite status updated',
      data: {
        isFavorited: product.favorites.includes(req.user._id)
      }
    });
  })
);

// @route   GET /api/products/:id/reviews
// @desc    Get product reviews
// @access  Public
router.get('/:id/reviews', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, rating } = req.query;

  const product = await Product.findById(req.params.id);
  
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const Review = require('../models/Review');
  const reviews = await Review.getByProduct(req.params.id, {
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
    rating: rating ? parseInt(rating) : undefined
  });

  const total = await Review.countDocuments({
    product: req.params.id,
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

// @route   GET /api/products/search/suggestions
// @desc    Get search suggestions
// @access  Public
router.get('/search/suggestions', asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json({
      success: true,
      data: { suggestions: [] }
    });
  }

  const suggestions = await Product.aggregate([
    { $match: { isAvailable: true } },
    {
      $facet: {
        names: [
          { $match: { name: { $regex: q, $options: 'i' } } },
          { $group: { _id: '$name' } },
          { $limit: 5 }
        ],
        categories: [
          { $match: { category: { $regex: q, $options: 'i' } } },
          { $group: { _id: '$category' } },
          { $limit: 3 }
        ],
        tags: [
          { $unwind: '$tags' },
          { $match: { tags: { $regex: q, $options: 'i' } } },
          { $group: { _id: '$tags' } },
          { $limit: 3 }
        ]
      }
    }
  ]);

  const allSuggestions = [
    ...suggestions[0].names.map(s => ({ type: 'name', value: s._id })),
    ...suggestions[0].categories.map(s => ({ type: 'category', value: s._id })),
    ...suggestions[0].tags.map(s => ({ type: 'tag', value: s._id }))
  ];

  res.json({
    success: true,
    data: { suggestions: allSuggestions }
  });
}));

module.exports = router; 