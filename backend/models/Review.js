const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  rating: {
    type: Number,
    required: true,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    trim: true,
    maxlength: [100, 'Review title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    maxlength: [1000, 'Review comment cannot exceed 1000 characters']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      maxlength: [100, 'Image caption cannot exceed 100 characters']
    }
  }],
  categories: {
    quality: {
      type: Number,
      min: [1, 'Quality rating must be at least 1'],
      max: [5, 'Quality rating cannot exceed 5']
    },
    communication: {
      type: Number,
      min: [1, 'Communication rating must be at least 1'],
      max: [5, 'Communication rating cannot exceed 5']
    },
    delivery: {
      type: Number,
      min: [1, 'Delivery rating must be at least 1'],
      max: [5, 'Delivery rating cannot exceed 5']
    },
    value: {
      type: Number,
      min: [1, 'Value rating must be at least 1'],
      max: [5, 'Value rating cannot exceed 5']
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isHelpful: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    helpful: {
      type: Boolean,
      required: true
    }
  }],
  helpfulCount: {
    type: Number,
    default: 0
  },
  isReported: {
    type: Boolean,
    default: false
  },
  reportReason: {
    type: String,
    enum: ['inappropriate', 'spam', 'fake', 'other']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
reviewSchema.index({ reviewedUser: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ isVerified: 1 });

// Ensure one review per order per reviewer
reviewSchema.index({ order: 1, reviewer: 1 }, { unique: true });

// Virtual for average category rating
reviewSchema.virtual('averageCategoryRating').get(function() {
  if (!this.categories) return this.rating;
  
  const categories = Object.values(this.categories).filter(rating => rating);
  if (categories.length === 0) return this.rating;
  
  return categories.reduce((sum, rating) => sum + rating, 0) / categories.length;
});

// Virtual for review summary
reviewSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    rating: this.rating,
    title: this.title,
    comment: this.comment.substring(0, 100) + (this.comment.length > 100 ? '...' : ''),
    reviewer: this.reviewer,
    createdAt: this.createdAt,
    helpfulCount: this.helpfulCount,
    isVerified: this.isVerified
  };
});

// Method to mark review as helpful/unhelpful
reviewSchema.methods.markHelpful = function(userId, helpful) {
  const existingIndex = this.isHelpful.findIndex(item => item.user.toString() === userId.toString());
  
  if (existingIndex > -1) {
    // Update existing helpful mark
    const wasHelpful = this.isHelpful[existingIndex].helpful;
    this.isHelpful[existingIndex].helpful = helpful;
    
    if (wasHelpful && !helpful) {
      this.helpfulCount -= 1;
    } else if (!wasHelpful && helpful) {
      this.helpfulCount += 1;
    }
  } else {
    // Add new helpful mark
    this.isHelpful.push({ user: userId, helpful });
    if (helpful) {
      this.helpfulCount += 1;
    }
  }
  
  return this.save();
};

// Method to report review
reviewSchema.methods.reportReview = function(reason) {
  this.isReported = true;
  this.reportReason = reason;
  return this.save();
};

// Static method to get reviews by user
reviewSchema.statics.getByUser = function(userId, options = {}) {
  const query = { reviewedUser: userId, isActive: true };
  
  if (options.rating) {
    query.rating = options.rating;
  }
  
  return this.find(query)
    .populate('reviewer', 'firstName lastName profileImage')
    .populate('product', 'name images')
    .sort({ createdAt: -1 })
    .limit(options.limit || 10)
    .skip(options.skip || 0);
};

// Static method to get reviews by product
reviewSchema.statics.getByProduct = function(productId, options = {}) {
  const query = { product: productId, isActive: true };
  
  if (options.rating) {
    query.rating = options.rating;
  }
  
  return this.find(query)
    .populate('reviewer', 'firstName lastName profileImage')
    .sort({ createdAt: -1 })
    .limit(options.limit || 10)
    .skip(options.skip || 0);
};

// Static method to get review statistics
reviewSchema.statics.getStats = function(userId) {
  return this.aggregate([
    { $match: { reviewedUser: mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);
};

// Static method to get average rating
reviewSchema.statics.getAverageRating = function(userId) {
  return this.aggregate([
    { $match: { reviewedUser: mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);
};

// Update user rating when review is saved
reviewSchema.post('save', async function() {
  const Review = this.constructor;
  const User = require('./User');
  
  try {
    // Calculate average rating for reviewed user
    const stats = await Review.getAverageRating(this.reviewedUser);
    
    if (stats.length > 0) {
      const { averageRating, totalReviews } = stats[0];
      
      await User.findByIdAndUpdate(this.reviewedUser, {
        'rating.average': Math.round(averageRating * 10) / 10,
        'rating.count': totalReviews
      });
    }
  } catch (error) {
    console.error('Error updating user rating:', error);
  }
});

// Update user rating when review is deleted
reviewSchema.post('remove', async function() {
  const Review = this.constructor;
  const User = require('./User');
  
  try {
    // Recalculate average rating for reviewed user
    const stats = await Review.getAverageRating(this.reviewedUser);
    
    if (stats.length > 0) {
      const { averageRating, totalReviews } = stats[0];
      
      await User.findByIdAndUpdate(this.reviewedUser, {
        'rating.average': Math.round(averageRating * 10) / 10,
        'rating.count': totalReviews
      });
    } else {
      // No reviews left, reset rating
      await User.findByIdAndUpdate(this.reviewedUser, {
        'rating.average': 0,
        'rating.count': 0
      });
    }
  } catch (error) {
    console.error('Error updating user rating:', error);
  }
});

module.exports = mongoose.model('Review', reviewSchema); 