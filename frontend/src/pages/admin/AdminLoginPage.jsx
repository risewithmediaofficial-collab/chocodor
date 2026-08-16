import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'
import logoImg from '../../assets/logo.jpg'

export default function AdminLoginPage() {
  const { login } = useAdminAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('admin@chocodor.com')
  const [password, setPassword] = useState('chocodor2026')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF6F0', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: '#FFFFFF', padding: '36px', borderRadius: '24px', boxShadow: '0 16px 48px rgba(43,23,18,0.1)', border: '1px solid rgba(61,37,30,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src={logoImg}
            alt="Choco D'or"
            style={{ width: '72px', height: '72px', borderRadius: '16px', margin: '0 auto 12px', display: 'block', objectFit: 'cover', boxShadow: '0 8px 24px rgba(43,23,18,0.15)' }}
          />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--cocoa-dark)', margin: 0 }}>
            CHOCO D&apos;OR ADMIN
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Krishnagiri Store Management &amp; Royalty Portal
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(186, 27, 27, 0.1)', color: '#BA1B1B', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Admin Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn--gold btn--full"
            style={{ marginTop: '8px', padding: '14px' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Admin Portal →'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
          Default Credentials: <code>admin@chocodor.com</code> / <code>chocodor2026</code>
        </div>
      </div>
    </div>
  )
}
