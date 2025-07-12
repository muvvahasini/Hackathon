import { useState, useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext'
import { messagesAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const Messages = () => {
    const { user } = useAuth()
    const { socket, isConnected, sendMessage, joinConversation, leaveConversation } = useSocket()
    const [conversations, setConversations] = useState([])
    const [selectedConversation, setSelectedConversation] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchConversations()
    }, [])

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation._id)
            joinConversation(selectedConversation._id)
        }

        return () => {
            if (selectedConversation) {
                leaveConversation(selectedConversation._id)
            }
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

    const fetchConversations = async () => {
        try {
            setLoading(true)
            const response = await messagesAPI.getConversations()
            setConversations(response.data.conversations || [])
            if (response.data.conversations?.length > 0) {
                setSelectedConversation(response.data.conversations[0])
            }
        } catch (error) {
            console.error('Error fetching conversations:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchMessages = async (conversationId) => {
        try {
            const response = await messagesAPI.getMessages(conversationId)
            setMessages(response.data.messages || [])
        } catch (error) {
            console.error('Error fetching messages:', error)
        }
    }

    const handleNewMessage = (data) => {
        if (data.conversationId === selectedConversation?._id) {
            setMessages(prev => [...prev, data.message])
        }
        // Update conversation list to show latest message
        fetchConversations()
    }

    const handleMessageSent = (data) => {
        if (data.conversationId === selectedConversation?._id) {
            setMessages(prev => [...prev, data.message])
        }
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim() || !selectedConversation) return

        try {
            await sendMessage(selectedConversation._id, newMessage.trim())
            setNewMessage('')
        } catch (error) {
            console.error('Error sending message:', error)
        }
    }

    const getOtherParticipant = (conversation) => {
        return conversation.participants.find(p => p._id !== user._id)
    }

    if (loading) {
        return (
            <div className="py-8">
                <div className="container">
                    <div className="flex items-center justify-center min-h-64">
                        <div className="spinner"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="py-8">
            <div className="container">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
                        <p className="text-gray-600">
                            Connect with farmers and customers
                        </p>
                    </div>

                    <div className="card">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 h-96">
                            {/* Conversations List */}
                            <div className="border-r border-gray-200">
                                <div className="p-4 border-b border-gray-200">
                                    <h3 className="font-semibold text-gray-900">Conversations</h3>
                                </div>

                                <div className="overflow-y-auto h-full">
                                    {conversations.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500">
                                            No conversations yet
                                        </div>
                                    ) : (
                                        <div>
                                            {conversations.map((conversation) => {
                                                const otherUser = getOtherParticipant(conversation)
                                                const isActive = selectedConversation?._id === conversation._id

                                                return (
                                                    <button
                                                        key={conversation._id}
                                                        onClick={() => setSelectedConversation(conversation)}
                                                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${isActive ? 'bg-primary-50 border-r-2 border-primary-600' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                                <span className="text-primary-600 font-medium">
                                                                    {otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`font-medium truncate ${isActive ? 'text-primary-600' : 'text-gray-900'
                                                                    }`}>
                                                                    {otherUser?.name || 'Unknown User'}
                                                                </p>
                                                                <p className="text-sm text-gray-500 truncate">
                                                                    {conversation.lastMessage?.content || 'No messages yet'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="md:col-span-2 flex flex-col">
                                {selectedConversation ? (
                                    <>
                                        {/* Chat Header */}
                                        <div className="p-4 border-b border-gray-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                    <span className="text-primary-600 font-medium">
                                                        {getOtherParticipant(selectedConversation)?.name?.charAt(0)?.toUpperCase() || 'U'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        {getOtherParticipant(selectedConversation)?.name || 'Unknown User'}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        {isConnected ? 'Online' : 'Offline'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Messages List */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {messages.length === 0 ? (
                                                <div className="text-center text-gray-500 py-8">
                                                    No messages yet. Start the conversation!
                                                </div>
                                            ) : (
                                                messages.map((message) => {
                                                    const isOwnMessage = message.sender._id === user._id

                                                    return (
                                                        <div
                                                            key={message._id}
                                                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            <div
                                                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwnMessage
                                                                        ? 'bg-primary-600 text-white'
                                                                        : 'bg-gray-100 text-gray-900'
                                                                    }`}
                                                            >
                                                                <p className="text-sm">{message.content}</p>
                                                                <p className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-100' : 'text-gray-500'
                                                                    }`}>
                                                                    {new Date(message.createdAt).toLocaleTimeString([], {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>

                                        {/* Message Input */}
                                        <div className="p-4 border-t border-gray-200">
                                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    placeholder="Type your message..."
                                                    className="flex-1 form-input"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!newMessage.trim()}
                                                    className="btn btn-primary"
                                                >
                                                    Send
                                                </button>
                                            </form>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center text-gray-500">
                                            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                            <p>Select a conversation to start messaging</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Messages 