const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'order', 'system'],
    default: 'text'
  },
  content: {
    text: {
      type: String,
      required: function() { return this.type === 'text'; },
      maxlength: [2000, 'Message text cannot exceed 2000 characters']
    },
    image: {
      url: {
        type: String,
        required: function() { return this.type === 'image'; }
      },
      caption: {
        type: String,
        maxlength: [200, 'Image caption cannot exceed 200 characters']
      }
    },
    file: {
      url: {
        type: String,
        required: function() { return this.type === 'file'; }
      },
      name: {
        type: String,
        required: function() { return this.type === 'file'; }
      },
      size: {
        type: Number,
        required: function() { return this.type === 'file'; }
      },
      type: {
        type: String,
        required: function() { return this.type === 'file'; }
      }
    },
    order: {
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: function() { return this.type === 'order'; }
      },
      action: {
        type: String,
        enum: ['created', 'updated', 'cancelled', 'delivered'],
        required: function() { return this.type === 'order'; }
      }
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ isDelivered: 1 });

// Virtual for message preview
messageSchema.virtual('preview').get(function() {
  if (this.type === 'text') {
    return this.content.text.length > 50 
      ? this.content.text.substring(0, 50) + '...' 
      : this.content.text;
  } else if (this.type === 'image') {
    return '📷 Image';
  } else if (this.type === 'file') {
    return `📎 ${this.content.file.name}`;
  } else if (this.type === 'order') {
    return `📦 Order ${this.content.order.action}`;
  }
  return 'Message';
});

// Virtual for message status
messageSchema.virtual('status').get(function() {
  if (this.isDeleted) return 'deleted';
  if (this.isRead) return 'read';
  if (this.isDelivered) return 'delivered';
  return 'sent';
});

// Method to mark as read
messageSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to mark as delivered
messageSchema.methods.markAsDelivered = function() {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to edit message
messageSchema.methods.editMessage = function(newText) {
  if (this.type !== 'text') {
    throw new Error('Only text messages can be edited');
  }
  
  this.content.text = newText;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  const existingIndex = this.reactions.findIndex(
    reaction => reaction.user.toString() === userId.toString()
  );
  
  if (existingIndex > -1) {
    // Update existing reaction
    this.reactions[existingIndex].emoji = emoji;
  } else {
    // Add new reaction
    this.reactions.push({ user: userId, emoji });
  }
  
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to soft delete message
messageSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Static method to get messages by conversation
messageSchema.statics.getByConversation = function(conversationId, options = {}) {
  const query = { 
    conversation: conversationId, 
    isDeleted: false 
  };
  
  return this.find(query)
    .populate('sender', 'firstName lastName profileImage')
    .populate('recipient', 'firstName lastName profileImage')
    .populate('replyTo', 'content.text sender')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to get unread count
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false
  });
};

// Static method to mark conversation as read
messageSchema.statics.markConversationAsRead = function(conversationId, userId) {
  return this.updateMany(
    {
      conversation: conversationId,
      recipient: userId,
      isRead: false,
      isDeleted: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

module.exports = mongoose.model('Message', messageSchema); 