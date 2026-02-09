import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { testimonialsAPI } from '../api'
import { 
  MessageSquare, Plus, Edit2, Trash2, Star, 
  X, Check, AlertCircle, Quote 
} from 'lucide-react'

export default function Testimonials() {
  const { user } = useAuth()
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTestimonial, setEditingTestimonial] = useState(null)
  const [formData, setFormData] = useState({
    content: '',
    rating: 5
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadTestimonials()
  }, [])

  const loadTestimonials = async () => {
    setLoading(true)
    try {
      const response = await testimonialsAPI.getAll()
      const data = response.data
      setTestimonials(Array.isArray(data) ? data : data.items || data.testimonials || [])
    } catch (error) {
      console.error('Failed to load testimonials:', error)
      setError('Failed to load testimonials')
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingTestimonial(null)
    setFormData({ content: '', rating: 5 })
    setShowModal(true)
  }

  const openEditModal = (testimonial) => {
    setEditingTestimonial(testimonial)
    setFormData({
      content: testimonial.content || '',
      rating: testimonial.rating || 5
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      if (editingTestimonial) {
        await testimonialsAPI.update(editingTestimonial.id, formData)
        setSuccess('Testimonial updated successfully')
      } else {
        await testimonialsAPI.create(formData)
        setSuccess('Testimonial added successfully')
      }
      setShowModal(false)
      loadTestimonials()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed')
    }
  }

  const handleDelete = async (testimonial) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return
    
    try {
      await testimonialsAPI.delete(testimonial.id)
      setSuccess('Testimonial deleted successfully')
      loadTestimonials()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete testimonial')
    }
  }

  const canEdit = (testimonial) => {
    return user?.role === 'admin' || testimonial.user_id === user?.id
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        size={16} 
        className={i < rating ? 'star-filled' : 'star-empty'}
        fill={i < rating ? 'currentColor' : 'none'}
      />
    ))
  }

  return (
    <div className="testimonials-page">
      <div className="page-header">
        <div className="page-header-content">
          <h1><MessageSquare size={28} /> Testimonials</h1>
          <p>See what our community members say about the library</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} />
          Add Testimonial
        </button>
      </div>

      {(error || success) && (
        <div className={`alert ${error ? 'alert-error' : 'alert-success'}`}>
          {error ? <AlertCircle size={18} /> : <Check size={18} />}
          {error || success}
        </div>
      )}

      {loading ? (
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <p>Loading testimonials...</p>
        </div>
      ) : testimonials.length === 0 ? (
        <div className="empty-state">
          <MessageSquare size={48} />
          <h3>No testimonials yet</h3>
          <p>Be the first to share your experience!</p>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            Add Testimonial
          </button>
        </div>
      ) : (
        <div className="testimonials-grid">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="testimonial-card">
              <div className="testimonial-quote">
                <Quote size={24} />
              </div>
              <div className="testimonial-content">
                <p>{testimonial.content}</p>
              </div>
              <div className="testimonial-rating">
                {renderStars(testimonial.rating)}
              </div>
              <div className="testimonial-footer">
                <div className="testimonial-author">
                  <div className="author-avatar">
                    {testimonial.user_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="author-info">
                    <span className="author-name">{testimonial.user_name || 'Anonymous'}</span>
                    <span className="author-date">
                      {new Date(testimonial.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {canEdit(testimonial) && (
                  <div className="testimonial-actions">
                    <button className="btn-icon" onClick={() => openEditModal(testimonial)} title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(testimonial)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTestimonial ? 'Edit Testimonial' : 'Add Testimonial'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Your Review *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows="4"
                  placeholder="Share your experience with the library..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Rating</label>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`rating-star ${formData.rating >= value ? 'active' : ''}`}
                      onClick={() => setFormData({...formData, rating: value})}
                    >
                      <Star size={24} fill={formData.rating >= value ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTestimonial ? 'Update' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
