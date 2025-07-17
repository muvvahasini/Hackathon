import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../contexts/SocketContext'
import { messagesAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import './Messages.css'

const Messages = () => {
    const { user } = useAuth()
    const { socket, isConnected, sendMessage, joinConversation, leaveConversation } = useSocket()
    const [conversations, setConversations] = useState([])
    const [selectedConversation, setSelectedConversation] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef(null)

    // Sample conversations for demonstration
    const sampleConversations = [
        {
            _id: 'conv1',
            participants: [
                { _id: user?._id, firstName: user?.firstName, lastName: user?.lastName, role: user?.role },
                { _id: 'farmer1', firstName: 'Maria', lastName: 'Gonzalez', role: 'farmer' }
            ],
            lastMessage: {
                content: 'The tomatoes will be ready for pickup tomorrow!',
                createdAt: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
            },
            unreadCount: 2
        },
        {
            _id: 'conv2',
            participants: [
                { _id: user?._id, firstName: user?.firstName, lastName: user?.lastName, role: user?.role },
                { _id: 'buyer1', firstName: 'John', lastName: 'Smith', role: 'buyer' }
            ],
            lastMessage: {
                content: 'Can you deliver to downtown area?',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
            },
            unreadCount: 0
        },
        {
            _id: 'conv3',
            participants: [
                { _id: user?._id, firstName: user?.firstName, lastName: user?.lastName, role: user?.role },
                { _id: 'farmer2', firstName: 'James', lastName: 'Wilson', role: 'farmer' }
            ],
            lastMessage: {
                content: 'The organic carrots are available now',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
            },
            unreadCount: 1
        }
    ]

    // Sample messages for each conversation
    const sampleMessages = {
        conv1: [
            {
                _id: 'msg1',
                content: 'Hi! I saw your fresh tomatoes on GreenFarm. Are they still available?',
                sender: { _id: user?._id, firstName: user?.firstName, lastName: user?.lastName },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
            },
            {
                _id: 'msg2',
                content: 'Yes, I have about 20kg available. They\'re organic and freshly harvested!',
                sender: { _id: 'farmer1', firstName: 'Maria', lastName: 'Gonzalez' },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5)
            },
            {
                _id: 'msg3',
                content: 'Perfect! What\'s the price per kg?',
                sender: { _id: user?._id, firstName: user?.firstName, lastName: user?.lastName },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1)
            },
            {
                _id: 'msg4',
                content: '$3.50 per kg. The tomatoes will be ready for pickup tomorrow!',
                sender: { _id: 'farmer1', firstName: 'Maria', lastName: 'Gonzalez' },
                createdAt: new Date(Date.now() - 1000 * 60 * 30)
            }
        ],
        conv2: [
            {
                _id: 'msg5',
                content: 'Hi! I\'m interested in your organic vegetables',
                sender: { _id: 'buyer1', firstName: 'John', lastName: 'Smith' },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3)
            },
            {
                _id: 'msg6',
                content: 'Great! I have fresh lettuce, spinach, and kale available',
                sender: { _id: user?._id, firstName: user?.firstName, lastName: user?.lastName },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2.5)
            },
            {
                _id: 'msg7',
                content: 'Can you deliver to downtown area?',
                sender: { _id: 'buyer1', firstName: 'John', lastName: 'Smith' },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
            }
        ],
        conv3: [
            {
                _id: 'msg8',
                content: 'Hello! Do you have any organic carrots available?',
                sender: { _id: user?._id, firstName: user?.firstName, lastName: user?.lastName },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
            },
            {
                _id: 'msg9',
                content: 'Yes! The organic carrots are available now. $2.50 per kg',
                sender: { _id: 'farmer2', firstName: 'James', lastName: 'Wilson' },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
            }
        ]
    }

    useEffect(() => {
        // Load sample conversations for demonstration
        setConversations(sampleConversations)
        if (sampleConversations.length > 0) {
            setSelectedConversation(sampleConversations[0])
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        if (selectedConversation) {
            // Load sample messages for the selected conversation
            const conversationMessages = sampleMessages[selectedConversation._id] || []
            setMessages(conversationMessages)
            scrollToBottom()
        }
    }, [selectedConversation])

    useEffect(() => {
        if (socket) {
            socket.on('new_message', handleNewMessage)
            socket.on('message_sent', handleMessageSent)

            return () => {
                socket.off('new_message')
                socket.off('message_sent')
            }
        }
    }, [socket, selectedConversation])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleNewMessage = (data) => {
        if (data.conversationId === selectedConversation?._id) {
            setMessages(prev => [...prev, data.message])
            scrollToBottom()
        }
        // Update conversation list to show latest message
        updateConversationLastMessage(data.conversationId, data.message)
    }

    const handleMessageSent = (data) => {
        if (data.conversationId === selectedConversation?._id) {
            setMessages(prev => [...prev, data.message])
            scrollToBottom()
        }
    }

    const updateConversationLastMessage = (conversationId, message) => {
        setConversations(prev => prev.map(conv => 
            conv._id === conversationId 
                ? { ...conv, lastMessage: message, unreadCount: conv.unreadCount + 1 }
                : conv
        ))
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim() || !selectedConversation || sending) return

        const messageContent = newMessage.trim()
        setNewMessage('')
        setSending(true)

        try {
            // Create a temporary message for immediate UI feedback
            const tempMessage = {
                _id: `temp_${Date.now()}`,
                content: messageContent,
                sender: { _id: user?._id, firstName: user?.firstName, lastName: user?.lastName },
                createdAt: new Date(),
                isPending: true
            }

            setMessages(prev => [...prev, tempMessage])
            scrollToBottom()

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Remove pending status and update with real message
            setMessages(prev => prev.map(msg => 
                msg._id === tempMessage._id 
                    ? { ...msg, _id: `msg_${Date.now()}`, isPending: false }
                    : msg
            ))

            // Update conversation last message
            updateConversationLastMessage(selectedConversation._id, tempMessage)

            // If using real socket, send the message
            if (socket && isConnected) {
                await sendMessage(selectedConversation._id, messageContent)
            }

        } catch (error) {
            console.error('Error sending message:', error)
            // Remove the failed message
            setMessages(prev => prev.filter(msg => msg._id !== `temp_${Date.now()}`))
        } finally {
            setSending(false)
        }
    }

    const getOtherParticipant = (conversation) => {
        return conversation.participants.find(p => p._id !== user?._id)
    }

    const formatTime = (date) => {
        const now = new Date()
        const messageDate = new Date(date)
        const diffInHours = (now - messageDate) / (1000 * 60 * 60)

        if (diffInHours < 1) {
            return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`
        } else {
            return messageDate.toLocaleDateString()
        }
    }

    const markConversationAsRead = (conversationId) => {
        setConversations(prev => prev.map(conv => 
            conv._id === conversationId 
                ? { ...conv, unreadCount: 0 }
                : conv
        ))
    }

    if (loading) {
        return (
            <div className="messages-page">
                <div className="messages-container">
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Loading conversations...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="messages-page">
            <div className="messages-container">
                <div className="messages-header">
                    <h1>Messages</h1>
                    <p>Connect with farmers and customers</p>
                </div>

                <div className="messages-layout">
                    {/* Conversations List */}
                    <div className="conversations-panel">
                        <div className="conversations-header">
                            <h3>Conversations</h3>
                            <span className="connection-status">
                                {isConnected ? '🟢 Online' : '🔴 Offline'}
                            </span>
                        </div>

                        <div className="conversations-list">
                            {conversations.length === 0 ? (
                                <div className="empty-conversations">
                                    <div className="empty-icon">💬</div>
                                    <p>No conversations yet</p>
                                    <p className="empty-subtitle">Start chatting with farmers or customers!</p>
                                </div>
                            ) : (
                                conversations.map((conversation) => {
                                    const otherUser = getOtherParticipant(conversation)
                                    const isActive = selectedConversation?._id === conversation._id

                                    return (
                                        <button
                                            key={conversation._id}
                                            onClick={() => {
                                                setSelectedConversation(conversation)
                                                markConversationAsRead(conversation._id)
                                            }}
                                            className={`conversation-item ${isActive ? 'active' : ''}`}
                                        >
                                            <div className="conversation-avatar">
                                                <span>{otherUser?.firstName?.charAt(0)?.toUpperCase() || 'U'}</span>
                                                {conversation.unreadCount > 0 && (
                                                    <span className="unread-badge">{conversation.unreadCount}</span>
                                                )}
                                            </div>
                                            <div className="conversation-content">
                                                <div className="conversation-header">
                                                    <h4>{otherUser?.firstName} {otherUser?.lastName}</h4>
                                                    <span className="conversation-time">
                                                        {formatTime(conversation.lastMessage?.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="conversation-preview">
                                                    {conversation.lastMessage?.content || 'No messages yet'}
                                                </p>
                                                <span className="user-role">{otherUser?.role}</span>
                                            </div>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* Chat Panel */}
                    <div className="chat-panel">
                        {selectedConversation ? (
                            <>
                                {/* Chat Header */}
                                <div className="chat-header">
                                    <div className="chat-user-info">
                                        <div className="chat-avatar">
                                            <span>
                                                {getOtherParticipant(selectedConversation)?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3>
                                                {getOtherParticipant(selectedConversation)?.firstName} {getOtherParticipant(selectedConversation)?.lastName}
                                            </h3>
                                            <p className="user-role">
                                                {getOtherParticipant(selectedConversation)?.role}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="chat-actions">
                                        <button className="action-btn" title="Call">
                                            📞
                                        </button>
                                        <button className="action-btn" title="More">
                                            ⋯
                                        </button>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="messages-list">
                                    {messages.length === 0 ? (
                                        <div className="empty-messages">
                                            <div className="empty-icon">💬</div>
                                            <h3>No messages yet</h3>
                                            <p>Start the conversation!</p>
                                        </div>
                                    ) : (
                                        messages.map((message) => {
                                            const isOwnMessage = message.sender._id === user?._id

                                            return (
                                                <div
                                                    key={message._id}
                                                    className={`message-container ${isOwnMessage ? 'own' : 'other'}`}
                                                >
                                                    <div className={`message ${isOwnMessage ? 'own' : 'other'} ${message.isPending ? 'pending' : ''}`}>
                                                        <p className="message-content">{message.content}</p>
                                                        <div className="message-meta">
                                                            <span className="message-time">
                                                                {formatTime(message.createdAt)}
                                                            </span>
                                                            {message.isPending && (
                                                                <span className="pending-indicator">⏳</span>
                                                            )}
                                                            {isOwnMessage && !message.isPending && (
                                                                <span className="sent-indicator">✓</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message Input */}
                                <div className="message-input-container">
                                    <form onSubmit={handleSendMessage} className="message-form">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Type your message..."
                                            className="message-input"
                                            disabled={sending}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim() || sending}
                                            className="send-button"
                                        >
                                            {sending ? '⏳' : '📤'}
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="no-conversation">
                                <div className="no-conversation-icon">💬</div>
                                <h3>Select a conversation</h3>
                                <p>Choose a conversation from the list to start chatting</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Messages 