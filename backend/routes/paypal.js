const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const { generateTransactionId } = require('../utils/transactionUtils');

// PayPal configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'your_paypal_client_id';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'your_paypal_client_secret';
const PAYPAL_MODE = process.env.NODE_ENV === 'production' ? 'live' : 'sandbox';

// PayPal API base URL
const PAYPAL_BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://sandbox.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Get PayPal access token
async function getPayPalAccessToken() {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    throw error;
  }
}

router.get('/client-id', (req, res) => {
  res.json({ clientId: PAYPAL_CLIENT_ID });
});

// @route   POST /api/paypal/create-order
// @desc    Create a PayPal order
// @access  Private
router.post('/create-order', auth, async (req, res) => {
  try {
    const { amount, orderData } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const accessToken = await getPayPalAccessToken();

    const paypalOrder = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount.toString(),
          },
          description: `GreenFarm Order - ${orderData?.orderNumber || 'New Order'}`,
          custom_id: orderData?.orderId || 'order_' + Date.now(),
        },
      ],
      application_context: {
        return_url: `${req.protocol}://${req.get('host')}/payment-success`,
        cancel_url: `${req.protocol}://${req.get('host')}/payment-cancelled`,
      },
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paypalOrder),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal create order error:', data);
      return res.status(400).json({
        message: 'Failed to create PayPal order',
        error: data
      });
    }

    // Create transaction record
    const transaction = new Transaction({
      transactionId: generateTransactionId(),
      buyer: req.user.id,
      farmer: orderData?.farmerId || req.user.id,
      order: orderData?.orderId || null,
      type: 'payment',
      amount: amount,
      paymentMethod: 'paypal',
      paymentProvider: 'paypal',
      paymentReference: data.id,
      description: `PayPal payment for order ${orderData?.orderNumber || 'New Order'}`,
      status: 'pending',
      paymentDetails: {
        paypalOrderId: data.id,
        paypalIntent: data.intent,
        orderData: orderData,
      },
    });


    await transaction.save();

    res.json({
      orderID: data.id,
      status: data.status,
      transactionId: transaction._id,
    });
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/paypal/capture-order/:orderID
// @desc    Capture a PayPal payment
// @access  Private
router.post('/capture-order/:orderID', auth, async (req, res) => {
  try {
    const { orderID } = req.params;

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal capture error:', data);
      return res.status(400).json({
        message: 'Failed to capture PayPal payment',
        error: data
      });
    }

    // Update transaction status
    const transaction = await Transaction.findOne({
      paymentReference: orderID,
      buyer: req.user.id
    });

    if (transaction) {
      transaction.status = 'completed';
      transaction.processedAt = new Date();
      transaction.paymentDetails = {
        ...transaction.paymentDetails,
        paypalCaptureId: data.purchase_units[0].payments.captures[0].id,
        paypalStatus: data.status,
        paypalPayerId: data.payer.payer_id,
      };
      await transaction.save();

      // Update order status if exists
      if (transaction.order) {
        const order = await Order.findById(transaction.order);
        if (order) {
          order.status = 'confirmed';
          order.paymentStatus = 'paid';
          await order.save();
        }
      }
    }

    res.json({
      success: true,
      orderID: data.id,
      status: data.status,
      captureID: data.purchase_units[0].payments.captures[0].id,
      transaction: transaction,
    });
  } catch (error) {
    console.error('Error capturing PayPal payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/paypal/update-transaction/:transactionId
// @desc    Update transaction with order details
// @access  Private
router.put('/update-transaction/:transactionId', auth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { orderId, orderNumber, farmerId } = req.body;

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if user has access to this transaction
    if (transaction.buyer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update transaction with order details
    transaction.order = orderId;
    transaction.farmer = farmerId;
    transaction.description = `PayPal payment for order ${orderNumber}`;

    if (transaction.paymentDetails) {
      transaction.paymentDetails.orderNumber = orderNumber;
      transaction.paymentDetails.orderId = orderId;
    }

    await transaction.save();

    res.json({
      success: true,
      transaction: transaction,
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/paypal/order/:orderID
// @desc    Get PayPal order details
// @access  Private
router.get('/order/:orderID', auth, async (req, res) => {
  try {
    const { orderID } = req.params;

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        message: 'Failed to get PayPal order',
        error: data
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Error getting PayPal order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 