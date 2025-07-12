import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      checkAuthStatus()
    } else {
      setLoading(false)
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...')
      const response = await api.get('/auth/me')
      console.log('Auth check successful:', response.data)
      setUser(response.data.data.user)
    } catch (error) {
      console.error('Auth check failed:', error.response?.data || error.message)
      // Clear token on any auth error
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { data } = response.data

      // Store token and set user
      localStorage.setItem('token', data.token)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      setUser(data.user)

      toast.success('Login successful!')
      navigate('/dashboard')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const register = async (userData) => {
    try {
      // Prepare the registration data
      const registrationData = {
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        phone: userData.phone,
        bio: userData.bio
      }

      // Add location for farmers
      if (userData.role === 'farmer' && userData.location) {
        registrationData.location = userData.location
      }

      const response = await api.post('/auth/register', registrationData)
      const { data } = response.data

      // Don't automatically log in the user - just show success message
      toast.success('Registration successful! Please login to continue.')
      
      // Redirect to login page instead of dashboard
      navigate('/login')
      
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    try {
      // Call logout endpoint to update last active
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Always clear local data regardless of API call success
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      setUser(null)
      navigate('/')
      toast.success('Logged out successfully')
    }
  }

  const updateProfile = async (userData) => {
    try {
      const response = await api.put('/users/profile', userData)
      setUser(response.data.user)
      toast.success('Profile updated successfully')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  // Refresh token function
  const refreshToken = async () => {
    try {
      const response = await api.post('/auth/refresh')
      const { data } = response.data
      
      localStorage.setItem('token', data.token)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      setUser(data.user)
      
      return { success: true }
    } catch (error) {
      console.error('Token refresh failed:', error)
      // If refresh fails, logout the user
      await logout()
      return { success: false }
    }
  }

  // Set up token refresh interval
  useEffect(() => {
    if (user) {
      // Refresh token every 6 days (since token expires in 7 days)
      const refreshInterval = setInterval(refreshToken, 6 * 24 * 60 * 60 * 1000)
      
      return () => clearInterval(refreshInterval)
    }
  }, [user])

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    refreshToken,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 