import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiRequest } from '../../api/client'
import { formatPrice } from '../../data/content'
import InvoiceModal from '../../components/InvoiceModal'
import DateRangeFilter from '../../components/admin/DateRangeFilter'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [newOrderAlert, setNewOrderAlert] = useState(null)
  const [activeInvoiceNumber, setActiveInvoiceNumber] = useState(null)

  // 30-second polling state
  const [countdown, setCountdown] = useState(30)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const lastOrderCountRef = useRef(0)

  const fetchOrders = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (search) params.append('search', search)
      if (fromDate) params.append('fromDate', fromDate)
      if (toDate) params.append('toDate', toDate)

      const data = await apiRequest(`/admin/orders?${params.toString()}`, { isAdmin: true })
      const fetchedOrders = data.orders || []

      // Check if new orders arrived during polling
      if (lastOrderCountRef.current > 0 && fetchedOrders.length > lastOrderCountRef.current) {
        const newest = fetchedOrders[0]
        setNewOrderAlert(newest)
        // Play notification sound
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 587.33 // D5
          gain.gain.setValueAtTime(0.2, ctx.currentTime)
          osc.start()
          osc.stop(ctx.currentTime + 0.35)
        } catch {
          // ignore audio failure
        }
      }

      lastOrderCountRef.current = fetchedOrders.length
      setOrders(fetchedOrders)
      setLastUpdated(new Date())
      setCountdown(30)
    } catch (err) {
      console.error('Failed to poll orders:', err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [statusFilter, search])

  // Initial load & filter change
  useEffect(() => {
    fetchOrders(false)
  }, [fetchOrders])

  // 30-second interval polling + countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchOrders(true)
          return 30
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [fetchOrders])

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await apiRequest(`/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        isAdmin: true,
        body: { status: newStatus },
      })
      fetchOrders(true)
    } catch (err) {
      alert(`Error updating order status: ${err.message}`)
    }
  }

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Are you sure you want to delete order "${order.order_number}"? This will permanently remove its line items, bill, and KOT ticket.`)) return
    try {
      await apiRequest(`/admin/orders/${order.id || order.order_number}`, {
        method: 'DELETE',
        isAdmin: true,
      })
      alert(`✓ Order "${order.order_number}" deleted successfully.`)
      fetchOrders(true)
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '14px' }}>
      
      {/* ─── STATIC TOP CONTROLS ─── */}
      <div style={{ flexShrink: 0 }}>
        {/* Top Header & 30s Polling Monitor */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--cocoa-dark)', margin: 0 }}>
              Live Orders Management
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Real-time kitchen &amp; delivery workflow with automatic 30-second live polling.
            </p>
          </div>

          {/* Polling Indicator */}
          <div style={{ background: '#FFFFFF', padding: '8px 14px', borderRadius: '12px', border: '1px solid rgba(61,37,30,0.12)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-indicator" />
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cocoa-dark)' }}>
                Live Polling: Next check in {countdown}s
              </span>
            </div>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => fetchOrders(true)}
            >
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

        {/* New Order Alert Banner */}
        <AnimatePresence>
          {newOrderAlert && (
            <motion.div
              className="new-order-banner"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              style={{ marginBottom: '12px', padding: '10px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>🔔</span>
                <div>
                  <strong style={{ fontSize: '13px' }}>NEW ORDER: #{newOrderAlert.order_number}</strong>
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                    {newOrderAlert.customer_name} • {formatPrice(newOrderAlert.total_amount)} • {newOrderAlert.order_type}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Link to={`/admin/orders/${newOrderAlert.id}`} className="btn btn--gold btn--sm" style={{ padding: '4px 10px', fontSize: '11px' }}>
                  View →
                </Link>
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  onClick={() => setNewOrderAlert(null)}
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter & Search Bar */}
        <div style={{ background: '#FFFFFF', padding: '12px 18px', borderRadius: '14px', border: '1px solid rgba(61,37,30,0.1)', marginBottom: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search Order ID, Customer Name, Mobile..."
            style={{ flex: '1 1 220px', padding: '8px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(61,37,30,0.15)', fontSize: '12px', fontFamily: 'inherit' }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(61,37,30,0.15)', fontSize: '12px', fontFamily: 'inherit', background: '#FFFFFF' }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PREPARING">PREPARING</option>
            <option value="READY">READY</option>
            <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* ─── SCROLLABLE ORDERS TABLE SECTION ─── */}
      <div className="table-responsive" style={{ background: '#FFFFFF', borderRadius: '18px', border: '1px solid rgba(61,37,30,0.1)' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading live orders...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No orders found matching the filter criteria.
          </div>
        ) : (
          <table className="admin-table" style={{ margin: 0, minWidth: '780px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#FAF6F0', zIndex: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <tr>
                <th>Order Number</th>
                <th>Customer &amp; Mobile</th>
                <th>Type &amp; Items</th>
                <th>Total</th>
                <th>Royalty Points</th>
                <th>Status</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => (
                <tr key={ord.id}>
                  <td>
                    <Link to={`/admin/orders/${ord.id}`} style={{ fontWeight: 800, color: 'var(--cocoa-dark)', textDecoration: 'underline' }}>
                      {ord.order_number}
                    </Link>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  <td>
                    <strong>{ord.customer_name}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ord.customer_mobile}</div>
                  </td>

                  <td>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--caramel)', display: 'block' }}>
                      {ord.order_type}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--cocoa)' }}>
                      {ord.items?.map((i) => `${i.quantity}× ${i.product_name_snapshot}`).join(', ')}
                    </span>
                  </td>

                  <td>
                    <strong style={{ fontSize: '14px' }}>{formatPrice(ord.total_amount)}</strong>
                    <div style={{ fontSize: '11px', color: ord.payment_status === 'PAID' ? '#2E6F40' : '#B37B24', fontWeight: 700 }}>
                      {ord.payment_method === 'SPLIT' ? 'SPLIT' : ord.payment_status}
                    </div>
                    {ord.payment_method === 'SPLIT' && Array.isArray(ord.payment_breakdown) && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {ord.payment_breakdown.map((p) => `${p.method} ${formatPrice(p.amount)}`).join(' + ')}
                      </div>
                    )}
                  </td>

                  <td>
                    <span style={{ color: ord.points_credited ? '#2E6F40' : '#B37B24', fontWeight: 800 }}>
                      {ord.points_credited ? `✓ +${ord.total_royalty_points} Credited` : `+${ord.total_royalty_points} on Complete`}
                    </span>
                  </td>

                  <td>
                    <span className={`order-badge order-badge--${ord.status.toLowerCase()}`}>
                      {ord.status.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {ord.status === 'NEW' && (
                        <button
                          type="button"
                          className="btn btn--gold btn--sm"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleStatusChange(ord.id, 'CONFIRMED')}
                        >
                          Confirm
                        </button>
                      )}
                      {ord.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          className="btn btn--gold btn--sm"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleStatusChange(ord.id, 'PREPARING')}
                        >
                          Preparing
                        </button>
                      )}
                      {ord.status === 'PREPARING' && (
                        <button
                          type="button"
                          className="btn btn--gold btn--sm"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleStatusChange(ord.id, 'READY')}
                        >
                          Ready
                        </button>
                      )}
                      {ord.status === 'READY' && (
                        <button
                          type="button"
                          className="btn btn--gold btn--sm"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleStatusChange(ord.id, ord.order_type === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY_FOR_PICKUP')}
                        >
                          {ord.order_type === 'DELIVERY' ? 'Out for Delivery' : 'Ready for Pickup'}
                        </button>
                      )}
                      {['OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'].includes(ord.status) && (
                        <button
                          type="button"
                          className="btn btn--gold btn--sm"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleStatusChange(ord.id, 'DELIVERED')}
                        >
                          Delivered / Picked Up
                        </button>
                      )}
                      {ord.status === 'DELIVERED' && (
                        <button
                          type="button"
                          className="btn btn--gold btn--sm"
                          style={{ padding: '4px 8px', fontSize: '11px', background: '#2E6F40', color: '#FFFFFF' }}
                          onClick={() => handleStatusChange(ord.id, 'COMPLETED')}
                        >
                          ✓ Complete &amp; Credit Points
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => setActiveInvoiceNumber(ord.order_number)}
                      >
                        🧾 Bill &amp; QR
                      </button>
                      {!['COMPLETED', 'CANCELLED'].includes(ord.status) && (
                        <button
                          type="button"
                          className="btn btn--sm"
                          style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(186,27,27,0.1)', color: '#BA1B1B' }}
                          onClick={() => handleStatusChange(ord.id, 'CANCELLED')}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn--sm"
                        style={{ padding: '4px 8px', fontSize: '11px', background: '#FDE8E8', color: '#BA1B1B', border: '1px solid rgba(186,27,27,0.2)' }}
                        onClick={() => handleDeleteOrder(ord)}
                        title="Permanently delete order"
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

      {activeInvoiceNumber && (
        <InvoiceModal
          invoiceNumber={activeInvoiceNumber}
          onClose={() => setActiveInvoiceNumber(null)}
        />
      )}
    </div>
  )
}
