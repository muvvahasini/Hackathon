const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { generateTransactionId } = require('../utils/transactionUtils');

// @route   GET /api/transactions
// @desc    Get all transactions for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, type, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const query = {
            $or: [
                { buyer: req.user.id },
                { farmer: req.user.id }
            ]
        };

        // Add filters
        if (status) query.status = status;
        if (type) query.type = type;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const transactions = await Transaction.find(query)
            .populate('order', 'orderNumber status')
            .populate('buyer', 'firstName lastName email')
            .populate('farmer', 'firstName lastName email')
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await Transaction.countDocuments(query);

        res.json({
            transactions,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalTransactions: total
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/transactions/stats
// @desc    Get transaction statistics for the authenticated user
// @access  Private
router.get('/stats', auth, async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query;

        const stats = await Transaction.getStats(req.user.id, timeframe);

        // Get recent transactions for chart data
        const recentTransactions = await Transaction.find({
            $or: [
                { buyer: req.user.id },
                { farmer: req.user.id }
            ],
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        })
            .select('amount createdAt type status')
            .sort({ createdAt: 1 });

        // Group by date for chart
        const chartData = recentTransactions.reduce((acc, transaction) => {
            const date = transaction.createdAt.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = { date, total: 0, count: 0 };
            }
            acc[date].total += transaction.amount;
            acc[date].count += 1;
            return acc;
        }, {});

        res.json({
            stats,
            chartData: Object.values(chartData)
        });
    } catch (error) {
        console.error('Error fetching transaction stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/transactions/:id
// @desc    Get a specific transaction by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('order', 'orderNumber status items subtotal deliveryFee tax total')
            .populate('buyer', 'firstName lastName email phone')
            .populate('farmer', 'firstName lastName email phone');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Check if user has access to this transaction
        if (transaction.buyer._id.toString() !== req.user.id &&
            transaction.farmer._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(transaction);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/transactions
// @desc    Create a new transaction
// @access  Private
router.post('/', [
    auth,
    [
        body('orderId').isMongoId().withMessage('Valid order ID is required'),
        body('type').isIn(['payment', 'refund', 'commission', 'delivery_fee', 'tax']).withMessage('Valid transaction type is required'),
        body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
        body('paymentMethod').isIn(['cash', 'card', 'phonepe', 'paypal', 'online', 'bank_transfer', 'mobile_money']).withMessage('Valid payment method is required'),
        body('description').notEmpty().withMessage('Description is required')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { orderId, type, amount, paymentMethod, paymentProvider, description, notes, paymentDetails } = req.body;

        // Verify order exists and user has access
        const order = await Order.findById(orderId)
            .populate('buyer', 'firstName lastName')
            .populate('farmer', 'firstName lastName');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.buyer._id.toString() !== req.user.id &&
            order.farmer._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Create transaction metadata
        const metadata = {
            orderNumber: order.orderNumber,
            items: order.items.map(item => ({
                productName: item.product.name || 'Product',
                quantity: item.quantity,
                price: item.price
            })),
            subtotal: order.subtotal,
            deliveryFee: order.deliveryFee,
            tax: order.tax,
            total: order.total
        };

        const transaction = new Transaction({
            transactionId: generateTransactionId(),
            order: orderId,
            buyer: order.buyer._id,
            farmer: order.farmer._id,
            type,
            amount,
            paymentMethod,
            paymentProvider: paymentProvider || 'other',
            description,
            metadata,
            notes,
            paymentDetails
        });

        await transaction.save();

        // Populate the saved transaction
        await transaction.populate([
            { path: 'order', select: 'orderNumber status' },
            { path: 'buyer', select: 'firstName lastName email' },
            { path: 'farmer', select: 'firstName lastName email' }
        ]);

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/transactions/:id/process
// @desc    Process a pending transaction
// @access  Private
router.put('/:id/process', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Check if user has access to this transaction
        if (transaction.buyer.toString() !== req.user.id &&
            transaction.farmer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await transaction.processTransaction();

        res.json({ message: 'Transaction processed successfully', transaction });
    } catch (error) {
        console.error('Error processing transaction:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/transactions/:id/refund
// @desc    Refund a completed transaction
// @access  Private
router.put('/:id/refund', [
    auth,
    [
        body('reason').notEmpty().withMessage('Refund reason is required'),
        body('refundedBy').isIn(['buyer', 'farmer', 'system', 'admin']).withMessage('Valid refunded by value is required')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { reason, refundedBy } = req.body;

        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Check if user has access to this transaction
        if (transaction.buyer.toString() !== req.user.id &&
            transaction.farmer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await transaction.refundTransaction(reason, refundedBy);

        res.json({ message: 'Transaction refunded successfully', transaction });
    } catch (error) {
        console.error('Error refunding transaction:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/transactions/export
// @desc    Export transactions to CSV
// @access  Private
router.get('/export', auth, async (req, res) => {
    try {
        const { startDate, endDate, format = 'csv' } = req.query;

        const query = {
            $or: [
                { buyer: req.user.id },
                { farmer: req.user.id }
            ]
        };

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(query)
            .populate('order', 'orderNumber')
            .populate('buyer', 'firstName lastName email')
            .populate('farmer', 'firstName lastName email')
            .sort({ createdAt: -1 });

        if (format === 'csv') {
            const csvData = transactions.map(t => ({
                'Transaction ID': t.transactionId,
                'Order Number': t.order?.orderNumber || '',
                'Type': t.type,
                'Amount': t.amount,
                'Currency': t.currency,
                'Status': t.status,
                'Payment Method': t.paymentMethod,
                'Description': t.description,
                'Created At': t.createdAt.toISOString(),
                'Buyer': `${t.buyer?.firstName} ${t.buyer?.lastName}`,
                'Farmer': `${t.farmer?.firstName} ${t.farmer?.lastName}`
            }));

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');

            // Convert to CSV
            const csv = [
                Object.keys(csvData[0] || {}).join(','),
                ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
            ].join('\n');

            res.send(csv);
        } else {
            res.json(transactions);
        }
    } catch (error) {
        console.error('Error exporting transactions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 