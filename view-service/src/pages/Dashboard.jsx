import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { statisticsAPI, borrowingsAPI } from '../api'
import { 
  BookOpen, Users, Calendar, TrendingUp, 
  Clock, AlertCircle, CheckCircle, ArrowRight 
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentBorrowings, setRecentBorrowings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsRes, borrowingsRes] = await Promise.all([
        statisticsAPI.getDashboard().catch(() => ({ data: null })),
        borrowingsAPI.getAll({ limit: 5 }).catch(() => ({ data: [] }))
      ])
      
      setStats(statsRes.data)
      setRecentBorrowings(Array.isArray(borrowingsRes.data) ? borrowingsRes.data : borrowingsRes.data?.items || [])
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() 
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="page-header-content">
          <h1>Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h1>
          <p>Here's what's happening with your library today.</p>
        </div>
      </div>

      {user?.role === 'admin' && stats && (
        <div className="stats-grid">
          <div className="stat-card stat-card-books">
            <div className="stat-icon">
              <BookOpen size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.total_books || 0}</span>
              <span className="stat-label">Total Books</span>
            </div>
          </div>
          <div className="stat-card stat-card-members">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.total_members || 0}</span>
              <span className="stat-label">Members</span>
            </div>
          </div>
          <div className="stat-card stat-card-borrowed">
            <div className="stat-icon">
              <Calendar size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.active_borrowings || 0}</span>
              <span className="stat-label">Active Borrowings</span>
            </div>
          </div>
          <div className="stat-card stat-card-overdue">
            <div className="stat-icon">
              <AlertCircle size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overdue_borrowings || 0}</span>
              <span className="stat-label">Overdue</span>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <Clock size={20} />
              Recent Borrowings
            </h2>
            <Link to="/borrowings" className="section-link">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          <div className="borrowings-list">
            {recentBorrowings.length === 0 ? (
              <div className="empty-state">
                <Calendar size={40} />
                <p>No recent borrowings</p>
              </div>
            ) : (
              recentBorrowings.map((borrowing) => (
                <div key={borrowing.id} className="borrowing-item">
                  <div className="borrowing-book">
                    <BookOpen size={18} />
                    <div>
                      <span className="book-title">{borrowing.book_title || borrowing.book?.title || 'Unknown Book'}</span>
                      <span className="member-name">{borrowing.member_name || borrowing.member?.name || ''}</span>
                    </div>
                  </div>
                  <div className="borrowing-status">
                    {borrowing.return_date ? (
                      <span className="status-badge status-returned">
                        <CheckCircle size={14} />
                        Returned
                      </span>
                    ) : isOverdue(borrowing.due_date) ? (
                      <span className="status-badge status-overdue">
                        <AlertCircle size={14} />
                        Overdue
                      </span>
                    ) : (
                      <span className="status-badge status-active">
                        <Clock size={14} />
                        Due {new Date(borrowing.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <TrendingUp size={20} />
              Quick Actions
            </h2>
          </div>
          <div className="quick-actions">
            <Link to="/books" className="action-card">
              <BookOpen size={24} />
              <span>Browse Books</span>
            </Link>
            <Link to="/borrowings" className="action-card">
              <Calendar size={24} />
              <span>My Borrowings</span>
            </Link>
            {user?.role === 'admin' && (
              <>
                <Link to="/members" className="action-card">
                  <Users size={24} />
                  <span>Manage Members</span>
                </Link>
              </>
            )}
            <Link to="/testimonials" className="action-card">
              <TrendingUp size={24} />
              <span>Testimonials</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
