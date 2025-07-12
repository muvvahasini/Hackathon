const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Product description is required'],
        maxlength: [1000, 'Product description cannot exceed 1000 characters']
    },
    category: {
        type: String,
        required: [true, 'Product category is required'],
        enum: [
            'vegetables',
            'fruits',
            'herbs',
            'grains',
            'dairy',
            'eggs',
            'meat',
            'poultry',
            'fish',
            'honey',
            'flowers',
            'seeds',
            'plants',
            'other'
        ]
    },
    subcategory: {
        type: String,
        trim: true,
        maxlength: [50, 'Subcategory cannot exceed 50 characters']
    },
    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Farmer is required']
    },
    price: {
        amount: {
            type: Number,
            required: [true, 'Price amount is required'],
            min: [0, 'Price cannot be negative']
        },
        unit: {
            type: String,
            required: [true, 'Price unit is required'],
            enum: ['lb', 'kg', 'piece', 'bunch', 'dozen', 'bag', 'bottle', 'jar', 'custom']
        },
        customUnit: {
            type: String,
            required: function () { return this.price.unit === 'custom'; }
        }
    },
    quantity: {
        available: {
            type: Number,
            required: [true, 'Available quantity is required'],
            min: [0, 'Available quantity cannot be negative']
        },
        unit: {
            type: String,
            required: [true, 'Quantity unit is required'],
            enum: ['lb', 'kg', 'piece', 'bunch', 'dozen', 'bag', 'bottle', 'jar', 'custom']
        },
        customUnit: {
            type: String,
            required: function () { return this.quantity.unit === 'custom'; }
        }
    },
    images: [{
        url: {
            type: String,
            required: true
        },
        caption: {
            type: String,
            maxlength: [100, 'Image caption cannot exceed 100 characters']
        },
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],
    certifications: [{
        type: String,
        enum: ['organic', 'non-gmo', 'fair-trade', 'local', 'sustainable', 'biodynamic']
    }],
    growingMethod: {
        type: String,
        enum: ['organic', 'permaculture', 'hydroponics', 'aquaponics', 'vertical-farming', 'traditional', 'other']
    },
    harvestDate: {
        type: Date
    },
    expiryDate: {
        type: Date
    },
    seasonality: {
        type: String,
        enum: ['spring', 'summer', 'fall', 'winter', 'year-round']
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    minimumOrder: {
        type: Number,
        default: 1,
        min: [1, 'Minimum order must be at least 1']
    },
    maximumOrder: {
        type: Number,
        min: [1, 'Maximum order must be at least 1']
    },
    deliveryOptions: {
        pickup: {
            type: Boolean,
            default: true
        },
        delivery: {
            type: Boolean,
            default: false
        },
        deliveryRadius: {
            type: Number,
            min: [0, 'Delivery radius cannot be negative'],
            required: function () { return this.deliveryOptions.delivery; }
        },
        deliveryFee: {
            type: Number,
            min: [0, 'Delivery fee cannot be negative'],
            default: 0
        }
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'Tag cannot exceed 30 characters']
    }],
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    },
    views: {
        type: Number,
        default: 0
    },
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Indexes for better query performance
productSchema.index({ farmer: 1, isAvailable: 1 });
productSchema.index({ category: 1, isAvailable: 1 });
productSchema.index({ 'price.amount': 1 });
productSchema.index({ rating: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ tags: 1 });

// Virtual for primary image
productSchema.virtual('primaryImage').get(function () {
    const primary = this.images.find(img => img.isPrimary);
    return primary ? primary.url : (this.images.length > 0 ? this.images[0].url : null);
});

// Virtual for price display
productSchema.virtual('priceDisplay').get(function () {
    const unit = this.price.unit === 'custom' ? this.price.customUnit : this.price.unit;
    return `$${this.price.amount.toFixed(2)}/${unit}`;
});

// Virtual for quantity display
productSchema.virtual('quantityDisplay').get(function () {
    const unit = this.quantity.unit === 'custom' ? this.quantity.customUnit : this.quantity.unit;
    return `${this.quantity.available} ${unit}`;
});

// Method to check if product is in season
productSchema.methods.isInSeason = function () {
    if (!this.seasonality || this.seasonality === 'year-round') return true;

    const currentMonth = new Date().getMonth();
    const seasons = {
        spring: [2, 3, 4], // March, April, May
        summer: [5, 6, 7], // June, July, August
        fall: [8, 9, 10],  // September, October, November
        winter: [11, 0, 1] // December, January, February
    };

    return seasons[this.seasonality].includes(currentMonth);
};

// Method to update views
productSchema.methods.incrementViews = function () {
    this.views += 1;
    return this.save();
};

// Method to toggle favorite
productSchema.methods.toggleFavorite = function (userId) {
    const index = this.favorites.indexOf(userId);
    if (index > -1) {
        this.favorites.splice(index, 1);
    } else {
        this.favorites.push(userId);
    }
    return this.save();
};

// Static method to search products
productSchema.statics.search = function (query, filters = {}) {
    const searchQuery = {
        isAvailable: true,
        ...filters
    };

    if (query) {
        searchQuery.$or = [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
        ];
    }

    return this.find(searchQuery)
        .populate('farmer', 'firstName lastName farmName location rating')
        .sort({ createdAt: -1 });
};

// Static method to get products by location
productSchema.statics.getByLocation = function (coordinates, maxDistance = 50) {
    return this.find({
        isAvailable: true,
        'farmer.location.coordinates': {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [coordinates.lng, coordinates.lat]
                },
                $maxDistance: maxDistance * 1000 // Convert km to meters
            }
        }
    }).populate('farmer', 'firstName lastName farmName location rating');
};

module.exports = mongoose.model('Product', productSchema); 