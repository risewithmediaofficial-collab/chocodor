import { createContext, useContext, useState, useEffect } from 'react'
import { apiRequest } from '../api/client'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('chocodor_admin_token')
    const saved = localStorage.getItem('chocodor_admin_user')
    if (token && saved) {
      try {
        setAdmin(JSON.parse(saved))
      } catch {
        localStorage.removeItem('chocodor_admin_token')
        localStorage.removeItem('chocodor_admin_user')
      }
    }
    setLoading(false)
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
