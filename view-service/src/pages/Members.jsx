import React, { useState, useEffect } from 'react'
import { membersAPI } from '../api'
import ConfirmModal from '../components/ConfirmModal'
import { 
  Users, Search, Plus, Edit2, Trash2, 
  ChevronLeft, ChevronRight, X, Check, AlertCircle, Mail, Phone 
} from 'lucide-react'

export default function Members() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  const itemsPerPage = parseInt(import.meta.env.VITE_ITEMS_PER_PAGE) || 10

  useEffect(() => {
    loadMembers()
  }, [currentPage, searchTerm])

  const loadMembers = async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm && { search: searchTerm })
      }
      const response = await membersAPI.getAll(params)
      const data = response.data
      
      if (Array.isArray(data)) {
        setMembers(data)
        setTotalPages(Math.ceil(data.length / itemsPerPage) || 1)
      } else {
        setMembers(data.items || data.members || [])
        setTotalPages(data.total_pages || Math.ceil((data.total || 0) / itemsPerPage) || 1)
      }
    } catch (error) {
      console.error('Failed to load members:', error)
      setError('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const openAddModal = () => {
    setEditingMember(null)
    setFormData({ name: '', email: '', phone: '', address: '' })
    setShowModal(true)
  }

  const openEditModal = (member) => {
    setEditingMember(member)
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      address: member.address || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      if (editingMember) {
        await membersAPI.update(editingMember.id, formData)
        setSuccess('Member updated successfully')
      } else {
        await membersAPI.create(formData)
        setSuccess('Member added successfully')
      }
      setShowModal(false)
      loadMembers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed')
    }
  }

  const handleDelete = (member) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Member',
      message: `Are you sure you want to delete "${member.name}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await membersAPI.delete(member.id)
          setSuccess('Member deleted successfully')
          loadMembers()
          setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
          setError(err.response?.data?.detail || 'Failed to delete member')
        }
      }
    })
  }

  return (
    <div className="members-page">
      <div className="page-header">
        <div className="page-header-content">
          <h1><Users size={28} /> Members</h1>
          <p>Manage library members and their information</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} />
          Add Member
        </button>
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
          placeholder="Search members by name or email..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {loading ? (
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <p>Loading members...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>No members found</h3>
          <p>{searchTerm ? 'Try a different search term' : 'Start by adding members to the library'}</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-name">
                        <div className="member-avatar">
                          {member.name?.charAt(0).toUpperCase() || 'M'}
                        </div>
                        {member.name}
                      </div>
                    </td>
                    <td>
                      <div className="cell-with-icon">
                        <Mail size={14} />
                        {member.email || '-'}
                      </div>
                    </td>
                    <td>
                      <div className="cell-with-icon">
                        <Phone size={14} />
                        {member.phone || '-'}
                      </div>
                    </td>
                    <td>{member.address || '-'}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-icon" onClick={() => openEditModal(member)} title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-icon btn-danger" onClick={() => handleDelete(member)} title="Delete">
                          <Trash2 size={16} />
                        </button>
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
              <h2>{editingMember ? 'Edit Member' : 'Add New Member'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows="2"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingMember ? 'Update Member' : 'Add Member'}
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
        confirmText="Delete"
      />
    </div>
  )
}
