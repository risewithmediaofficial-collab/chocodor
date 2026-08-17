import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function QRScanLoginPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const [validation, setValidation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Password Setup Form
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    async function validate() {
      try {
        setLoading(true)
        setError('')
        const data = await apiRequest(`/royalty/scan/${token}`)
        setValidation(data)

        // If returning customer that already set password:
        if (!data.needsPasswordSetup) {
          try {
            const loginRes = await apiRequest('/royalty/scan/login', {
              method: 'POST',
              body: { token },
            })
            localStorage.setItem('chocodor_cust_token', loginRes.token)
            localStorage.setItem('chocodor_customer_data', JSON.stringify(loginRes.customer))
            await refreshProfile()
            setTimeout(() => {
              navigate('/account')
            }, 1000)
          } catch (err) {
            setError(err.message)
          }
        }
      } catch (err) {
        setError(err.message || 'Invalid or expired QR code')
      } finally {
        setLoading(false)
      }
    }
    validate()
  }, [token, navigate, refreshProfile])

  const handleSetPassword = async (e) => {
    e.preventDefault()
    setFormError('')

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      const res = await apiRequest('/royalty/scan/set-password', {
        method: 'POST',
        body: { token, newPassword: password },
      })

      localStorage.setItem('chocodor_cust_token', res.token)
      localStorage.setItem('chocodor_customer_data', JSON.stringify(res.customer))
      await refreshProfile()
      navigate('/account')
    } catch (err) {
      setFormError(err.message || 'Failed to set password')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="page page--auth">
        <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>👑</span>
          <h2>Scanning Choco D&apos;or Royalty Pass...</h2>
          <p style={{ color: 'var(--text-muted)' }}>Validating secure cryptographic token with server.</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page page--auth">
        <div className="container" style={{ textAlign: 'center', padding: '80px 20px', maxWidth: '480px', margin: '0 auto' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>⚠️</span>
          <h2 style={{ fontFamily: 'var(--font-display)', color: '#BA1B1B' }}>QR Pass Verification Failed</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{error}</p>
          <Link to="/" className="btn btn--gold">
            Return to Store →
          </Link>
        </div>
      </main>
    )
  }

  // If returning customer logging in:
  if (!validation?.needsPasswordSetup) {
    return (
      <main className="page page--auth">
        <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🎉</span>
          <h2>Welcome back, {validation.customer.name}!</h2>
          <p style={{ color: 'var(--text-muted)' }}>Authenticated via your Royalty Card. Opening your dashboard...</p>
        </div>
      </main>
    )
  }

  // First-Time Password Setup Form
  return (
    <main className="page page--auth">
      <div className="container" style={{ maxWidth: '440px', padding: '60px 20px' }}>
        <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: '24px', border: '1px solid rgba(61,37,30,0.1)', boxShadow: '0 16px 48px rgba(43,23,18,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>👑</span>
            <span className="section-label">WELCOME TO CHOCO D&apos;OR ROYALTY</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--cocoa-dark)', margin: '4px 0' }}>
              Activate Your Account
            </h2>
            <div style={{ background: '#FAF0E4', padding: '10px', borderRadius: '10px', marginTop: '12px', fontSize: '12px', color: 'var(--cocoa)' }}>
              <strong>Member:</strong> {validation.customer.name}
              <br />
              <strong>Royalty ID:</strong> <span style={{ color: 'var(--caramel)', fontWeight: 800 }}>{validation.royalty.royaltyId}</span>
            </div>
          </div>

          {formError && (
            <div style={{ background: 'rgba(186, 27, 27, 0.1)', color: '#BA1B1B', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              ⚠️ {formError}
            </div>
          )}

          <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 4px' }}>
              Please create a secure password to access your Royalty points, redeem sweet rewards, and track orders online.
            </p>

            <div>
              <label className="form-label">New Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Confirm Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn--gold btn--full"
              style={{ marginTop: '10px', padding: '14px' }}
            >
              {submitting ? 'Activating Account...' : 'Set Password & Enter Dashboard →'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
