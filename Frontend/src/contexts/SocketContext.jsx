import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export const useSocket = () => {
    const context = useContext(SocketContext)
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider')
    }
    return context
}

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null)
    const [isConnected, setIsConnected] = useState(false)
    const { user, isAuthenticated } = useAuth()

    useEffect(() => {
        if (isAuthenticated && user) {
            // Connect to socket server
            const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
                auth: {
                    token: localStorage.getItem('token')
                }
            })

            newSocket.on('connect', () => {
                console.log('Connected to socket server')
                setIsConnected(true)
            })

            newSocket.on('disconnect', () => {
                console.log('Disconnected from socket server')
                setIsConnected(false)
            })

            newSocket.on('connect_error', (error) => {
                console.error('Socket connection error:', error)
                setIsConnected(false)
            })

            setSocket(newSocket)

            // Cleanup on unmount
            return () => {
                newSocket.close()
            }
        } else {
            // Disconnect if user is not authenticated
            if (socket) {
                socket.close()
                setSocket(null)
                setIsConnected(false)
            }
        }
    }, [isAuthenticated, user])

    const sendMessage = (conversationId, message) => {
        if (socket && isConnected) {
            socket.emit('send_message', {
                conversationId,
                message,
                senderId: user._id
            })
        }
    }

    const joinConversation = (conversationId) => {
        if (socket && isConnected) {
            socket.emit('join_conversation', conversationId)
        }
    }

    const leaveConversation = (conversationId) => {
        if (socket && isConnected) {
            socket.emit('leave_conversation', conversationId)
        }
    }

    const value = {
        socket,
        isConnected,
        sendMessage,
        joinConversation,
        leaveConversation
    }

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    )
} 