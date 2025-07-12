const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const Farm = require('../models/Farm');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/farms/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'farm-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Validation rules
const farmValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Farm name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Farm description cannot exceed 1000 characters'),
  body('location.address')
    .trim()
    .notEmpty()
    .withMessage('Farm address is required'),
  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('location.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('location.zipCode')
    .trim()
    .notEmpty()
    .withMessage('Zip code is required'),
  body('location.coordinates.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('location.coordinates.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  body('totalArea.value')
    .isFloat({ min: 0 })
    .withMessage('Total area must be a positive number'),
  body('totalArea.unit')
    .isIn(['acres', 'hectares', 'square_meters', 'square_feet'])
    .withMessage('Invalid area unit'),
  body('farmType')
    .optional()
    .isIn(['vegetable', 'fruit', 'grain', 'dairy', 'livestock', 'mixed', 'other'])
    .withMessage('Invalid farm type')
];

const cropValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Crop name must be between 2 and 100 characters'),
  body('plantingDate')
    .isISO8601()
    .withMessage('Valid planting date is required'),
  body('expectedHarvestDate')
    .isISO8601()
    .withMessage('Valid expected harvest date is required'),
  body('area.value')
    .isFloat({ min: 0 })
    .withMessage('Area must be a positive number'),
  body('area.unit')
    .isIn(['acres', 'hectares', 'square_meters', 'square_feet'])
    .withMessage('Invalid area unit'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
];

// @route   GET /api/farms
// @desc    Get all farms (with filters)
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    farmType,
    certification,
    farmingMethod,
    location,
    radius,
    isActive = true,
    isVerified
  } = req.query;

  const query = { isActive: isActive === 'true' };

  if (farmType) query.farmType = farmType;
  if (certification) query.certifications = certification;
  if (farmingMethod) query.farmingMethods = farmingMethod;
  if (isVerified !== undefined) query.isVerified = isVerified === 'true';

  // Location-based search
  if (location && radius) {
    const [lat, lng] = location.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: parseFloat(radius) * 1000 // Convert km to meters
        }
      };
    }
  }

  const farms = await Farm.find(query)
    .populate('farmer', 'firstName lastName username profileImage rating')
    .populate('crops')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  const total = await Farm.countDocuments(query);

  res.json({
    success: true,
    data: {
      farms,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalFarms: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    }
  });
}));

// @route   GET /api/farms/my-farms
// @desc    Get current farmer's farms
// @access  Private (Farmer only)
router.get('/my-farms', auth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'farmer') {
    throw new AppError('Only farmers can access this resource', 403);
  }

  const farms = await Farm.find({ farmer: req.user._id })
    .populate('crops')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: { farms }
  });
}));

// @route   GET /api/farms/:id
// @desc    Get farm by ID
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const farm = await Farm.findById(req.params.id)
    .populate('farmer', 'firstName lastName username profileImage rating')
    .populate('crops');

  if (!farm) {
    throw new AppError('Farm not found', 404);
  }

  res.json({
    success: true,
    data: { farm }
  });
}));

// @route   POST /api/farms
// @desc    Create a new farm
// @access  Private (Farmer only)
router.post('/', 
  auth,
  farmValidation,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'farmer') {
      throw new AppError('Only farmers can create farms', 403);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const farmData = {
      ...req.body,
      farmer: req.user._id
    };

    const farm = new Farm(farmData);
    await farm.save();

    await farm.populate('farmer', 'firstName lastName username profileImage');

    res.status(201).json({
      success: true,
      message: 'Farm created successfully',
      data: { farm }
    });
  })
);

// @route   PUT /api/farms/:id
// @desc    Update farm
// @access  Private (Farm owner only)
router.put('/:id',
  auth,
  farmValidation,
  asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      throw new AppError('Farm not found', 404);
    }

    if (farm.farmer.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to update this farm', 403);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    Object.assign(farm, req.body);
    await farm.save();

    await farm.populate('farmer', 'firstName lastName username profileImage');

    res.json({
      success: true,
      message: 'Farm updated successfully',
      data: { farm }
    });
  })
);

// @route   DELETE /api/farms/:id
// @desc    Delete farm
// @access  Private (Farm owner only)
router.delete('/:id',
  auth,
  asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      throw new AppError('Farm not found', 404);
    }

    if (farm.farmer.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to delete this farm', 403);
    }

    await farm.remove();

    res.json({
      success: true,
      message: 'Farm deleted successfully'
    });
  })
);

// @route   POST /api/farms/:id/images
// @desc    Upload farm images
// @access  Private (Farm owner only)
router.post('/:id/images',
  auth,
  upload.array('images', 10), // Max 10 images
  asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      throw new AppError('Farm not found', 404);
    }

    if (farm.farmer.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to upload images for this farm', 403);
    }

    if (!req.files || req.files.length === 0) {
      throw new AppError('No images uploaded', 400);
    }

    const imageData = req.files.map((file, index) => ({
      url: `/uploads/farms/${file.filename}`,
      caption: req.body.captions ? req.body.captions[index] : '',
      isPrimary: req.body.isPrimary === file.filename
    }));

    farm.images.push(...imageData);
    await farm.save();

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      data: { images: imageData }
    });
  })
);

// @route   DELETE /api/farms/:id/images/:imageId
// @desc    Delete farm image
// @access  Private (Farm owner only)
router.delete('/:id/images/:imageId',
  auth,
  asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      throw new AppError('Farm not found', 404);
    }

    if (farm.farmer.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to delete images for this farm', 403);
    }

    await farm.removeImage(req.params.imageId);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  })
);

// @route   POST /api/farms/:id/crops
// @desc    Add crop to farm
// @access  Private (Farm owner only)
router.post('/:id/crops',
  auth,
  cropValidation,
  asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      throw new AppError('Farm not found', 404);
    }

    if (farm.farmer.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to add crops to this farm', 403);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    await farm.addCrop(req.body);

    res.status(201).json({
      success: true,
      message: 'Crop added successfully',
      data: { farm }
    });
  })
);

// @route   PUT /api/farms/:id/crops/:cropId
// @desc    Update crop
// @access  Private (Farm owner only)
router.put('/:id/crops/:cropId',
  auth,
  cropValidation,
  asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      throw new AppError('Farm not found', 404);
    }

    if (farm.farmer.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to update crops for this farm', 403);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    await farm.updateCrop(req.params.cropId, req.body);

    res.json({
      success: true,
      message: 'Crop updated successfully',
      data: { farm }
    });
  })
);

// @route   DELETE /api/farms/:id/crops/:cropId
// @desc    Remove crop from farm
// @access  Private (Farm owner only)
router.delete('/:id/crops/:cropId',
  auth,
  asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      throw new AppError('Farm not found', 404);
    }

    if (farm.farmer.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to remove crops from this farm', 403);
    }

    await farm.removeCrop(req.params.cropId);

    res.json({
      success: true,
      message: 'Crop removed successfully'
    });
  })
);

// @route   POST /api/farms/:id/crops/:cropId/images
// @desc    Upload crop images
// @access  Private (Farm owner only)
router.post('/:id/crops/:cropId/images',
  auth,
  upload.array('images', 5), // Max 5 images per crop
  asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      throw new AppError('Farm not found', 404);
    }

    if (farm.farmer.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to upload crop images for this farm', 403);
    }

    const crop = farm.crops.id(req.params.cropId);
    if (!crop) {
      throw new AppError('Crop not found', 404);
    }

    if (!req.files || req.files.length === 0) {
      throw new AppError('No images uploaded', 400);
    }

    const imageData = req.files.map((file, index) => ({
      url: `/uploads/crops/${file.filename}`,
      caption: req.body.captions ? req.body.captions[index] : '',
      uploadedAt: new Date()
    }));

    crop.images.push(...imageData);
    await farm.save();

    res.json({
      success: true,
      message: 'Crop images uploaded successfully',
      data: { images: imageData }
    });
  })
);

module.exports = router; 