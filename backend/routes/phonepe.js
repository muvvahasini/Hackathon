const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const { generateTransactionId } = require('../utils/transactionUtils');
const crypto = require('crypto');

// PhonePe configuration
const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || 'your_phonepe_merchant_id';
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY || 'your_phonepe_salt_key';
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';
const PHONEPE_ENV = process.env.NODE_ENV === 'production' ? 'PROD' : 'UAT';

// PhonePe API URLs
const PHONEPE_BASE_URL = PHONEPE_ENV === 'PROD'
    ? 'https://api.phonepe.com/apis/hermes'
    : 'https://api-preprod.phonepe.com/apis/hermes';

// Generate PhonePe checksum
function generatePhonePeChecksum(payload, saltKey, saltIndex) {
    const base64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const string = base64 + '/pg/v1/pay' + saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = sha256 + '###' + saltIndex;
    return checksum;
}

// Verify PhonePe checksum
function verifyPhonePeChecksum(payload, checksum, saltKey, saltIndex) {
    const expectedChecksum = generatePhonePeChecksum(payload, saltKey, saltIndex);
    return checksum === expectedChecksum;
}

// @route   GET /api/phonepe/config
// @desc    Get PhonePe configuration
// @access  Private
router.get('/config', (req, res) => {
    res.json({
        merchantId: PHONEPE_MERCHANT_ID,
        environment: PHONEPE_ENV,
        saltKey: PHONEPE_SALT_KEY,
        saltIndex: PHONEPE_SALT_INDEX
    });
});

// @route   POST /api/phonepe/create-order
// @desc    Create a PhonePe payment order
// @access  Private
router.post('/create-order', auth, async (req, res) => {
    try {
        const { amount, orderData, phoneNumber, upiId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        if (!phoneNumber) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        // Generate unique transaction ID
        const transactionId = generateTransactionId();
        const merchantTransactionId = `TXN_${Date.now()}`;

        // Create PhonePe payload
        const payload = {
            merchantId: PHONEPE_MERCHANT_ID,
            merchantTransactionId: merchantTransactionId,
            amount: amount * 100, // PhonePe expects amount in paise
            redirectUrl: `${req.protocol}://${req.get('host')}/api/phonepe/callback`,
            redirectMode: 'POST',
            callbackUrl: `${req.protocol}://${req.get('host')}/api/phonepe/callback`,
            merchantUserId: req.user.id,
            mobileNumber: phoneNumber,
            paymentInstrument: {
                type: 'UPI_INTENT',
                targetApp: 'PHONEPE'
            }
        };

        // Add UPI ID if provided
        if (upiId) {
            payload.paymentInstrument.vpa = upiId;
        }

        // Generate checksum
        const checksum = generatePhonePeChecksum(payload, PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX);

        // Create PhonePe request
        const phonepeRequest = {
            request: Buffer.from(JSON.stringify(payload)).toString('base64')
        };

        // Call PhonePe API
        const response = await fetch(`${PHONEPE_BASE_URL}/pg/v1/pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            body: JSON.stringify(phonepeRequest)
        });

        const data = await response.json();

        if (!response.ok || data.code !== 'SUCCESS') {
            console.error('PhonePe create order error:', data);
            return res.status(400).json({
                message: 'Failed to create PhonePe order',
                error: data
            });
        }

        // Create transaction record
        const transaction = new Transaction({
            transactionId: transactionId,
            buyer: req.user.id,
            farmer: orderData?.farmerId || req.user.id,
            order: orderData?.orderId || null,
            type: 'payment',
            amount: amount,
            paymentMethod: 'phonepe',
            paymentProvider: 'phonepe',
            paymentReference: merchantTransactionId,
            description: `PhonePe payment for order ${orderData?.orderNumber || 'New Order'}`,
            status: 'pending',
            paymentDetails: {
                phonepePhone: phoneNumber,
                phonepeUpi: upiId || null,
                phonepeMerchantTransactionId: merchantTransactionId,
                phonepeOrderId: data.data.merchantId,
                phonepeRedirectUrl: data.data.instrumentResponse.redirectInfo.url,
                orderData: orderData
            }
        });

        await transaction.save();

        res.json({
            success: true,
            merchantTransactionId: merchantTransactionId,
            transactionId: transaction._id,
            redirectUrl: data.data.instrumentResponse.redirectInfo.url,
            deeplink: data.data.instrumentResponse.redirectInfo.deeplink,
            status: 'PENDING'
        });

    } catch (error) {
        console.error('Error creating PhonePe order:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/phonepe/callback
// @desc    Handle PhonePe payment callback
// @access  Public
router.post('/callback', async (req, res) => {
    try {
        const { merchantTransactionId, transactionId, amount, status, responseCode, checksum } = req.body;

        // Verify checksum
        const payload = {
            merchantId: PHONEPE_MERCHANT_ID,
            merchantTransactionId,
            transactionId,
            amount,
            status,
            responseCode
        };

        if (!verifyPhonePeChecksum(payload, checksum, PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX)) {
            console.error('PhonePe callback checksum verification failed');
            return res.status(400).json({ message: 'Invalid checksum' });
        }

        // Find transaction
        const transaction = await Transaction.findOne({
            paymentReference: merchantTransactionId
        });

        if (!transaction) {
            console.error('Transaction not found for PhonePe callback:', merchantTransactionId);
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Update transaction status
        if (status === 'PAYMENT_SUCCESS') {
            transaction.status = 'completed';
            transaction.processedAt = new Date();
            transaction.paymentDetails = {
                ...transaction.paymentDetails,
                phonepeTransactionId: transactionId,
                phonepeStatus: status,
                phonepeResponseCode: responseCode
            };
        } else {
            transaction.status = 'failed';
            transaction.failureReason = `PhonePe payment failed: ${responseCode}`;
            transaction.paymentDetails = {
                ...transaction.paymentDetails,
                phonepeTransactionId: transactionId,
                phonepeStatus: status,
                phonepeResponseCode: responseCode
            };
        }

        await transaction.save();

        // Update order status if exists
        if (transaction.order && status === 'PAYMENT_SUCCESS') {
            const order = await Order.findById(transaction.order);
            if (order) {
                order.status = 'confirmed';
                order.paymentStatus = 'paid';
                await order.save();
            }
        }

        // Redirect to frontend with status
        const redirectUrl = status === 'PAYMENT_SUCCESS'
            ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?transactionId=${transaction._id}`
            : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-failed?transactionId=${transaction._id}`;

        res.redirect(redirectUrl);

    } catch (error) {
        console.error('Error processing PhonePe callback:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/phonepe/check-status
// @desc    Check PhonePe payment status
// @access  Private
router.post('/check-status', auth, async (req, res) => {
    try {
        const { merchantTransactionId } = req.body;

        if (!merchantTransactionId) {
            return res.status(400).json({ message: 'Merchant transaction ID is required' });
        }

        // Find transaction
        const transaction = await Transaction.findOne({
            paymentReference: merchantTransactionId,
            buyer: req.user.id
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Call PhonePe status API
        const payload = {
            merchantId: PHONEPE_MERCHANT_ID,
            merchantTransactionId: merchantTransactionId
        };

        const checksum = generatePhonePeChecksum(payload, PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX);

        const response = await fetch(`${PHONEPE_BASE_URL}/pg/v1/status/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': PHONEPE_MERCHANT_ID
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('PhonePe status check error:', data);
            return res.status(400).json({
                message: 'Failed to check payment status',
                error: data
            });
        }

        // Update transaction if status changed
        if (data.code === 'SUCCESS' && data.data.status !== transaction.status) {
            if (data.data.status === 'PAYMENT_SUCCESS') {
                transaction.status = 'completed';
                transaction.processedAt = new Date();
            } else if (data.data.status === 'PAYMENT_ERROR') {
                transaction.status = 'failed';
                transaction.failureReason = 'Payment failed';
            }

            transaction.paymentDetails = {
                ...transaction.paymentDetails,
                phonepeStatus: data.data.status,
                phonepeResponseCode: data.data.responseCode
            };

            await transaction.save();
        }

        res.json({
            success: true,
            transaction: transaction,
            phonepeStatus: data.data.status,
            responseCode: data.data.responseCode
        });

    } catch (error) {
        console.error('Error checking PhonePe status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/phonepe/refund
// @desc    Initiate PhonePe refund
// @access  Private
router.post('/refund', auth, async (req, res) => {
    try {
        const { merchantTransactionId, refundAmount, reason } = req.body;

        if (!merchantTransactionId || !refundAmount) {
            return res.status(400).json({ message: 'Merchant transaction ID and refund amount are required' });
        }

        // Find original transaction
        const originalTransaction = await Transaction.findOne({
            paymentReference: merchantTransactionId,
            buyer: req.user.id,
            status: 'completed'
        });

        if (!originalTransaction) {
            return res.status(404).json({ message: 'Completed transaction not found' });
        }

        if (refundAmount > originalTransaction.amount) {
            return res.status(400).json({ message: 'Refund amount cannot exceed original amount' });
        }

        // Create refund payload
        const payload = {
            merchantId: PHONEPE_MERCHANT_ID,
            merchantTransactionId: `REFUND_${Date.now()}`,
            originalTransactionId: merchantTransactionId,
            amount: refundAmount * 100, // Convert to paise
            callbackUrl: `${req.protocol}://${req.get('host')}/api/phonepe/refund-callback`
        };

        const checksum = generatePhonePeChecksum(payload, PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX);

        const response = await fetch(`${PHONEPE_BASE_URL}/pg/v1/refund`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            body: JSON.stringify({
                request: Buffer.from(JSON.stringify(payload)).toString('base64')
            })
        });

        const data = await response.json();

        if (!response.ok || data.code !== 'SUCCESS') {
            console.error('PhonePe refund error:', data);
            return res.status(400).json({
                message: 'Failed to initiate refund',
                error: data
            });
        }

        // Create refund transaction
        const refundTransaction = new Transaction({
            transactionId: generateTransactionId(),
            buyer: req.user.id,
            farmer: originalTransaction.farmer,
            order: originalTransaction.order,
            type: 'refund',
            amount: refundAmount,
            paymentMethod: 'phonepe',
            paymentProvider: 'phonepe',
            paymentReference: payload.merchantTransactionId,
            description: `PhonePe refund for transaction ${merchantTransactionId}`,
            status: 'pending',
            refundReason: reason,
            refundedBy: 'buyer',
            paymentDetails: {
                originalTransactionId: merchantTransactionId,
                phonepeRefundId: data.data.merchantId,
                refundReason: reason
            }
        });

        await refundTransaction.save();

        res.json({
            success: true,
            refundTransactionId: refundTransaction._id,
            phonepeRefundId: data.data.merchantId,
            status: 'PENDING'
        });

    } catch (error) {
        console.error('Error initiating PhonePe refund:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 