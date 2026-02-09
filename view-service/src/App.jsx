import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Books from './pages/Books'
import Members from './pages/Members'
import Borrowings from './pages/Borrowings'
import Profile from './pages/Profile'
import Testimonials from './pages/Testimonials'
import LandingPage from './pages/LandingPage'

function PrivateRoute({ children, adminOnly = false }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (adminOnly && user.role !== 'admin') {
        return <Navigate to="/dashboard" replace />
    }

    return children
}

function App() {
    const { user } = useAuth()

    return (
        <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />

            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="books" element={<Books />} />
                <Route path="members" element={<PrivateRoute adminOnly><Members /></PrivateRoute>} />
                <Route path="borrowings" element={<Borrowings />} />
                <Route path="testimonials" element={<Testimonials />} />
                <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
