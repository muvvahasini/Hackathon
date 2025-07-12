import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    me: () => api.get('/auth/me'),
}

// Users API
export const usersAPI = {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (userData) => api.put('/users/profile', userData),
    getUsers: (params) => api.get('/users', { params }),
    getUser: (id) => api.get(`/users/${id}`),
}

// Products API
export const productsAPI = {
    getProducts: (params) => api.get('/products', { params }),
    getProduct: (id) => api.get(`/products/${id}`),
    createProduct: (productData) => api.post('/products', productData),
    updateProduct: (id, productData) => api.put(`/products/${id}`, productData),
    deleteProduct: (id) => api.delete(`/products/${id}`),
    uploadImage: (file) => {
        const formData = new FormData()
        formData.append('image', file)
        return api.post('/products/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    },
}

// Orders API
export const ordersAPI = {
    getOrders: (params) => api.get('/orders', { params }),
    getOrder: (id) => api.get(`/orders/${id}`),
    createOrder: (orderData) => api.post('/orders', orderData),
    updateOrder: (id, orderData) => api.put(`/orders/${id}`, orderData),
    cancelOrder: (id) => api.delete(`/orders/${id}`),
}

// Reviews API
export const reviewsAPI = {
    getReviews: (productId) => api.get(`/products/${productId}/reviews`),
    createReview: (productId, reviewData) => api.post(`/products/${productId}/reviews`, reviewData),
    updateReview: (productId, reviewId, reviewData) => api.put(`/products/${productId}/reviews/${reviewId}`, reviewData),
    deleteReview: (productId, reviewId) => api.delete(`/products/${productId}/reviews/${reviewId}`),
}

// Messages API
export const messagesAPI = {
    getConversations: () => api.get('/messages/conversations'),
    getMessages: (conversationId) => api.get(`/messages/conversations/${conversationId}`),
    sendMessage: (conversationId, message) => api.post(`/messages/conversations/${conversationId}`, { message }),
    createConversation: (participantId) => api.post('/messages/conversations', { participantId }),
}

// Search API
export const searchAPI = {
    searchProducts: (query, filters) => api.get('/search/products', { params: { q: query, ...filters } }),
    searchFarms: (query, location) => api.get('/search/farms', { params: { q: query, location } }),
}

export default api 