import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { booksAPI, borrowingsAPI } from '../api'
import ConfirmModal from '../components/ConfirmModal'
import {
    BookOpen, Search, Plus, Edit2, Trash2,
    ChevronLeft, ChevronRight, X, Check, AlertCircle, BookMarked, Calendar
} from 'lucide-react'

export default function Books() {
    const { user } = useAuth()
    const [books, setBooks] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [showModal, setShowModal] = useState(false)
    const [editingBook, setEditingBook] = useState(null)
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        isbn: '',
        category: '',
        quantity: 1,
        description: ''
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'warning' })
    const [borrowedBookIds, setBorrowedBookIds] = useState([])
    const [showBorrowModal, setShowBorrowModal] = useState(false)
    const [borrowingBook, setBorrowingBook] = useState(null)
    const [borrowDueDate, setBorrowDueDate] = useState('')

    const isAdmin = user?.role === 'admin'
    const itemsPerPage = parseInt(import.meta.env.VITE_ITEMS_PER_PAGE) || 10

    useEffect(() => {
        loadBooks()
    }, [currentPage, searchTerm])

    // Load user's active borrowings when user changes (for members only)
    useEffect(() => {
        if (user && user.role === 'member') {
            loadUserBorrowings()
        }
    }, [user])

    const loadUserBorrowings = async () => {
        try {
            const response = await borrowingsAPI.getAll({ status_filter: 'borrowed' })
            const borrowings = Array.isArray(response.data) ? response.data : response.data?.items || []
            // Get IDs of books that are currently borrowed (status = 'borrowed' and no return_date)
            const activeBorrowedIds = borrowings
                .filter(b => b.status === 'borrowed' || !b.return_date)
                .map(b => b.book_id)
            setBorrowedBookIds(activeBorrowedIds)
            console.log('Active borrowed book IDs:', activeBorrowedIds) // Debug log
        } catch (error) {
            console.error('Failed to load borrowings:', error)
        }
    }

    const loadBooks = async () => {
        setLoading(true)
        try {
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                ...(searchTerm && { search: searchTerm })
            }
            const response = await booksAPI.getAll(params)
            const data = response.data

            if (Array.isArray(data)) {
                setBooks(data)
                setTotalPages(Math.ceil(data.length / itemsPerPage) || 1)
            } else {
                setBooks(data.items || data.books || [])
                setTotalPages(data.total_pages || Math.ceil((data.total || 0) / itemsPerPage) || 1)
            }
        } catch (error) {
            console.error('Failed to load books:', error)
            setError('Failed to load books')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1)
    }

    const openAddModal = () => {
        setEditingBook(null)
        setFormData({
            title: '',
            author: '',
            isbn: '',
            category: '',
            quantity: 1,
            description: ''
        })
        setShowModal(true)
    }

    const openEditModal = (book) => {
        setEditingBook(book)
        setFormData({
            title: book.title || '',
            author: book.author || '',
            isbn: book.isbn || '',
            category: book.category || '',
            quantity: book.total_copies || book.quantity || 1,
            description: book.description || ''
        })
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        try {
            // Map frontend 'quantity' to backend 'total_copies'
            const apiData = {
                title: formData.title,
                author: formData.author,
                isbn: formData.isbn || null,
                total_copies: formData.quantity,
                ...(formData.category && { category: formData.category }),
                ...(formData.description && { description: formData.description })
            }

            if (editingBook) {
                await booksAPI.update(editingBook.id, apiData)
                setSuccess('Book updated successfully')
            } else {
                // For new books, available_copies = total_copies
                apiData.available_copies = formData.quantity
                await booksAPI.create(apiData)
                setSuccess('Book added successfully')
            }
            setShowModal(false)
            loadBooks()
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            setError(err.response?.data?.detail || 'Operation failed')
        }
    }

    const handleDelete = (book) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Book',
            message: `Are you sure you want to delete "${book.title}"? This action cannot be undone.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await booksAPI.delete(book.id)
                    setSuccess('Book deleted successfully')
                    loadBooks()
                    setTimeout(() => setSuccess(''), 3000)
                } catch (err) {
                    setError(err.response?.data?.detail || 'Failed to delete book')
                }
            }
        })
    }

    const handleBorrow = (book) => {
        // Set default due date from env (default 30 days)
        const defaultBorrowDays = parseInt(import.meta.env.VITE_DEFAULT_BORROW_DAYS) || 30
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + defaultBorrowDays)
        setBorrowDueDate(dueDate.toISOString().split('T')[0])
        setBorrowingBook(book)
        setShowBorrowModal(true)
    }

    const handleBorrowSubmit = async () => {
        if (!borrowingBook) return

        try {
            await borrowingsAPI.create({
                book_id: borrowingBook.id,
                due_date: borrowDueDate
            })
            const formattedDate = new Date(borrowDueDate).toLocaleDateString()
            setSuccess(`Successfully borrowed "${borrowingBook.title}"! Due date: ${formattedDate}`)
            // Add book to borrowed list to disable button
            setBorrowedBookIds(prev => [...prev, borrowingBook.id])
            setShowBorrowModal(false)
            setBorrowingBook(null)
            loadBooks()
            setTimeout(() => setSuccess(''), 5000)
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to borrow book')
            setTimeout(() => setError(''), 5000)
        }
    }

    const isBookBorrowed = (bookId) => borrowedBookIds.includes(bookId)

    return (
        <div className="books-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1><BookOpen size={28} /> Book Catalog</h1>
                    <p>Browse and manage the library's book collection</p>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <Plus size={18} />
                        Add Book
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
                    placeholder="Search books by title, author, or ISBN..."
                    value={searchTerm}
                    onChange={handleSearch}
                />
            </div>

            {loading ? (
                <div className="page-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading books...</p>
                </div>
            ) : books.length === 0 ? (
                <div className="empty-state">
                    <BookOpen size={48} />
                    <h3>No books found</h3>
                    <p>{searchTerm ? 'Try a different search term' : 'Start by adding some books to the catalog'}</p>
                </div>
            ) : (
                <>
                    <div className="books-grid">
                        {books.map((book) => (
                            <div key={book.id} className="book-card">
                                <div className="book-cover">
                                    <BookOpen size={32} />
                                </div>
                                <div className="book-info">
                                    <h3 className="book-title">{book.title}</h3>
                                    <p className="book-author">by {book.author}</p>
                                    {book.category && <span className="book-category">{book.category}</span>}
                                    <div className="book-meta">
                                        {(() => {
                                            const totalCopies = book.total_copies || 1
                                            const borrowedCount = book.borrowing_count || 0
                                            const remaining = totalCopies - borrowedCount
                                            return (
                                                <span className={`availability ${remaining > 0 ? 'available' : 'unavailable'}`}>
                                                    {remaining > 0
                                                        ? `${remaining}/${totalCopies} Available`
                                                        : 'Not Available'}
                                                </span>
                                            )
                                        })()}
                                    </div>
                                </div>
                                <div className="book-actions">
                                    {/* Borrow button for members when book is available */}
                                    {!isAdmin && ((book.total_copies || 1) - (book.borrowing_count || 0)) > 0 && (
                                        <button
                                            className={`btn btn-sm ${isBookBorrowed(book.id) ? 'btn-disabled' : 'btn-primary'}`}
                                            onClick={() => !isBookBorrowed(book.id) && handleBorrow(book)}
                                            disabled={isBookBorrowed(book.id)}
                                            title={isBookBorrowed(book.id) ? 'You have already borrowed this book' : 'Borrow this book'}
                                        >
                                            <BookMarked size={16} />
                                            {isBookBorrowed(book.id) ? 'Borrowed' : 'Borrow'}
                                        </button>
                                    )}
                                    {/* Admin actions */}
                                    {isAdmin && (
                                        <>
                                            <button className="btn-icon" onClick={() => openEditModal(book)} title="Edit">
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn-icon btn-danger" onClick={() => handleDelete(book)} title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
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
                            <h2>{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Author *</label>
                                <input
                                    type="text"
                                    value={formData.author}
                                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>ISBN</label>
                                    <input
                                        type="text"
                                        value={formData.isbn}
                                        onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows="3"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingBook ? 'Update Book' : 'Add Book'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Borrow Book Modal */}
            {showBorrowModal && borrowingBook && (
                <div className="modal-overlay" onClick={() => setShowBorrowModal(false)}>
                    <div className="modal borrow-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><BookMarked size={20} /> Borrow Book</h2>
                            <button className="btn-icon" onClick={() => setShowBorrowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="borrow-modal-content">
                            <div className="book-details-card">
                                <div className="book-details-icon">
                                    <BookOpen size={40} />
                                </div>
                                <div className="book-details-info">
                                    <h3>{borrowingBook.title}</h3>
                                    <p className="book-author">by {borrowingBook.author}</p>
                                    {borrowingBook.isbn && <p className="book-isbn">ISBN: {borrowingBook.isbn}</p>}
                                    {borrowingBook.category && <span className="book-category">{borrowingBook.category}</span>}
                                    <p className="book-availability">
                                        Available: {(borrowingBook.total_copies || 1) - (borrowingBook.borrowing_count || 0)} / {borrowingBook.total_copies || 1} copies
                                    </p>
                                </div>
                            </div>

                            <div className="form-group">
                                <label><Calendar size={16} /> Return Date *</label>
                                <input
                                    type="date"
                                    value={borrowDueDate}
                                    onChange={(e) => setBorrowDueDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    required
                                />
                                <small className="form-hint">Default: 30 days from today. You can change if needed.</small>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowBorrowModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleBorrowSubmit}>
                                <BookMarked size={16} />
                                Confirm Borrow
                            </button>
                        </div>
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
