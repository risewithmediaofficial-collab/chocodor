import { useState, useEffect } from 'react'
import { apiRequest } from '../../api/client'
import { formatPrice } from '../../data/content'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Drilldown / Adjustment state
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [drilldownData, setDrilldownData] = useState(null)
  const [drillLoading, setDrillLoading] = useState(false)

  const [adjustModalCustomer, setAdjustModalCustomer] = useState(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustDirection, setAdjustDirection] = useState('CREDIT')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustMsg, setAdjustMsg] = useState('')

  // QR Code State
  const [qrModalCustomer, setQrModalCustomer] = useState(null)
  useBodyScrollLock(Boolean(selectedCustomer || adjustModalCustomer || qrModalCustomer))

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const data = await apiRequest('/admin/customers', { isAdmin: true })
      setCustomers(data.customers || [])
    } catch (err) {
      console.error('Failed to load customers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  const openDrilldown = async (c) => {
    setSelectedCustomer(c)
    setDrillLoading(true)
    try {
      const data = await apiRequest(`/admin/customers/${c.id}`, { isAdmin: true })
      setDrilldownData(data)
    } catch (err) {
      alert(`Failed to load customer details: ${err.message}`)
    } finally {
      setDrillLoading(false)
    }
  }

  const handleAdjustPoints = async (e) => {
    e.preventDefault()
    setAdjustMsg('')
    if (!adjustReason || adjustReason.trim().length < 3) {
      alert('A valid reason is mandatory for manual point adjustments')
      return
    }

    try {
      await apiRequest(`/admin/customers/${adjustModalCustomer.id}/adjust-points`, {
        method: 'POST',
        isAdmin: true,
        body: {
          amount: parseInt(adjustAmount, 10),
          direction: adjustDirection,
          reason: adjustReason.trim(),
        },
      })
      alert('✓ Point adjustment saved in ledger!')
      setAdjustModalCustomer(null)
      setAdjustAmount('')
      setAdjustReason('')
      loadCustomers()
    } catch (err) {
      alert(`Adjustment failed: ${err.message}`)
    }
  }

  const filtered = customers.filter((c) => {
    const term = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(term) ||
      c.mobile.includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.royalty_id && c.royalty_id.toLowerCase().includes(term))
    )
  })

  // QR Code Details State
  const [qrDetails, setQrDetails] = useState(null)
  const [qrLoading, setQrLoading] = useState(false)

  const handleOpenQR = async (c) => {
    setQrModalCustomer(c)
    setQrLoading(true)
    try {
      const res = await apiRequest(`/royalty/qr/generate/${c.id}`, { method: 'POST', isAdmin: true })
      setQrDetails(res.qr)
    } catch (err) {
      alert(`QR generation failed: ${err.message}`)
    } finally {
      setQrLoading(false)
    }
  }

  const handleRegenerateQR = async () => {
    if (!qrModalCustomer) return
    setQrLoading(true)
    try {
      const res = await apiRequest(`/royalty/qr/generate/${qrModalCustomer.id}`, { method: 'POST', isAdmin: true })
      setQrDetails(res.qr)
      alert('✓ New secure QR token generated! Old QR token has been revoked.')
    } catch (err) {
      alert(`Regeneration failed: ${err.message}`)
    } finally {
      setQrLoading(false)
    }
  }

  const handleRevokeQR = async () => {
    if (!qrModalCustomer) return
    if (!confirm('Are you sure you want to revoke this customer\'s QR code?')) return
    try {
      await apiRequest(`/royalty/qr/revoke/${qrModalCustomer.id}`, { method: 'POST', isAdmin: true })
      alert('✓ Customer QR code revoked successfully.')
      setQrModalCustomer(null)
    } catch (err) {
      alert(`Revoke failed: ${err.message}`)
    }
  }

  const printQR = () => {
    window.print()
  }

  const handleDeleteCustomer = async (c) => {
    if (!confirm(`Are you sure you want to delete customer "${c.name}" (${c.mobile})? All loyalty points and QR tokens for this customer will be removed.`)) {
      return
    }

    try {
      await apiRequest(`/admin/customers/${c.id || c._id}`, {
        method: 'DELETE',
        isAdmin: true,
      })
      alert(`✓ Customer "${c.name}" has been deleted successfully.`)
      loadCustomers()
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '14px' }}>
      
      {/* ─── STATIC TOP SECTION ─── */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--cocoa-dark)', margin: 0 }}>
              Customers &amp; Royalty Accounts
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Manage registered customers, view digital Royalty IDs, points balances, and perform audited point adjustments.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ background: '#FFFFFF', padding: '12px 18px', borderRadius: '14px', border: '1px solid rgba(61,37,30,0.1)', marginBottom: '14px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search customer name, mobile, email or Royalty ID..."
            style={{ width: '100%', padding: '8px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(61,37,30,0.15)', fontSize: '12px', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* ─── SCROLLABLE CUSTOMERS TABLE ─── */}
      <div className="table-responsive" style={{ background: '#FFFFFF', borderRadius: '18px', border: '1px solid rgba(61,37,30,0.1)' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No customers found.</div>
        ) : (
          <table className="admin-table" style={{ margin: 0, minWidth: '760px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#FAF6F0', zIndex: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <tr>
                <th>Customer Name</th>
                <th>Mobile &amp; Email</th>
                <th>Royalty ID</th>
                <th>Current Points</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Joined {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div>{c.mobile}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--caramel)', background: '#FAF0E4', padding: '4px 8px', borderRadius: '6px' }}>
                      {c.royalty_id || '—'}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: '#B37B24', fontSize: '14px' }}>{c.current_points || 0} pts</strong>
                  </td>
                  <td>{c.order_count || 0}</td>
                  <td style={{ fontWeight: 700 }}>{formatPrice(c.total_spent || 0)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => openDrilldown(c)}
                      >
                        Profile &amp; Ledger
                      </button>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => handleOpenQR(c)}
                      >
                        👑 QR Pass
                      </button>
                      <button
                        type="button"
                        className="btn btn--gold btn--sm"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => {
                          setAdjustModalCustomer(c)
                          setAdjustAmount('')
                          setAdjustReason('')
                        }}
                      >
                        Adjust Pts
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm"
                        style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(186,27,27,0.1)', color: '#BA1B1B', fontWeight: 700 }}
                        onClick={() => handleDeleteCustomer(c)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer Drilldown Modal */}
      {selectedCustomer && (
        <div className="cart-drawer-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="product-modal" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="product-modal__close" onClick={() => setSelectedCustomer(null)}>
              ✕
            </button>

            <div className="product-modal__content" style={{ padding: '32px' }}>
              <span className="section-label">CUSTOMER AUDIT PROFILE</span>
              <h2 className="product-modal__title" style={{ fontSize: '1.5rem' }}>
                {selectedCustomer.name}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Royalty ID: <strong>{selectedCustomer.royalty_id}</strong> • Mobile: {selectedCustomer.mobile} • Email: {selectedCustomer.email}
              </p>

              {drillLoading ? (
                <p>Loading customer history...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '420px', overflowY: 'auto' }}>
                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div style={{ background: '#FAF0E4', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)' }}>CURRENT BALANCE</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--cocoa-dark)' }}>
                        {drilldownData?.royalty?.current_points || 0} pts
                      </div>
                    </div>
                    <div style={{ background: '#FAF0E4', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)' }}>LIFETIME EARNED</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--cocoa-dark)' }}>
                        {drilldownData?.royalty?.lifetime_points || 0} pts
                      </div>
                    </div>
                    <div style={{ background: '#FAF0E4', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)' }}>POINTS REDEEMED</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--cocoa-dark)' }}>
                        {drilldownData?.royalty?.points_redeemed || 0} pts
                      </div>
                    </div>
                  </div>

                  {/* Ledger */}
                  <div>
                    <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--cocoa-dark)', margin: '0 0 8px' }}>
                      Transaction Ledger ({drilldownData?.transactions?.length || 0})
                    </h4>
                    <table className="admin-table" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Reason</th>
                          <th>Amount</th>
                          <th>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drilldownData?.transactions?.map((t) => (
                          <tr key={t.id}>
                            <td>{new Date(t.created_at).toLocaleDateString()}</td>
                            <td>{t.type}</td>
                            <td>{t.reason}</td>
                            <td style={{ fontWeight: 800, color: t.direction === 'CREDIT' ? '#2E6F40' : '#BA1B1B' }}>
                              {t.direction === 'CREDIT' ? `+${t.amount}` : `-${t.amount}`}
                            </td>
                            <td>{t.balance_after} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Points Adjustment Modal */}
      {adjustModalCustomer && (
        <div className="cart-drawer-overlay" onClick={() => setAdjustModalCustomer(null)}>
          <div className="product-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="product-modal__close" onClick={() => setAdjustModalCustomer(null)}>
              ✕
            </button>

            <div className="product-modal__content" style={{ padding: '32px' }}>
              <span className="section-label">MANUAL POINTS ADJUSTMENT</span>
              <h2 className="product-modal__title" style={{ fontSize: '1.4rem' }}>
                {adjustModalCustomer.name}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Current Balance: <strong>{adjustModalCustomer.current_points || 0} Points</strong>
              </p>

              <form onSubmit={handleAdjustPoints} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">Adjustment Direction</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={`btn btn--sm ${adjustDirection === 'CREDIT' ? 'btn--gold' : 'btn--outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => setAdjustDirection('CREDIT')}
                    >
                      + Credit Points (Add)
                    </button>
                    <button
                      type="button"
                      className={`btn btn--sm ${adjustDirection === 'DEBIT' ? 'btn--gold' : 'btn--outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => setAdjustDirection('DEBIT')}
                    >
                      − Debit Points (Deduct)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label">Number of Points *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="e.g. 50"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Mandatory Audit Reason *</label>
                  <input
                    type="text"
                    required
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Customer compensation / Birthday perk"
                    className="form-input"
                  />
                </div>

                <button type="submit" className="btn btn--gold btn--full" style={{ marginTop: '8px' }}>
                  Confirm &amp; Record in Ledger →
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Pass Modal */}
      {qrModalCustomer && (
        <div className="cart-drawer-overlay" onClick={() => setQrModalCustomer(null)}>
          <div className="product-modal" style={{ maxWidth: '420px', padding: '32px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="product-modal__close no-print" onClick={() => setQrModalCustomer(null)}>
              ✕
            </button>

            <span className="section-label">SECURE ROYALTY CARD PASS</span>
            <h3 style={{ fontFamily: 'var(--font-display)', margin: '4px 0 2px', color: 'var(--cocoa-dark)', fontSize: '1.4rem' }}>
              {qrModalCustomer.name}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Royalty ID: <strong style={{ color: 'var(--caramel)' }}>{qrModalCustomer.royalty_id}</strong> • Mobile: {qrModalCustomer.mobile}
            </div>

            {qrLoading ? (
              <p style={{ padding: '30px 0' }}>Generating secure cryptographic pass...</p>
            ) : qrDetails ? (
              <div id="printable-qr-card">
                <div style={{ background: '#FFFFFF', border: '2px solid #2B1712', borderRadius: '18px', padding: '20px', margin: '0 auto 16px', display: 'inline-block' }}>
                  <img
                    src={qrDetails.qrImage}
                    alt="Customer QR Code"
                    style={{ width: '220px', height: '220px', display: 'block', margin: '0 auto' }}
                  />
                  <span style={{ display: 'block', fontFamily: 'monospace', fontWeight: 900, color: '#2B1712', marginTop: '10px', fontSize: '14px', letterSpacing: '0.06em' }}>
                    {qrModalCustomer.royalty_id}
                  </span>
                </div>

                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.4 }}>
                  Scan to log in to Choco D&apos;or Customer Portal or present at billing counter for instant identification.
                  <br />
                  <span style={{ color: '#2E6F40', fontWeight: 700 }}>✓ Encrypted Token (Never reveals credentials)</span>
                </p>

                <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button type="button" className="btn btn--gold btn--full" onClick={printQR}>
                    🖨️ Print Royalty QR Card
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn--outline btn--sm" style={{ flex: 1 }} onClick={handleRegenerateQR}>
                      🔄 Regenerate QR
                    </button>
                    <button type="button" className="btn btn--sm" style={{ flex: 1, background: 'rgba(186,27,27,0.1)', color: '#BA1B1B' }} onClick={handleRevokeQR}>
                      🚫 Revoke QR
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
