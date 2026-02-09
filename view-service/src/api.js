import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9002/api'

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
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
    (error) => Promise.reject(error)
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// Auth endpoints
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    signup: (userData) => api.post('/auth/signup', userData),
    getProfile: () => api.get('/profile'),
    updateProfile: (data) => api.put('/profile', data)
}

// Books endpoints
export const booksAPI = {
    getAll: (params) => api.get('/books', { params }),
    getById: (id) => api.get(`/books/${id}`),
    create: (data) => api.post('/books', data),
    update: (id, data) => api.put(`/books/${id}`, data),
    delete: (id) => api.delete(`/books/${id}`)
}

// Members endpoints
export const membersAPI = {
    getAll: (params) => api.get('/members', { params }),
    getById: (id) => api.get(`/members/${id}`),
    create: (data) => api.post('/members', data),
    update: (id, data) => api.put(`/members/${id}`, data),
    delete: (id) => api.delete(`/members/${id}`)
}

// Borrowings endpoints
export const borrowingsAPI = {
    getAll: (params) => api.get('/borrowings', { params }),
    getById: (id) => api.get(`/borrowings/${id}`),
    create: (data) => api.post('/borrowings', data),
    returnBook: (id) => api.put(`/borrowings/${id}/return`),
    delete: (id) => api.delete(`/borrowings/${id}`)
}

// Statistics/Dashboard endpoints
export const statisticsAPI = {
    getDashboard: () => api.get('/dashboard'),
    getStats: () => api.get('/statistics')
}

// Testimonials endpoints
export const testimonialsAPI = {
    getAll: (params) => api.get('/testimonials', { params }),
    create: (data) => api.post('/testimonials', data),
    update: (id, data) => api.put(`/testimonials/${id}`, data),
    delete: (id) => api.delete(`/testimonials/${id}`)
}

export default api
