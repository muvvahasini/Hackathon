const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  role: {
    type: String,
    enum: ['farmer', 'buyer', 'admin'],
    default: 'buyer'
  },
  profileImage: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  // Default location for user (can be overridden by farm locations)
  location: {
    address: {
      type: String,
      required: function () { return this.role === 'farmer'; }
    },
    city: {
      type: String,
      required: function () { return this.role === 'farmer'; }
    },
    state: {
      type: String,
      required: function () { return this.role === 'farmer'; }
    },
    zipCode: {
      type: String,
      required: function () { return this.role === 'farmer'; }
    }
  },
  // Farmer-specific fields
  certifications: [{
    type: String,
    enum: ['organic', 'non-gmo', 'fair-trade', 'local', 'sustainable', 'biodynamic']
  }],
  farmingMethods: [{
    type: String,
    enum: ['organic', 'permaculture', 'hydroponics', 'aquaponics', 'vertical-farming', 'traditional']
  }],
  // Buyer-specific fields
  preferences: {
    organic: { type: Boolean, default: false },
    local: { type: Boolean, default: false },
    delivery: { type: Boolean, default: false },
    pickup: { type: Boolean, default: true }
  },
  // Common fields
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
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
  }
}, {
  timestamps: true
});

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for profile completion
userSchema.virtual('profileCompletion').get(function () {
  let completion = 0;
  const fields = ['firstName', 'lastName', 'email', 'phone', 'bio'];

  if (this.role === 'farmer') {
    fields.push('location');
  }

  fields.forEach(field => {
    if (this[field] && (typeof this[field] === 'string' ? this[field].trim() : true)) {
      completion += 1;
    }
  });

  return Math.round((completion / fields.length) * 100);
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.email;
  delete userObject.phone;
  
  // Ensure role is included in the response
  return {
    _id: userObject._id,
    username: userObject.username,
    firstName: userObject.firstName,
    lastName: userObject.lastName,
    role: userObject.role,
    bio: userObject.bio,
    profileImage: userObject.profileImage,
    location: userObject.location,
    certifications: userObject.certifications,
    farmingMethods: userObject.farmingMethods,
    preferences: userObject.preferences,
    isVerified: userObject.isVerified,
    isActive: userObject.isActive,
    rating: userObject.rating,
    profileCompletion: userObject.profileCompletion,
    createdAt: userObject.createdAt,
    updatedAt: userObject.updatedAt
  };
};

// Update last active timestamp
userSchema.methods.updateLastActive = function () {
  this.lastActive = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema); 