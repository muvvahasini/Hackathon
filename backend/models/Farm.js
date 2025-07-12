const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Crop name is required'],
        trim: true,
        maxlength: [100, 'Crop name cannot exceed 100 characters']
    },
    variety: {
        type: String,
        trim: true,
        maxlength: [100, 'Crop variety cannot exceed 100 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Crop description cannot exceed 500 characters']
    },
    plantingDate: {
        type: Date,
        required: [true, 'Planting date is required']
    },
    expectedHarvestDate: {
        type: Date,
        required: [true, 'Expected harvest date is required']
    },
    area: {
        value: {
            type: Number,
            required: [true, 'Area value is required']
        },
        unit: {
            type: String,
            enum: ['acres', 'hectares', 'square_meters', 'square_feet'],
            default: 'acres'
        }
    },
    status: {
        type: String,
        enum: ['planted', 'growing', 'ready', 'harvested', 'dormant'],
        default: 'planted'
    },
    yield: {
        expected: {
            type: Number,
            default: 0
        },
        actual: {
            type: Number,
            default: 0
        },
        unit: {
            type: String,
            enum: ['kg', 'lbs', 'tons', 'bushels'],
            default: 'kg'
        }
    },
    price: {
        type: Number,
        min: [0, 'Price cannot be negative'],
        default: 0
    },
    isOrganic: {
        type: Boolean,
        default: false
    },
    images: [{
        url: {
            type: String,
            required: true
        },
        caption: {
            type: String,
            maxlength: [200, 'Image caption cannot exceed 200 characters']
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    notes: {
        type: String,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
}, {
    timestamps: true
});

const farmSchema = new mongoose.Schema({
    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Farmer is required']
    },
    name: {
        type: String,
        required: [true, 'Farm name is required'],
        trim: true,
        maxlength: [100, 'Farm name cannot exceed 100 characters']
    },
    description: {
        type: String,
        maxlength: [1000, 'Farm description cannot exceed 1000 characters']
    },
    location: {
        address: {
            type: String,
            required: [true, 'Farm address is required']
        },
        city: {
            type: String,
            required: [true, 'City is required']
        },
        state: {
            type: String,
            required: [true, 'State is required']
        },
        zipCode: {
            type: String,
            required: [true, 'Zip code is required']
        },
        coordinates: {
            lat: {
                type: Number,
                required: [true, 'Latitude is required']
            },
            lng: {
                type: Number,
                required: [true, 'Longitude is required']
            }
        }
    },
    totalArea: {
        value: {
            type: Number,
            required: [true, 'Total area is required']
        },
        unit: {
            type: String,
            enum: ['acres', 'hectares', 'square_meters', 'square_feet'],
            default: 'acres'
        }
    },
    farmType: {
        type: String,
        enum: ['vegetable', 'fruit', 'grain', 'dairy', 'livestock', 'mixed', 'other'],
        default: 'mixed'
    },
    certifications: [{
        type: String,
        enum: ['organic', 'non-gmo', 'fair-trade', 'local', 'sustainable', 'biodynamic', 'certified-natural']
    }],
    farmingMethods: [{
        type: String,
        enum: ['organic', 'permaculture', 'hydroponics', 'aquaponics', 'vertical-farming', 'traditional', 'regenerative']
    }],
    images: [{
        url: {
            type: String,
            required: true
        },
        caption: {
            type: String,
            maxlength: [200, 'Image caption cannot exceed 200 characters']
        },
        isPrimary: {
            type: Boolean,
            default: false
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    crops: [cropSchema],
    facilities: [{
        name: {
            type: String,
            required: true,
            maxlength: [100, 'Facility name cannot exceed 100 characters']
        },
        description: {
            type: String,
            maxlength: [300, 'Facility description cannot exceed 300 characters']
        },
        type: {
            type: String,
            enum: ['greenhouse', 'irrigation', 'storage', 'processing', 'packaging', 'other']
        }
    }],
    contactInfo: {
        phone: {
            type: String,
            match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
        },
        email: {
            type: String,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
        },
        website: {
            type: String,
            match: [/^https?:\/\/.+/, 'Please provide a valid URL']
        }
    },
    businessHours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
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
    totalRevenue: {
        type: Number,
        default: 0,
        min: 0
    },
    totalOrders: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes
farmSchema.index({ "location.coordinates": "2dsphere" });
farmSchema.index({ farmer: 1 });
farmSchema.index({ "crops.status": 1 });
farmSchema.index({ isActive: 1, isVerified: 1 });

// Virtual for primary image
farmSchema.virtual('primaryImage').get(function () {
    const primary = this.images.find(img => img.isPrimary);
    return primary ? primary.url : (this.images.length > 0 ? this.images[0].url : null);
});

// Virtual for active crops
farmSchema.virtual('activeCrops').get(function () {
    return this.crops.filter(crop =>
        ['planted', 'growing', 'ready'].includes(crop.status)
    );
});

// Virtual for total crop area
farmSchema.virtual('totalCropArea').get(function () {
    return this.crops.reduce((total, crop) => {
        // Convert all areas to acres for calculation
        let areaInAcres = crop.area.value;
        if (crop.area.unit === 'hectares') {
            areaInAcres = crop.area.value * 2.47105;
        } else if (crop.area.unit === 'square_meters') {
            areaInAcres = crop.area.value * 0.000247105;
        } else if (crop.area.unit === 'square_feet') {
            areaInAcres = crop.area.value * 0.0000229568;
        }
        return total + areaInAcres;
    }, 0);
});

// Method to add crop
farmSchema.methods.addCrop = function (cropData) {
    this.crops.push(cropData);
    return this.save();
};

// Method to update crop
farmSchema.methods.updateCrop = function (cropId, cropData) {
    const cropIndex = this.crops.findIndex(crop => crop._id.toString() === cropId);
    if (cropIndex !== -1) {
        this.crops[cropIndex] = { ...this.crops[cropIndex].toObject(), ...cropData };
        return this.save();
    }
    throw new Error('Crop not found');
};

// Method to remove crop
farmSchema.methods.removeCrop = function (cropId) {
    this.crops = this.crops.filter(crop => crop._id.toString() !== cropId);
    return this.save();
};

// Method to add image
farmSchema.methods.addImage = function (imageData) {
    // If this is the first image, make it primary
    if (this.images.length === 0) {
        imageData.isPrimary = true;
    }
    this.images.push(imageData);
    return this.save();
};

// Method to set primary image
farmSchema.methods.setPrimaryImage = function (imageId) {
    this.images.forEach(img => {
        img.isPrimary = img._id.toString() === imageId;
    });
    return this.save();
};

// Method to remove image
farmSchema.methods.removeImage = function (imageId) {
    const imageToRemove = this.images.find(img => img._id.toString() === imageId);
    if (imageToRemove && imageToRemove.isPrimary && this.images.length > 1) {
        // Set the next image as primary
        const nextImage = this.images.find(img => img._id.toString() !== imageId);
        if (nextImage) {
            nextImage.isPrimary = true;
        }
    }
    this.images = this.images.filter(img => img._id.toString() !== imageId);
    return this.save();
};

// Method to get public farm data
farmSchema.methods.getPublicData = function () {
    const farmObject = this.toObject();
    delete farmObject.contactInfo;
    delete farmObject.businessHours;
    return farmObject;
};

module.exports = mongoose.model('Farm', farmSchema); 