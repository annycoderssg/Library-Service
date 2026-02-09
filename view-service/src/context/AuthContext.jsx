import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    // Validate savedUser is valid JSON before parsing
    if (token && savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
      let parsedUser
      try {
        parsedUser = JSON.parse(savedUser)
      } catch (e) {
        // Invalid JSON, clear storage
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setLoading(false)
        return
      }
      setUser(parsedUser)
      // Verify token is still valid
      authAPI.getProfile()
        .then(response => {
          const profileData = response.data
          // Build user object from profile response
          const userData = {
            id: profileData.user?.id || parsedUser.id,
            role: profileData.user?.role || parsedUser.role,
            email: profileData.user?.email || parsedUser.email,
            name: profileData.member?.name || profileData.user?.email?.split('@')[0] || parsedUser.name,
            member_id: profileData.user?.member_id || profileData.member?.id || parsedUser.member_id
          }
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
        })
        .catch(() => {
          logout()
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password })
    const { access_token, role, user_id } = response.data
    
    localStorage.setItem('token', access_token)
    
    // Fetch full profile after login
    const profileRes = await authAPI.getProfile()
    const profileData = profileRes.data
    
    // Build user object from profile
    const userData = {
      id: user_id,
      role: role,
      email: profileData.user?.email || email,
      name: profileData.member?.name || profileData.user?.email?.split('@')[0] || 'User',
      member_id: profileData.user?.member_id || profileData.member?.id
    }
    
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    
    return userData
  }

  const signup = async (signupData) => {
    const response = await authAPI.signup(signupData)
    const { access_token, role, user_id } = response.data
    
    localStorage.setItem('token', access_token)
    
    // Fetch profile to get member_id
    const profileRes = await authAPI.getProfile()
    const profileData = profileRes.data
    
    // Build user object from signup data and profile
    const userData = {
      id: user_id,
      role: role,
      email: signupData.email,
      name: signupData.name || signupData.email.split('@')[0],
      member_id: profileData.user?.member_id || profileData.member?.id
    }
    
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    
    return userData
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
