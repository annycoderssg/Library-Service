import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { booksAPI } from '../api'
import { 
  BookOpen, Search, Plus, Edit2, Trash2, 
  ChevronLeft, ChevronRight, X, Check, AlertCircle 
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

  const isAdmin = user?.role === 'admin'
  const itemsPerPage = 10

  useEffect(() => {
    loadBooks()
  }, [currentPage, searchTerm])

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
      quantity: book.quantity || 1,
      description: book.description || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      if (editingBook) {
        await booksAPI.update(editingBook.id, formData)
        setSuccess('Book updated successfully')
      } else {
        await booksAPI.create(formData)
        setSuccess('Book added successfully')
      }
      setShowModal(false)
      loadBooks()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed')
    }
  }

  const handleDelete = async (book) => {
    if (!confirm(`Are you sure you want to delete "${book.title}"?`)) return
    
    try {
      await booksAPI.delete(book.id)
      setSuccess('Book deleted successfully')
      loadBooks()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete book')
    }
  }

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
                    <span className={`availability ${(book.available_copies || book.available_quantity) > 0 ? 'available' : 'unavailable'}`}>
                      {(book.available_copies || book.available_quantity) > 0 
                        ? `${book.available_copies || book.available_quantity} available` 
                        : 'Not available'}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="book-actions">
                    <button className="btn-icon" onClick={() => openEditModal(book)} title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(book)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
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
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Author *</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({...formData, author: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ISBN</label>
                  <input
                    type="text"
                    value={formData.isbn}
                    onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
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
    </div>
  )
}
