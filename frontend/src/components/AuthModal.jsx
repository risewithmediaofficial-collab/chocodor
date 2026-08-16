import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import logoImg from '../assets/logo.jpg'

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, authMode, setAuthMode, login, register } = useAuth()
  useBodyScrollLock(authModalOpen)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!authModalOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (authMode === 'login') {
        await login(mobile || email, password)
      } else {
        await register({ name, email, mobile, password })
      }
      setAuthModalOpen(false)
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="product-modal-backdrop" onClick={() => setAuthModalOpen(false)}>
        <motion.div
          className="product-modal"
          style={{ maxWidth: '440px' }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="product-modal__close"
            onClick={() => setAuthModalOpen(false)}
          >
            ✕
          </button>

          <div className="product-modal__content" style={{ padding: '32px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <img
                src={logoImg}
                alt="Choco D'or"
                style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }}
              />
              <div>
                <span className="section-label section-label--eyebrow" style={{ display: 'block', margin: 0 }}>
                  {authMode === 'login' ? 'WELCOME BACK' : 'JOIN CHOCO D\'OR ROYALTY'}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '14px', color: 'var(--cocoa-dark)' }}>
                  Choco D&apos;or
                </span>
              </div>
            </div>

            <h2 className="product-modal__title" style={{ fontSize: '1.6rem', marginBottom: '8px' }}>
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
              {authMode === 'login'
                ? 'Sign in to access your digital Royalty Card, track orders, and redeem sweet rewards.'
                : 'Join Choco D\'or Royalty today to collect points on every dessert and unlock member rewards.'}
            </p>

            {error && (
              <div
                style={{
                  background: 'rgba(186, 27, 27, 0.1)',
                  color: '#BA1B1B',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {authMode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--cocoa)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid rgba(61, 37, 30, 0.15)',
                      background: '#FFFFFF',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--cocoa)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  {authMode === 'login' ? 'Email or Mobile Number *' : 'Email Address *'}
                </label>
                <input
                  type={authMode === 'login' ? 'text' : 'email'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={authMode === 'login' ? 'Email or registered mobile' : 'you@example.com'}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid rgba(61, 37, 30, 0.15)',
                    background: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                  }}
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--cocoa)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Mobile Number * (Required for Delivery &amp; Points)
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid rgba(61, 37, 30, 0.15)',
                      background: '#FFFFFF',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--cocoa)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid rgba(61, 37, 30, 0.15)',
                    background: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn--gold btn--full"
                disabled={loading}
                style={{ marginTop: '8px' }}
              >
                {loading ? 'Please wait...' : authMode === 'login' ? 'Sign In →' : 'Create My Account & Royalty Card →'}
              </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              {authMode === 'login' ? (
                <>
                  New to Choco D&apos;or?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setAuthMode('register')
                    }}
                    style={{ fontWeight: 800, color: 'var(--cocoa-dark)', textDecoration: 'underline' }}
                  >
                    Join Royalty Club
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setAuthMode('login')
                    }}
                    style={{ fontWeight: 800, color: 'var(--cocoa-dark)', textDecoration: 'underline' }}
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
