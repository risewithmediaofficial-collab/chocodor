import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiRequest } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [royalty, setRoyalty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register'

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('chocodor_cust_token')
    if (!token) {
      setCustomer(null)
      setRoyalty(null)
      setLoading(false)
      return
    }

    try {
      const data = await apiRequest('/auth/me')
      setCustomer(data.customer)
      setRoyalty(data.royalty)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      localStorage.removeItem('chocodor_cust_token')
      setCustomer(null)
      setRoyalty(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  const login = async (emailOrMobile, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: { emailOrMobile, password },
    })
    localStorage.setItem('chocodor_cust_token', res.token)
    setCustomer(res.customer)
    setRoyalty(res.royalty)
    setAuthModalOpen(false)
    return res
  }

  const register = async ({ name, email, mobile, password }) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, mobile, password },
    })
    localStorage.setItem('chocodor_cust_token', res.token)
    setCustomer(res.customer)
    setRoyalty(res.royalty)
    setAuthModalOpen(false)
    return res
  }

  const logout = () => {
    localStorage.removeItem('chocodor_cust_token')
    setCustomer(null)
    setRoyalty(null)
  }

  const openLogin = () => {
    setAuthMode('login')
    setAuthModalOpen(true)
  }

  const openRegister = () => {
    setAuthMode('register')
    setAuthModalOpen(true)
  }

  return (
    <AuthContext.Provider
      value={{
        customer,
        royalty,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        authModalOpen,
        setAuthModalOpen,
        authMode,
        setAuthMode,
        openLogin,
        openRegister,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
