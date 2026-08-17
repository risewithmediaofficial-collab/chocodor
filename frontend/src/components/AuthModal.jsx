import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import logoImg from '../assets/logo.jpg'

export default function AuthModal() {
  const { authModalOpen, authMode, setAuthMode, authReason, closeAuthModal, login, register } = useAuth()
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
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="auth-modal-backdrop" onClick={closeAuthModal}>
        <motion.div
          className="auth-modal"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            className="auth-modal__close"
            onClick={closeAuthModal}
            aria-label="Close"
          >
            ✕
          </button>

          <div className="auth-modal__body">
            {/* Brand Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <img
                src={logoImg}
                alt="Choco D'or"
                style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <span className="section-label section-label--eyebrow" style={{ display: 'block', margin: 0, fontSize: '10px' }}>
                  CHOCO D&apos;OR ROYALTY EXPERIENCE
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '15px', color: 'var(--cocoa-dark)' }}>
                  A Little Luxury in Every Bite
                </span>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="auth-modal__tabs">
              <button
                type="button"
                className={`auth-modal__tab ${authMode === 'register' ? 'auth-modal__tab--active' : ''}`}
                onClick={() => {
                  setError('')
                  setAuthMode('register')
                }}
              >
                ✨ Create Account
              </button>
              <button
                type="button"
                className={`auth-modal__tab ${authMode === 'login' ? 'auth-modal__tab--active' : ''}`}
                onClick={() => {
                  setError('')
                  setAuthMode('login')
                }}
              >
                🔑 Sign In
              </button>
            </div>

            {/* Context Notice / Reason */}
            {typeof authReason === 'string' && authReason.trim().length > 0 && (
              <div
                style={{
                  background: '#FAF0E4',
                  border: '1px solid rgba(240, 193, 75, 0.45)',
                  color: 'var(--cocoa-dark)',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '16px',
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>🛍️</span>
                <span>{authReason}</span>
              </div>
            )}

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 900, color: 'var(--cocoa-dark)', margin: '0 0 6px' }}>
              {authMode === 'login' ? 'Sign In to Your Account' : 'Join Choco D\'or Royalty Club'}
            </h2>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 18px', lineHeight: 1.45 }}>
              {authMode === 'login'
                ? 'Sign in to access your digital Royalty Card, active orders, and point balances.'
                : 'Create an account to collect points on every dessert order and unlock sweet rewards.'}
            </p>

            {error && (
              <div
                style={{
                  background: 'rgba(186, 27, 27, 0.08)',
                  border: '1px solid rgba(186, 27, 27, 0.2)',
                  color: '#BA1B1B',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  marginBottom: '14px',
                  lineHeight: 1.4,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {authMode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="form-input"
                    style={{ background: '#FAF6F0' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {authMode === 'login' ? 'Email or Mobile Number *' : 'Email Address *'}
                </label>
                <input
                  type={authMode === 'login' ? 'text' : 'email'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={authMode === 'login' ? 'Email or registered mobile' : 'you@example.com'}
                  className="form-input"
                  style={{ background: '#FAF6F0' }}
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Mobile Number * (For Delivery &amp; Points)
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="form-input"
                    style={{ background: '#FAF6F0' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                  style={{ background: '#FAF6F0' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn--gold btn--full"
                disabled={loading}
                style={{ marginTop: '8px', padding: '14px', fontSize: '14px', fontWeight: 800 }}
              >
                {loading
                  ? 'Please wait...'
                  : authMode === 'login'
                  ? 'Sign In →'
                  : 'Create My Account & Add to Cart →'}
              </button>
            </form>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12.5px', color: 'var(--text-muted)' }}>
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
                    Create Account
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
