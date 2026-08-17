import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import logoImg from '../assets/logo.jpg'

export default function AuthPage({ mode: initialMode = 'login' }) {
  const { customer, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Determine mode from prop, query parameter, or pathname
  const [mode, setMode] = useState(() => {
    if (location.pathname.includes('register') || location.pathname.includes('signup')) return 'register'
    if (searchParams.get('mode') === 'register') return 'register'
    return initialMode || 'login'
  })

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect to account if already logged in
  useEffect(() => {
    if (customer) {
      const returnTo = searchParams.get('redirect') || '/account'
      navigate(returnTo, { replace: true })
    }
  }, [customer, navigate, searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await login(mobile || email, password)
      } else {
        await register({ name, email, mobile, password })
      }
      const returnTo = searchParams.get('redirect') || '/account'
      navigate(returnTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page page--auth" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div className="container" style={{ maxWidth: '480px', width: '100%', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: '#FFFFFF',
            borderRadius: '28px',
            padding: 'clamp(24px, 5vw, 36px)',
            boxShadow: '0 20px 60px rgba(43, 23, 18, 0.12)',
            border: '1px solid rgba(61, 37, 30, 0.08)',
          }}
        >
          {/* Brand Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <img
              src={logoImg}
              alt="Choco D'or"
              style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 12px rgba(43, 23, 18, 0.15)' }}
            />
            <div>
              <span className="section-label section-label--eyebrow" style={{ display: 'block', margin: 0, fontSize: '10.5px' }}>
                CHOCO D&apos;OR ROYALTY EXPERIENCE
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '16px', color: 'var(--cocoa-dark)' }}>
                A Little Luxury in Every Bite
              </span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="auth-modal__tabs" style={{ marginBottom: '22px' }}>
            <button
              type="button"
              className={`auth-modal__tab ${mode === 'login' ? 'auth-modal__tab--active' : ''}`}
              onClick={() => {
                setError('')
                setMode('login')
              }}
            >
              🔑 Sign In
            </button>
            <button
              type="button"
              className={`auth-modal__tab ${mode === 'register' ? 'auth-modal__tab--active' : ''}`}
              onClick={() => {
                setError('')
                setMode('register')
              }}
            >
              ✨ Create Account
            </button>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, color: 'var(--cocoa-dark)', margin: '0 0 6px' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </h1>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.45 }}>
            {mode === 'login'
              ? 'Sign in to access your digital Royalty Card, track orders, and redeem exclusive rewards.'
              : 'Join Choco D\'or Royalty Club to collect points on every dessert and enjoy member benefits.'}
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
                marginBottom: '16px',
                lineHeight: 1.4,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'register' && (
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
                {mode === 'login' ? 'Email or Mobile Number *' : 'Email Address *'}
              </label>
              <input
                type={mode === 'login' ? 'text' : 'email'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'Email or registered mobile number' : 'you@example.com'}
                className="form-input"
                style={{ background: '#FAF6F0' }}
              />
            </div>

            {mode === 'register' && (
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
              style={{ marginTop: '6px', padding: '14px', fontSize: '14px', fontWeight: 800 }}
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In to My Account →'
                : 'Create My Account & Join Royalty →'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            {mode === 'login' ? (
              <>
                New to Choco D&apos;or?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setMode('register')
                  }}
                  style={{ fontWeight: 800, color: 'var(--cocoa-dark)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
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
                    setMode('login')
                  }}
                  style={{ fontWeight: 800, color: 'var(--cocoa-dark)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Sign In
                </button>
              </>
            )}
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(61,37,30,0.08)', textAlign: 'center' }}>
            <Link to="/menu" style={{ fontSize: '12px', color: 'var(--caramel)', fontWeight: 700, textDecoration: 'none' }}>
              ← Return to Artisanal Menu
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
