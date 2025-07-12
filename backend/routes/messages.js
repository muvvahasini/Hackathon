const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/messages/conversations
// @desc    Get user conversations
// @access  Private
router.get('/conversations', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const conversations = await Conversation.getByUser(req.user._id, {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
    });

    const total = await Conversation.countDocuments({
        participants: req.user._id,
        isActive: true
    });

    res.json({
        success: true,
        data: {
            conversations,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        }
    });
}));

// @route   GET /api/messages/conversations/:id
// @desc    Get conversation by ID
// @access  Private
router.get('/conversations/:id', asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id)
        .populate('participants', 'firstName lastName profileImage role')
        .populate('lastMessage', 'content type sender createdAt')
        .populate('metadata.order', 'orderNumber status total')
        .populate('metadata.product', 'name images price');

    if (!conversation) {
        throw new AppError('Conversation not found', 404);
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
        participant => participant._id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
        throw new AppError('Access denied', 403);
    }

    // Reset unread count for this user
    await conversation.resetUnread(req.user._id);

    res.json({
        success: true,
        data: { conversation }
    });
}));

// @route   POST /api/messages/conversations
// @desc    Create or find conversation
// @access  Private
router.post('/conversations',
    auth,
    [
        body('participantId')
            .isMongoId()
            .withMessage('Valid participant ID is required'),
        body('metadata.order')
            .optional()
            .isMongoId()
            .withMessage('Valid order ID is required'),
        body('metadata.product')
            .optional()
            .isMongoId()
            .withMessage('Valid product ID is required'),
        body('metadata.subject')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Subject cannot exceed 200 characters')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { participantId, metadata = {} } = req.body;

        // Check if user is trying to create conversation with themselves
        if (participantId === req.user._id.toString()) {
            throw new AppError('Cannot create conversation with yourself', 400);
        }

        // Verify participant exists
        const User = require('../models/User');
        const participant = await User.findById(participantId);
        if (!participant || !participant.isActive) {
            throw new AppError('Participant not found', 404);
        }

        // Create or find conversation
        const conversation = await Conversation.findOrCreate(
            [req.user._id, participantId],
            metadata
        );

        const populatedConversation = await Conversation.findById(conversation._id)
            .populate('participants', 'firstName lastName profileImage role')
            .populate('metadata.order', 'orderNumber status total')
            .populate('metadata.product', 'name images price');

        res.status(201).json({
            success: true,
            message: 'Conversation created/found successfully',
            data: { conversation: populatedConversation }
        });
    })
);

// @route   GET /api/messages/conversations/:id/messages
// @desc    Get messages in conversation
// @access  Private
router.get('/conversations/:id/messages', asyncHandler(async (req, res) => {
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
        throw new AppError('Conversation not found', 404);
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.includes(req.user._id);
    if (!isParticipant) {
        throw new AppError('Access denied', 403);
    }

    const messages = await Message.getByConversation(req.params.id, {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
    });

    const total = await Message.countDocuments({
        conversation: req.params.id,
        isDeleted: false
    });

    // Mark messages as read
    await Message.updateMany(
        {
            conversation: req.params.id,
            recipient: req.user._id,
            isRead: false,
            isDeleted: false
        },
        {
            isRead: true,
            readAt: new Date()
        }
    );

    // Reset unread count
    await conversation.resetUnread(req.user._id);

    res.json({
        success: true,
        data: {
            messages: messages.reverse(), // Show oldest first
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        }
    });
}));

// @route   POST /api/messages/conversations/:id/messages
// @desc    Send message in conversation
// @access  Private
router.post('/conversations/:id/messages',
    auth,
    [
        body('type')
            .isIn(['text', 'image', 'file', 'order'])
            .withMessage('Valid message type is required'),
        body('content.text')
            .if(body('type').equals('text'))
            .trim()
            .isLength({ min: 1, max: 2000 })
            .withMessage('Message text is required and must be less than 2000 characters'),
        body('content.image.url')
            .if(body('type').equals('image'))
            .notEmpty()
            .withMessage('Image URL is required'),
        body('content.file.url')
            .if(body('type').equals('file'))
            .notEmpty()
            .withMessage('File URL is required'),
        body('content.file.name')
            .if(body('type').equals('file'))
            .notEmpty()
            .withMessage('File name is required'),
        body('content.order.orderId')
            .if(body('type').equals('order'))
            .isMongoId()
            .withMessage('Valid order ID is required'),
        body('content.order.action')
            .if(body('type').equals('order'))
            .isIn(['created', 'updated', 'cancelled', 'delivered'])
            .withMessage('Valid order action is required'),
        body('replyTo')
            .optional()
            .isMongoId()
            .withMessage('Valid reply message ID is required')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) {
            throw new AppError('Conversation not found', 404);
        }

        // Check if user is a participant
        const isParticipant = conversation.participants.includes(req.user._id);
        if (!isParticipant) {
            throw new AppError('Access denied', 403);
        }

        // Get recipient (other participant)
        const recipient = conversation.participants.find(
            participant => participant.toString() !== req.user._id.toString()
        );

        if (!recipient) {
            throw new AppError('No recipient found', 400);
        }

        const { type, content, replyTo } = req.body;

        // Create message
        const messageData = {
            sender: req.user._id,
            recipient,
            conversation: conversation._id,
            type,
            content,
            replyTo
        };

        const message = new Message(messageData);
        await message.save();

        // Update conversation
        await conversation.updateLastMessage(message._id, message.createdAt);
        await conversation.incrementUnread(recipient);

        // Emit socket event for real-time messaging
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${recipient}`).emit('new_message', {
                message: await Message.findById(message._id)
                    .populate('sender', 'firstName lastName profileImage'),
                conversation: conversation._id
            });
        }

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'firstName lastName profileImage')
            .populate('recipient', 'firstName lastName profileImage')
            .populate('replyTo', 'content.text sender');

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: { message: populatedMessage }
        });
    })
);

// @route   PUT /api/messages/:id
// @desc    Edit message
// @access  Private (owner only)
router.put('/:id',
    auth,
    [
        body('content.text')
            .trim()
            .isLength({ min: 1, max: 2000 })
            .withMessage('Message text is required and must be less than 2000 characters')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { content } = req.body;
        const message = await Message.findById(req.params.id);

        if (!message) {
            throw new AppError('Message not found', 404);
        }

        // Check if user owns the message
        if (message.sender.toString() !== req.user._id.toString()) {
            throw new AppError('You can only edit your own messages', 403);
        }

        // Check if message can be edited (within time limit)
        const timeLimit = 5 * 60 * 1000; // 5 minutes
        const timeSinceCreated = Date.now() - message.createdAt.getTime();

        if (timeSinceCreated > timeLimit) {
            throw new AppError('Message can only be edited within 5 minutes', 400);
        }

        await message.editMessage(content.text);

        const updatedMessage = await Message.findById(message._id)
            .populate('sender', 'firstName lastName profileImage')
            .populate('recipient', 'firstName lastName profileImage')
            .populate('replyTo', 'content.text sender');

        res.json({
            success: true,
            message: 'Message edited successfully',
            data: { message: updatedMessage }
        });
    })
);

// @route   DELETE /api/messages/:id
// @desc    Delete message
// @access  Private (owner only)
router.delete('/:id',
    auth,
    asyncHandler(async (req, res) => {
        const message = await Message.findById(req.params.id);

        if (!message) {
            throw new AppError('Message not found', 404);
        }

        // Check if user owns the message
        if (message.sender.toString() !== req.user._id.toString()) {
            throw new AppError('You can only delete your own messages', 403);
        }

        await message.softDelete(req.user._id);

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    })
);

// @route   GET /api/messages/unread-count
// @desc    Get unread message count
// @access  Private
router.get('/unread-count', asyncHandler(async (req, res) => {
    const unreadCount = await Message.getUnreadCount(req.user._id);

    res.json({
        success: true,
        data: { unreadCount }
    });
}));

// @route   PUT /api/messages/conversations/:id/read
// @desc    Mark conversation as read
// @access  Private
router.put('/conversations/:id/read',
    auth,
    asyncHandler(async (req, res) => {
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            throw new AppError('Conversation not found', 404);
        }

        // Check if user is a participant
        const isParticipant = conversation.participants.includes(req.user._id);
        if (!isParticipant) {
            throw new AppError('Access denied', 403);
        }

        await Message.markConversationAsRead(req.params.id, req.user._id);
        await conversation.resetUnread(req.user._id);

        res.json({
            success: true,
            message: 'Conversation marked as read'
        });
    })
);

// @route   PUT /api/messages/conversations/:id/mute
// @desc    Toggle conversation mute
// @access  Private
router.put('/conversations/:id/mute',
    auth,
    asyncHandler(async (req, res) => {
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            throw new AppError('Conversation not found', 404);
        }

        // Check if user is a participant
        const isParticipant = conversation.participants.includes(req.user._id);
        if (!isParticipant) {
            throw new AppError('Access denied', 403);
        }

        await conversation.toggleMute(req.user._id);

        res.json({
            success: true,
            message: 'Conversation mute toggled'
        });
    })
);

module.exports = router; 