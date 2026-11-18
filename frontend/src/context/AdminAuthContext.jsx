import { createContext, useContext, useState, useEffect } from 'react'
import { apiRequest } from '../api/client'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleExpired = () => {
      setAdmin(null)
    }
    window.addEventListener('chocodor:admin-session-expired', handleExpired)
    return () => window.removeEventListener('chocodor:admin-session-expired', handleExpired)
  }, [])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      const token = localStorage.getItem('chocodor_admin_token')
      const saved = localStorage.getItem('chocodor_admin_user')

      if (!token || !saved) {
        if (mounted) {
          setAdmin(null)
          setLoading(false)
        }
        return
      }

      try {
        const parsed = JSON.parse(saved)
        if (mounted) setAdmin(parsed)
      } catch {
        localStorage.removeItem('chocodor_admin_token')
        localStorage.removeItem('chocodor_admin_user')
        if (mounted) {
          setAdmin(null)
          setLoading(false)
        }
        return
      }

      // Proactively verify token validity against backend /api/admin/me
      try {
        const res = await apiRequest('/admin/me', { isAdmin: true })
        if (mounted && res?.admin) {
          setAdmin(res.admin)
          localStorage.setItem('chocodor_admin_user', JSON.stringify(res.admin))
        }
      } catch {
        // If expired or unauthorized, client.js already cleared tokens and triggered logout
        if (mounted) setAdmin(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    return () => {
      mounted = false
    }
  }, [])

  const login = async (email, password) => {
    const res = await apiRequest('/admin/login', {
      method: 'POST',
      body: { email, password },
    })
    localStorage.setItem('chocodor_admin_token', res.token)
    localStorage.setItem('chocodor_admin_user', JSON.stringify(res.admin))
    setAdmin(res.admin)
    return res
  }

  const logout = () => {
    localStorage.removeItem('chocodor_admin_token')
    localStorage.removeItem('chocodor_admin_user')
    setAdmin(null)
  }

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  return context
}
