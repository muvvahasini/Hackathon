const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true, // <--- THIS is causing the error if not passed
        validateBeforeSave: false,
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['payment', 'refund', 'commission', 'delivery_fee', 'tax'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount cannot be negative']
    },
    currency: {
        type: String,
        default: 'USD'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'phonepe', 'paypal', 'online', 'bank_transfer', 'mobile_money'],
        required: true
    },
    paymentProvider: {
        type: String,
        enum: ['stripe', 'paypal', 'phonepe', 'square', 'cash', 'other'],
        default: 'other'
    },
    paymentReference: {
        type: String
    },
    paymentDetails: {
        // PhonePe specific fields
        phonepePhone: String,
        phonepeUpi: String,
        // PayPal specific fields
        paypalEmail: String,
        // Card specific fields
        cardNumber: String,
        cardName: String,
        cardExpiry: String,
        cardCvv: String
    },
    description: {
        type: String,
        required: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    metadata: {
        orderNumber: String,
        items: [{
            productName: String,
            quantity: Number,
            price: Number
        }],
        subtotal: Number,
        deliveryFee: Number,
        tax: Number,
        total: Number
    },
    processedAt: {
        type: Date
    },
    failureReason: {
        type: String,
        maxlength: [200, 'Failure reason cannot exceed 200 characters']
    },
    refundReason: {
        type: String,
        maxlength: [200, 'Refund reason cannot exceed 200 characters']
    },
    refundedAt: {
        type: Date
    },
    refundedBy: {
        type: String,
        enum: ['buyer', 'farmer', 'system', 'admin']
    },
    notes: {
        type: String,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
}, {
    timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ buyer: 1, createdAt: -1 });
transactionSchema.index({ farmer: 1, createdAt: -1 });
transactionSchema.index({ order: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ createdAt: -1 });

// Note: transactionId is now generated manually in routes before creating Transaction instances

// Virtual for transaction summary
transactionSchema.virtual('summary').get(function () {
    return {
        transactionId: this.transactionId,
        type: this.type,
        amount: this.amount,
        status: this.status,
        createdAt: this.createdAt
    };
});

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function () {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: this.currency
    }).format(this.amount);
});

// Static method to get transaction statistics
transactionSchema.statics.getStats = async function (userId, timeframe = '30d') {
    const dateFilter = {};
    const now = new Date();

    switch (timeframe) {
        case '7d':
            dateFilter.$gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            dateFilter.$gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case '90d':
            dateFilter.$gte = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case '1y':
            dateFilter.$gte = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
    }

    const matchStage = {
        $or: [
            { buyer: mongoose.Types.ObjectId(userId) },
            { farmer: mongoose.Types.ObjectId(userId) }
        ]
    };

    if (Object.keys(dateFilter).length > 0) {
        matchStage.createdAt = dateFilter;
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                completedTransactions: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                completedAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
                },
                pendingTransactions: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                failedTransactions: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        completedTransactions: 0,
        completedAmount: 0,
        pendingTransactions: 0,
        failedTransactions: 0
    };
};

// Instance method to process transaction
transactionSchema.methods.processTransaction = async function () {
    if (this.status === 'pending') {
        this.status = 'completed';
        this.processedAt = new Date();
        await this.save();
    }
};

// Instance method to refund transaction
transactionSchema.methods.refundTransaction = async function (reason, refundedBy) {
    if (this.status === 'completed') {
        this.status = 'cancelled';
        this.refundReason = reason;
        this.refundedBy = refundedBy;
        this.refundedAt = new Date();
        await this.save();
    }
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 