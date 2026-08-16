import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import InvoiceModal from '../../components/InvoiceModal'
import DateRangeFilter from '../../components/admin/DateRangeFilter'

export default function AdminKOTPage() {
  const [kots, setKots] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ACTIVE') // 'ACTIVE' | 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED'
  const [viewMode, setViewMode] = useState('LIST') // 'LIST' | 'CARDS'
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [countdown, setCountdown] = useState(12)
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState(null)
  const lastKotCountRef = useRef(0)

  const fetchKots = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true)
      const data = await apiRequest('/kot', { isAdmin: true })
      const allKots = data.kots || []

      // Chime on new KOT
      if (lastKotCountRef.current > 0 && allKots.length > lastKotCountRef.current) {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 659.25 // E5
          gain.gain.setValueAtTime(0.2, ctx.currentTime)
          osc.start()
          osc.stop(ctx.currentTime + 0.3)
        } catch {}
      }

      lastKotCountRef.current = allKots.length
      setKots(allKots)
      setCountdown(12)
    } catch (err) {
      console.error('KOT polling error:', err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKots(false)
  }, [fetchKots])

  // 12-second polling ticker for Kitchen
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchKots(true)
          return 12
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [fetchKots])

  const handleUpdateKotStatus = async (kotId, newStatus) => {
    try {
      await apiRequest(`/kot/${kotId}/status`, {
        method: 'PATCH',
        isAdmin: true,
        body: { status: newStatus },
      })
      fetchKots(true)
    } catch (err) {
      alert(`KOT update error: ${err.message}`)
    }
  }

  const handleDeleteKot = async (kot) => {
    if (!window.confirm(`Are you sure you want to remove kitchen ticket "${kot.kot_number}"?`)) return
    try {
      await apiRequest(`/admin/kot/${kot.id || kot.kot_number}`, {
        method: 'DELETE',
        isAdmin: true,
      })
      alert(`✓ Kitchen ticket "${kot.kot_number}" removed.`)
      fetchKots(true)
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  const filteredKots = kots.filter((k) => {
    // Status Filter
    let matchStatus = true
    if (statusFilter === 'ACTIVE') matchStatus = ['NEW', 'PREPARING', 'READY'].includes(k.status)
    else if (statusFilter === 'COMPLETED') matchStatus = k.status === 'COMPLETED'
    else if (statusFilter) matchStatus = k.status === statusFilter

    // Date-to-Date Filter
    let matchDate = true
    if (fromDate || toDate) {
      const kotDateStr = new Date(k.created_at).toISOString().split('T')[0]
      if (fromDate && kotDateStr < fromDate) matchDate = false
      if (toDate && kotDateStr > toDate) matchDate = false
    }

    return matchStatus && matchDate
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '14px' }}>
      
      {/* ─── STATIC TOP CONTROLS SECTION ─── */}
      <div style={{ flexShrink: 0 }}>
        {/* Top Header & Actions Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--cocoa-dark)', margin: 0 }}>
              Kitchen Order Tickets (KOT)
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Real-time kitchen order queue with automatic 12-second live refresh &amp; instant billing links.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/admin/pos" className="btn btn--gold btn--sm" style={{ padding: '8px 14px', fontWeight: 800 }}>
              + New POS Billing ↗
            </Link>
            <div style={{ background: '#FFFFFF', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(61,37,30,0.12)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800 }}>
              <span className="pulse-indicator" />
              Auto-Refresh: {countdown}s
            </div>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => fetchKots(true)} style={{ padding: '6px 12px' }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Date-to-Date Range Filter */}
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => {
            setFromDate(from)
            setToDate(to)
          }}
        />

        {/* Filter Tabs & View Mode Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn--sm ${statusFilter === 'ACTIVE' ? 'btn--gold' : 'btn--outline'}`}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius-pill)', fontWeight: 800, fontSize: '12px' }}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              🔥 Active Tickets ({kots.filter((k) => ['NEW', 'PREPARING', 'READY'].includes(k.status)).length})
            </button>
            <button
              type="button"
              className={`btn btn--sm ${statusFilter === 'NEW' ? 'btn--gold' : 'btn--outline'}`}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius-pill)', fontWeight: 800, fontSize: '12px' }}
              onClick={() => setStatusFilter('NEW')}
            >
              🟡 New ({kots.filter((k) => k.status === 'NEW').length})
            </button>
            <button
              type="button"
              className={`btn btn--sm ${statusFilter === 'PREPARING' ? 'btn--gold' : 'btn--outline'}`}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius-pill)', fontWeight: 800, fontSize: '12px' }}
              onClick={() => setStatusFilter('PREPARING')}
            >
              👩‍🍳 In Preparation ({kots.filter((k) => k.status === 'PREPARING').length})
            </button>
            <button
              type="button"
              className={`btn btn--sm ${statusFilter === 'READY' ? 'btn--gold' : 'btn--outline'}`}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius-pill)', fontWeight: 800, fontSize: '12px' }}
              onClick={() => setStatusFilter('READY')}
            >
              📦 Ready ({kots.filter((k) => k.status === 'READY').length})
            </button>
            <button
              type="button"
              className={`btn btn--sm ${statusFilter === 'COMPLETED' ? 'btn--gold' : 'btn--outline'}`}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius-pill)', fontWeight: 800, fontSize: '12px' }}
              onClick={() => setStatusFilter('COMPLETED')}
            >
              ✓ Completed ({kots.filter((k) => k.status === 'COMPLETED').length})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#FFFFFF', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(61,37,30,0.15)', padding: '2px' }}>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                background: viewMode === 'LIST' ? 'var(--cocoa-dark)' : 'transparent',
                color: viewMode === 'LIST' ? '#FFFFFF' : 'var(--cocoa)',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              📋 List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                background: viewMode === 'CARDS' ? 'var(--cocoa-dark)' : 'transparent',
                color: viewMode === 'CARDS' ? '#FFFFFF' : 'var(--cocoa)',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🎴 Cards Grid
            </button>
          </div>
        </div>
      </div>

      {/* ─── SCROLLABLE KOT CONTENT SECTION (LIST / CARDS) ─── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#FFFFFF', borderRadius: '18px', border: '1px solid rgba(61,37,30,0.1)', padding: viewMode === 'LIST' ? '0' : '20px' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>Loading kitchen tickets...</div>
        ) : filteredKots.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>🍳</span>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cocoa-dark)' }}>No Kitchen Tickets Found</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>All orders for this date filter have been completed.</p>
          </div>
        ) : viewMode === 'LIST' ? (
          /* ─── 1-LINE TABLE LIST VIEW ─── */
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', margin: 0, whiteSpace: 'nowrap' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#FAF6F0', zIndex: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <tr>
                  <th>KOT Ticket</th>
                  <th>Order Reference</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Items Ordered (Kitchen Summary)</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Kitchen Workflow</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredKots.map((kot) => {
                  const isNew = kot.status === 'NEW'
                  const isPrep = kot.status === 'PREPARING'
                  const isReady = kot.status === 'READY'

                  return (
                    <tr
                      key={kot.id}
                      style={{ cursor: 'pointer', background: isNew ? '#FFFDF5' : 'transparent' }}
                      onClick={() => setActiveInvoiceOrder(kot.order_number)}
                    >
                      <td>
                        <strong style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--cocoa-dark)' }}>
                          {kot.kot_number}
                        </strong>
                      </td>
                      <td>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--cocoa-dark)' }}>{kot.order_number}</span>
                          <span style={{ display: 'block', fontSize: '10px', color: kot.order_source === 'OFFLINE' ? '#2E6F40' : 'var(--caramel)', fontWeight: 800 }}>
                            {kot.order_source === 'OFFLINE' ? '🏪 POS Counter' : '🌐 Online'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{kot.customer_name}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                            {kot.customer_mobile || '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#FAF0E4', color: 'var(--cocoa-dark)' }}>
                          {kot.order_type}
                        </span>
                      </td>
                      <td style={{ maxWidth: '300px', whiteSpace: 'normal' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {kot.items?.map((i, idx) => (
                            <span key={idx} style={{ fontSize: '12px', fontWeight: 600 }}>
                              • {i.name} <strong style={{ color: '#B37B24' }}>× {i.quantity}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {new Date(kot.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-pill)',
                            background: isNew ? '#FDF4D8' : isPrep ? '#FAF0E4' : isReady ? '#E2F0E6' : '#EEE',
                            color: isNew ? '#8C6A12' : isPrep ? '#B37B24' : isReady ? '#2E6F40' : '#666',
                          }}
                        >
                          {kot.status}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {isNew && (
                            <button
                              type="button"
                              className="btn btn--gold btn--sm"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => handleUpdateKotStatus(kot.id, 'PREPARING')}
                            >
                              👩‍🍳 Start
                            </button>
                          )}
                          {isPrep && (
                            <button
                              type="button"
                              className="btn btn--gold btn--sm"
                              style={{ padding: '4px 10px', fontSize: '11px', background: '#2E6F40', color: '#FFFFFF' }}
                              onClick={() => handleUpdateKotStatus(kot.id, 'READY')}
                            >
                              📦 Ready
                            </button>
                          )}
                          {isReady && (
                            <button
                              type="button"
                              className="btn btn--outline btn--sm"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => handleUpdateKotStatus(kot.id, 'COMPLETED')}
                            >
                              ✓ Complete
                            </button>
                          )}
                          {kot.status === 'COMPLETED' && (
                            <span style={{ fontSize: '11px', color: '#2E6F40', fontWeight: 800 }}>✓ Done</span>
                          )}
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn--outline btn--sm"
                            style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 800 }}
                            onClick={() => setActiveInvoiceOrder(kot.order_number)}
                          >
                            🧾 Bill
                          </button>
                          <button
                            type="button"
                            className="btn btn--sm"
                            style={{ padding: '4px 8px', fontSize: '11px', background: '#FDE8E8', color: '#BA1B1B', border: '1px solid rgba(186,27,27,0.2)' }}
                            onClick={() => handleDeleteKot(kot)}
                            title="Delete KOT"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ─── CARD GRID VIEW ─── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
            {filteredKots.map((kot) => {
              const isNew = kot.status === 'NEW'
              const isPrep = kot.status === 'PREPARING'
              const isReady = kot.status === 'READY'

              return (
                <div
                  key={kot.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '18px',
                    border: isNew ? '2px solid #F0C14B' : '1px solid rgba(61,37,30,0.1)',
                    boxShadow: isNew ? '0 8px 24px rgba(240, 193, 75, 0.2)' : '0 4px 12px rgba(0,0,0,0.03)',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(61,37,30,0.08)', paddingBottom: '10px', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--cocoa-dark)' }}>
                          {kot.kot_number}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Order: <strong>{kot.order_number}</strong> • <span style={{ color: kot.order_source === 'OFFLINE' ? '#2E6F40' : 'var(--caramel)', fontWeight: 800 }}>{kot.order_source === 'OFFLINE' ? '🏪 POS Counter' : '🌐 Online'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-pill)',
                            background: isNew ? '#FDF4D8' : isPrep ? '#FAF0E4' : isReady ? '#E2F0E6' : '#EEE',
                            color: isNew ? '#8C6A12' : isPrep ? '#B37B24' : isReady ? '#2E6F40' : '#666',
                          }}
                        >
                          {kot.status}
                        </span>
                        <button
                          type="button"
                          className="btn btn--sm"
                          style={{ padding: '2px 6px', fontSize: '11px', background: '#FDE8E8', color: '#BA1B1B' }}
                          onClick={() => handleDeleteKot(kot)}
                          title="Delete KOT"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Customer */}
                    <div style={{ background: '#FAF0E4', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{kot.customer_name} {kot.customer_mobile && `(${kot.customer_mobile})`}</strong>
                      <span style={{ fontWeight: 800 }}>{kot.order_type}</span>
                    </div>

                    {/* Items */}
                    <div style={{ background: '#FAF6F0', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                      {kot.items?.map((i, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span>{i.name}</span>
                          <strong style={{ color: '#B37B24' }}>× {i.quantity}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {isNew && (
                      <button type="button" className="btn btn--gold btn--full" style={{ padding: '8px', fontSize: '12px' }} onClick={() => handleUpdateKotStatus(kot.id, 'PREPARING')}>
                        👩‍🍳 Start Preparing
                      </button>
                    )}
                    {isPrep && (
                      <button type="button" className="btn btn--gold btn--full" style={{ padding: '8px', fontSize: '12px', background: '#2E6F40', color: '#FFF' }} onClick={() => handleUpdateKotStatus(kot.id, 'READY')}>
                        📦 Mark Ready
                      </button>
                    )}
                    {isReady && (
                      <button type="button" className="btn btn--outline btn--full" style={{ padding: '8px', fontSize: '12px' }} onClick={() => handleUpdateKotStatus(kot.id, 'COMPLETED')}>
                        ✓ Complete
                      </button>
                    )}
                    <button type="button" className="btn btn--outline btn--full" style={{ padding: '8px', fontSize: '12px', fontWeight: 800 }} onClick={() => setActiveInvoiceOrder(kot.order_number)}>
                      🧾 Bill
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invoice Modal from KOT */}
      {activeInvoiceOrder && (
        <InvoiceModal
          invoiceNumber={activeInvoiceOrder}
          onClose={() => setActiveInvoiceOrder(null)}
        />
      )}
    </div>
  )
}
