const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    subject: {
      type: String,
      maxlength: [200, 'Subject cannot exceed 200 characters']
    }
  },
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    muted: {
      type: Map,
      of: Boolean,
      default: new Map()
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ 'metadata.order': 1 });

// Ensure unique conversations between two users
conversationSchema.index({ participants: 1 }, { unique: true });

// Virtual for conversation title
conversationSchema.virtual('title').get(function() {
  if (this.metadata.subject) {
    return this.metadata.subject;
  }
  if (this.metadata.order) {
    return `Order Discussion`;
  }
  if (this.metadata.product) {
    return `Product Inquiry`;
  }
  return `Chat`;
});

// Method to add participant
conversationSchema.methods.addParticipant = function(userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    this.unreadCount.set(userId.toString(), 0);
    this.settings.muted.set(userId.toString(), false);
  }
  return this.save();
};

// Method to remove participant
conversationSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(
    participant => participant.toString() !== userId.toString()
  );
  this.unreadCount.delete(userId.toString());
  this.settings.muted.delete(userId.toString());
  return this.save();
};

// Method to update last message
conversationSchema.methods.updateLastMessage = function(messageId, messageAt) {
  this.lastMessage = messageId;
  this.lastMessageAt = messageAt || new Date();
  return this.save();
};

// Method to increment unread count
conversationSchema.methods.incrementUnread = function(userId) {
  const currentCount = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), currentCount + 1);
  return this.save();
};

// Method to reset unread count
conversationSchema.methods.resetUnread = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
  return this.save();
};

// Method to toggle mute
conversationSchema.methods.toggleMute = function(userId) {
  const isMuted = this.settings.muted.get(userId.toString()) || false;
  this.settings.muted.set(userId.toString(), !isMuted);
  return this.save();
};

// Static method to find or create conversation
conversationSchema.statics.findOrCreate = async function(participantIds, metadata = {}) {
  // Sort participant IDs for consistent lookup
  const sortedParticipants = participantIds.sort();
  
  let conversation = await this.findOne({ participants: sortedParticipants });
  
  if (!conversation) {
    conversation = new this({
      participants: sortedParticipants,
      metadata,
      unreadCount: new Map(sortedParticipants.map(id => [id.toString(), 0])),
      settings: {
        notifications: true,
        muted: new Map(sortedParticipants.map(id => [id.toString(), false]))
      }
    });
    await conversation.save();
  }
  
  return conversation;
};

// Static method to get conversations by user
conversationSchema.statics.getByUser = function(userId, options = {}) {
  return this.find({ participants: userId, isActive: true })
    .populate('participants', 'firstName lastName profileImage role')
    .populate('lastMessage', 'content type sender createdAt')
    .populate('metadata.order', 'orderNumber status total')
    .populate('metadata.product', 'name images price')
    .sort({ lastMessageAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

// Static method to get conversation with unread count
conversationSchema.statics.getWithUnreadCount = function(userId) {
  return this.aggregate([
    { $match: { participants: mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $addFields: {
        unreadCount: {
          $ifNull: [
            { $arrayElemAt: [{ $objectToArray: '$unreadCount' }, 0] },
            { k: userId.toString(), v: 0 }
          ]
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'participants',
        foreignField: '_id',
        as: 'participants'
      }
    },
    {
      $lookup: {
        from: 'messages',
        localField: 'lastMessage',
        foreignField: '_id',
        as: 'lastMessage'
      }
    },
    {
      $unwind: {
        path: '$lastMessage',
        preserveNullAndEmptyArrays: true
      }
    },
    { $sort: { lastMessageAt: -1 } }
  ]);
};

module.exports = mongoose.model('Conversation', conversationSchema); 