import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { borrowingsAPI, booksAPI, membersAPI } from '../api'
import ConfirmModal from '../components/ConfirmModal'
import {
  Calendar, Search, Plus, RotateCcw, Trash2,
  ChevronLeft, ChevronRight, X, Check, AlertCircle,
  Clock, BookOpen
} from 'lucide-react'

export default function Borrowings() {
  const { user } = useAuth()
  const [borrowings, setBorrowings] = useState([])
  const [books, setBooks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    book_id: '',
    member_id: '',
    due_date: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'warning' })

  const isAdmin = user?.role === 'admin'
  const itemsPerPage = parseInt(import.meta.env.VITE_ITEMS_PER_PAGE) || 10

  useEffect(() => {
    loadBorrowings()
    if (isAdmin) {
      loadBooksAndMembers()
    }
  }, [currentPage, searchTerm])

  const loadBorrowings = async () => {
    setLoading(true)
    try {
      const skip = (currentPage - 1) * itemsPerPage
      const params = {
        skip: skip,
        limit: itemsPerPage,
        ...(searchTerm && { search: searchTerm })
      }
      const response = await borrowingsAPI.getAll(params)
      const data = response.data

      // Handle paginated response { items: [], total: N }
      const items = data.items || data.borrowings || (Array.isArray(data) ? data : [])
      const total = data.total || items.length

      setBorrowings(items)
      setTotalPages(Math.ceil(total / itemsPerPage) || 1)
    } catch (error) {
      console.error('Failed to load borrowings:', error)
      setError('Failed to load borrowings')
    } finally {
      setLoading(false)
    }
  }

  const loadBooksAndMembers = async () => {
    try {
      const [booksRes, membersRes] = await Promise.all([
        booksAPI.getAll({ limit: 100 }),
        membersAPI.getAll({ limit: 100 })
      ])
      setBooks(Array.isArray(booksRes.data) ? booksRes.data : booksRes.data?.items || [])
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : membersRes.data?.items || [])
    } catch (error) {
      console.error('Failed to load books/members:', error)
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const openAddModal = () => {
    const defaultDueDate = new Date()
    defaultDueDate.setDate(defaultDueDate.getDate() + 14)

    setFormData({
      book_id: '',
      member_id: '',
      due_date: defaultDueDate.toISOString().split('T')[0]
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      await borrowingsAPI.create(formData)
      setSuccess('Book borrowed successfully')
      setShowModal(false)
      loadBorrowings()
      loadBooksAndMembers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create borrowing')
    }
  }

  const handleReturn = (borrowing) => {
    const bookTitle = borrowing.book_title || borrowing.book?.title || 'this book'
    setConfirmModal({
      isOpen: true,
      title: 'Return Book',
      message: `Mark "${bookTitle}" as returned?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await borrowingsAPI.returnBook(borrowing.id)
          setSuccess('Book returned successfully')
          loadBorrowings()
          loadBooksAndMembers()
          setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
          setError(err.response?.data?.detail || 'Failed to return book')
        }
      }
    })
  }

  const handleDelete = (borrowing) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Record',
      message: 'Are you sure you want to delete this borrowing record? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await borrowingsAPI.delete(borrowing.id)
          setSuccess('Record deleted successfully')
          loadBorrowings()
          setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
          setError(err.response?.data?.detail || 'Failed to delete record')
        }
      }
    })
  }

  const isOverdue = (dueDate, returnDate) => {
    if (returnDate) return false
    return new Date(dueDate) < new Date()
  }

  const getStatusBadge = (borrowing) => {
    if (borrowing.return_date) {
      return <span className="status-badge status-returned"><Check size={14} /> Returned</span>
    }
    if (isOverdue(borrowing.due_date)) {
      return <span className="status-badge status-overdue"><AlertCircle size={14} /> Overdue</span>
    }
    return <span className="status-badge status-active"><Clock size={14} /> Active</span>
  }

  return (
    <div className="borrowings-page">
      <div className="page-header">
        <div className="page-header-content">
          <h1><Calendar size={28} /> Borrowings</h1>
          <p>Track book checkouts and returns</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            New Borrowing
          </button>
        )}
      </div>

      {(error || success) && (
        <div className={`alert ${error ? 'alert-error' : 'alert-success'}`}>
          {error ? <AlertCircle size={18} /> : <Check size={18} />}
          {error || success}
        </div>
      )}

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search by book title or member name..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {loading ? (
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <p>Loading borrowings...</p>
        </div>
      ) : borrowings.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <h3>No borrowings found</h3>
          <p>{searchTerm ? 'Try a different search term' : 'No books have been borrowed yet'}</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Member</th>
                  <th>Borrow Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {borrowings.map((borrowing) => (
                  <tr key={borrowing.id} className={isOverdue(borrowing.due_date, borrowing.return_date) ? 'row-overdue' : ''}>
                    <td>
                      <div className="cell-with-icon">
                        <BookOpen size={16} />
                        {borrowing.book_title || borrowing.book?.title || 'Unknown'}
                      </div>
                    </td>
                    <td>{borrowing.member_name || borrowing.member?.name || 'Unknown'}</td>
                    <td>{new Date(borrowing.borrow_date || borrowing.created_at).toLocaleDateString()}</td>
                    <td>{new Date(borrowing.due_date).toLocaleDateString()}</td>
                    <td>{getStatusBadge(borrowing)}</td>
                    <td>
                      <div className="table-actions">
                        {/* Members can return their own books, admins can return any book */}
                        {!borrowing.return_date && (isAdmin || borrowing.member_id === user?.member_id) && (
                          <button
                            className="btn-icon btn-success"
                            onClick={() => handleReturn(borrowing)}
                            title="Mark as Returned"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            className="btn-icon btn-danger"
                            onClick={() => handleDelete(borrowing)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={20} />
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                className="btn-icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Borrowing</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Book *</label>
                <select
                  value={formData.book_id}
                  onChange={(e) => setFormData({ ...formData, book_id: e.target.value })}
                  required
                >
                  <option value="">Select a book</option>
                  {books.filter(b => b.available_quantity > 0).map(book => (
                    <option key={book.id} value={book.id}>
                      {book.title} by {book.author} ({book.available_quantity} available)
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Member *</label>
                <select
                  value={formData.member_id}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                  required
                >
                  <option value="">Select a member</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Due Date *</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Borrowing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.type === 'danger' ? 'Delete' : 'Confirm'}
      />
    </div>
  )
}
