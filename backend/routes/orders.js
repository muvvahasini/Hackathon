const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authorize, checkOwnership } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/orders
// @desc    Get user orders
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const {
    status,
    role = 'buyer',
    page = 1,
    limit = 20,
    sort = 'createdAt',
    order = 'desc'
  } = req.query;

  const query = {};
  const sortOptions = {};

  // Filter by user role
  if (role === 'farmer') {
    query.farmer = req.user._id;
  } else {
    query.buyer = req.user._id;
  }

  // Status filter
  if (status) {
    query.status = status;
  }

  // Sort options
  sortOptions[sort] = order === 'desc' ? -1 : 1;

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const orders = await Order.find(query)
    .populate('buyer', 'firstName lastName email phone')
    .populate('farmer', 'firstName lastName farmName phone')
    .populate('items.product', 'name images price')
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip(skip);

  const total = await Order.countDocuments(query);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private (buyer, farmer, or admin)
router.get('/:id', asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('buyer', 'firstName lastName email phone')
    .populate('farmer', 'firstName lastName farmName phone location')
    .populate('items.product', 'name images price quantity');

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Check if user has access to this order
  const isBuyer = order.buyer._id.toString() === req.user._id.toString();
  const isFarmer = order.farmer._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isBuyer && !isFarmer && !isAdmin) {
    throw new AppError('Access denied', 403);
  }

  res.json({
    success: true,
    data: { order }
  });
}));

// @route   POST /api/orders
// @desc    Create new order
// @access  Private (buyers only)
router.post('/',
  authorize('buyer'),
  [
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    body('items.*.product')
      .isMongoId()
      .withMessage('Valid product ID is required'),
    body('items.*.quantity')
      .isFloat({ min: 0.1 })
      .withMessage('Valid quantity is required'),
    body('deliveryMethod')
      .isIn(['pickup', 'delivery'])
      .withMessage('Delivery method must be pickup or delivery'),
    body('paymentMethod')
      .isIn(['cash', 'card', 'online', 'other'])
      .withMessage('Valid payment method is required'),
    body('scheduledDate')
      .isISO8601()
      .withMessage('Valid scheduled date is required'),
    body('scheduledTime')
      .notEmpty()
      .withMessage('Scheduled time is required'),
    body('deliveryAddress')
      .if(body('deliveryMethod').equals('delivery'))
      .isObject()
      .withMessage('Delivery address is required for delivery orders'),
    body('notes.buyer')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Buyer notes cannot exceed 500 characters')
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
      items,
      deliveryMethod,
      paymentMethod,
      scheduledDate,
      scheduledTime,
      deliveryAddress,
      notes
    } = req.body;

    // Validate and process items
    const processedItems = [];
    let subtotal = 0;
    let farmerId = null;

    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        throw new AppError(`Product ${item.product} not found`, 404);
      }

      if (!product.isAvailable) {
        throw new AppError(`Product ${product.name} is not available`, 400);
      }

      if (product.quantity.available < item.quantity) {
        throw new AppError(`Insufficient quantity for ${product.name}`, 400);
      }

      if (product.minimumOrder && item.quantity < product.minimumOrder) {
        throw new AppError(`Minimum order quantity for ${product.name} is ${product.minimumOrder}`, 400);
      }

      if (product.maximumOrder && item.quantity > product.maximumOrder) {
        throw new AppError(`Maximum order quantity for ${product.name} is ${product.maximumOrder}`, 400);
      }

      // Check if all items are from the same farmer
      if (farmerId && farmerId.toString() !== product.farmer.toString()) {
        throw new AppError('All items must be from the same farmer', 400);
      }
      farmerId = product.farmer;

      const itemTotal = product.price.amount * item.quantity;
      subtotal += itemTotal;

      processedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price.amount,
        unit: product.price.unit,
        total: itemTotal
      });
    }

    // Calculate delivery fee
    let deliveryFee = 0;
    if (deliveryMethod === 'delivery') {
      const farmer = await require('../models/User').findById(farmerId);
      if (farmer && farmer.role === 'farmer') {
        // Calculate delivery fee based on distance (simplified)
        deliveryFee = 5; // Base delivery fee
      }
    }

    // Calculate tax (simplified)
    const tax = subtotal * 0.08; // 8% tax

    const total = subtotal + deliveryFee + tax;

    // Create order
    const orderData = {
      buyer: req.user._id,
      farmer: farmerId,
      items: processedItems,
      subtotal,
      deliveryFee,
      tax,
      total,
      deliveryMethod,
      paymentMethod,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      notes: { buyer: notes?.buyer || '' }
    };

    if (deliveryMethod === 'delivery' && deliveryAddress) {
      orderData.deliveryAddress = deliveryAddress;
    } else if (deliveryMethod === 'pickup') {
      const farmer = await require('../models/User').findById(farmerId);
      orderData.pickupLocation = farmer.location;
    }

    const order = new Order(orderData);
    await order.save();

    // Update product quantities
    for (const item of processedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 'quantity.available': -item.quantity }
      });
    }

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'firstName lastName email phone')
      .populate('farmer', 'firstName lastName farmName phone')
      .populate('items.product', 'name images price');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order: populatedOrder }
    });
  })
);

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (farmer or admin)
router.put('/:id/status',
  checkOwnership(Order, 'id'),
  [
    body('status')
      .isIn(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'])
      .withMessage('Invalid status'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status, notes } = req.body;
    const order = req.resource;

    // Check if user can update this order
    const isFarmer = order.farmer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isFarmer && !isAdmin) {
      throw new AppError('Only the farmer can update order status', 403);
    }

    // Validate status transitions
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };

    const allowedTransitions = validTransitions[order.status];
    if (!allowedTransitions.includes(status)) {
      throw new AppError(`Cannot change status from ${order.status} to ${status}`, 400);
    }

    // Update order status
    await order.updateStatus(status, notes);

    // If order is cancelled, restore product quantities
    if (status === 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { 'quantity.available': item.quantity }
        });
      }
    }

    const updatedOrder = await Order.findById(order._id)
      .populate('buyer', 'firstName lastName email phone')
      .populate('farmer', 'firstName lastName farmName phone')
      .populate('items.product', 'name images price');

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order: updatedOrder }
    });
  })
);

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private (buyer or farmer)
router.put('/:id/cancel',
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Check if user can cancel this order
    const isBuyer = order.buyer.toString() === req.user._id.toString();
    const isFarmer = order.farmer.toString() === req.user._id.toString();

    if (!isBuyer && !isFarmer) {
      throw new AppError('Access denied', 403);
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(order.status)) {
      throw new AppError('Order cannot be cancelled', 400);
    }

    const cancelledBy = isBuyer ? 'buyer' : 'farmer';
    await order.cancelOrder(reason, cancelledBy);

    // Restore product quantities
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 'quantity.available': item.quantity }
      });
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  })
);

// @route   GET /api/orders/stats/summary
// @desc    Get order statistics
// @access  Private
router.get('/stats/summary', asyncHandler(async (req, res) => {
  const { role = 'buyer', period = '30' } = req.query;
  const days = parseInt(period);

  const query = {};
  if (role === 'farmer') {
    query.farmer = req.user._id;
  } else {
    query.buyer = req.user._id;
  }

  // Date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  query.createdAt = { $gte: startDate };

  const stats = await Order.getStats(req.user._id, role);

  // Calculate totals
  const totalOrders = stats.reduce((sum, stat) => sum + stat.count, 0);
  const totalRevenue = stats.reduce((sum, stat) => sum + stat.totalAmount, 0);

  res.json({
    success: true,
    data: {
      stats,
      summary: {
        totalOrders,
        totalRevenue,
        period: days
      }
    }
  });
}));

// @route   GET /api/orders/recent
// @desc    Get recent orders
// @access  Private
router.get('/recent', asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;

  const query = {};
  if (req.user.role === 'farmer') {
    query.farmer = req.user._id;
  } else {
    query.buyer = req.user._id;
  }

  const orders = await Order.find(query)
    .populate('buyer', 'firstName lastName')
    .populate('farmer', 'firstName lastName farmName')
    .populate('items.product', 'name')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: { orders }
  });
}));

module.exports = router; 