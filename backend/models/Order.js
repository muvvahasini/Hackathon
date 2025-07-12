const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  unit: {
    type: String,
    required: true
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
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
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: [0, 'Delivery fee cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'other'],
    required: true
  },
  deliveryMethod: {
    type: String,
    enum: ['pickup', 'delivery'],
    required: true
  },
  deliveryAddress: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  pickupLocation: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String,
    required: true
  },
  actualDeliveryDate: {
    type: Date
  },
  notes: {
    buyer: {
      type: String,
      maxlength: [500, 'Buyer notes cannot exceed 500 characters']
    },
    farmer: {
      type: String,
      maxlength: [500, 'Farmer notes cannot exceed 500 characters']
    }
  },
  cancellationReason: {
    type: String,
    maxlength: [200, 'Cancellation reason cannot exceed 200 characters']
  },
  cancelledBy: {
    type: String,
    enum: ['buyer', 'farmer', 'system']
  },
  cancelledAt: {
    type: Date
  },
  estimatedDeliveryTime: {
    type: String
  },
  trackingNumber: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ farmer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ scheduledDate: 1 });

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Get count of orders for today
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const count = await this.constructor.countDocuments({
      createdAt: { $gte: today }
    });
    
    this.orderNumber = `GF${year}${month}${day}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Virtual for order summary
orderSchema.virtual('summary').get(function() {
  return {
    orderNumber: this.orderNumber,
    totalItems: this.items.length,
    totalQuantity: this.items.reduce((sum, item) => sum + item.quantity, 0),
    total: this.total,
    status: this.status,
    scheduledDate: this.scheduledDate
  };
});

// Virtual for status timeline
orderSchema.virtual('statusTimeline').get(function() {
  const timeline = [
    { status: 'pending', label: 'Order Placed', timestamp: this.createdAt }
  ];
  
  if (this.status !== 'pending') {
    timeline.push({ status: 'confirmed', label: 'Order Confirmed' });
  }
  
  if (['preparing', 'ready', 'delivered'].includes(this.status)) {
    timeline.push({ status: 'preparing', label: 'Preparing Order' });
  }
  
  if (['ready', 'delivered'].includes(this.status)) {
    timeline.push({ status: 'ready', label: 'Ready for Pickup/Delivery' });
  }
  
  if (this.status === 'delivered') {
    timeline.push({ status: 'delivered', label: 'Delivered', timestamp: this.actualDeliveryDate });
  }
  
  if (this.status === 'cancelled') {
    timeline.push({ status: 'cancelled', label: 'Cancelled', timestamp: this.cancelledAt });
  }
  
  return timeline;
});

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, notes = '') {
  this.status = newStatus;
  
  if (newStatus === 'delivered') {
    this.actualDeliveryDate = new Date();
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
  }
  
  if (notes) {
    this.notes.farmer = notes;
  }
  
  return this.save();
};

// Method to cancel order
orderSchema.methods.cancelOrder = function(reason, cancelledBy) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();
  
  return this.save();
};

// Method to calculate totals
orderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  this.total = this.subtotal + this.deliveryFee + this.tax;
  return this.save();
};

// Static method to get orders by user
orderSchema.statics.getByUser = function(userId, role = 'buyer') {
  const query = role === 'farmer' ? { farmer: userId } : { buyer: userId };
  
  return this.find(query)
    .populate('buyer', 'firstName lastName email phone')
    .populate('farmer', 'firstName lastName farmName phone')
    .populate('items.product', 'name images price')
    .sort({ createdAt: -1 });
};

// Static method to get orders by status
orderSchema.statics.getByStatus = function(status, userId, role = 'buyer') {
  const query = { status };
  if (role === 'farmer') {
    query.farmer = userId;
  } else {
    query.buyer = userId;
  }
  
  return this.find(query)
    .populate('buyer', 'firstName lastName email phone')
    .populate('farmer', 'firstName lastName farmName phone')
    .populate('items.product', 'name images price')
    .sort({ createdAt: -1 });
};

// Static method to get order statistics
orderSchema.statics.getStats = function(userId, role = 'buyer') {
  const query = role === 'farmer' ? { farmer: userId } : { buyer: userId };
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$total' }
      }
    }
  ]);
};

module.exports = mongoose.model('Order', orderSchema); 