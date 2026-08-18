import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import { formatPrice } from '../../data/content'
import InvoiceModal from '../../components/InvoiceModal'
import DateRangeFilter from '../../components/admin/DateRangeFilter'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [activeInvoiceNumber, setActiveInvoiceNumber] = useState(null)

  const loadStats = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (fromDate) params.append('fromDate', fromDate)
      if (toDate) params.append('toDate', toDate)
      const data = await apiRequest(`/admin/dashboard?${params.toString()}`, { isAdmin: true })
      setStats(data)
    } catch (err) {
      console.error('Failed to load dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [fromDate, toDate])

  if (loading) {
    return <div style={{ padding: '40px' }}>Loading live dashboard metrics...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cocoa-dark)', margin: 0 }}>
            Store Overview &amp; Live Metrics
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Real-time analytics &amp; bills from Choco D&apos;or Krishnagiri database.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/admin/pos" className="btn btn--gold btn--sm">
            + New POS Bill ↗
          </Link>
          <Link to="/admin/orders" className="btn btn--outline btn--sm">
            View All Orders →
          </Link>
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

      {/* Metric Cards Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Today&apos;s Orders</div>
          <div className="admin-stat-card__val">{stats?.todayOrders || 0}</div>
          <div className="admin-stat-card__sub">Total Lifetime: {stats?.totalOrders || 0}</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Today&apos;s Sales</div>
          <div className="admin-stat-card__val" style={{ color: '#2E6F40' }}>
            {formatPrice(stats?.todaySales || 0)}
          </div>
          <div className="admin-stat-card__sub">Lifetime: {formatPrice(stats?.totalSales || 0)}</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Pending Orders (New)</div>
          <div className="admin-stat-card__val" style={{ color: stats?.pendingOrders > 0 ? '#BA1B1B' : 'var(--cocoa-dark)' }}>
            {stats?.pendingOrders || 0}
          </div>
          <div className="admin-stat-card__sub">In Kitchen/Transit: {stats?.processingOrders || 0}</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Royalty Members</div>
          <div className="admin-stat-card__val" style={{ color: '#B37B24' }}>
            {stats?.totalMembers || 0}
          </div>
          <div className="admin-stat-card__sub">Active Pool: {stats?.activePointsPool || 0} pts</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Points Issued</div>
          <div className="admin-stat-card__val">{stats?.pointsIssued || 0} pts</div>
          <div className="admin-stat-card__sub">Redeemed: {stats?.pointsRedeemed || 0} pts</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Completed Orders</div>
          <div className="admin-stat-card__val" style={{ color: '#2E6F40' }}>
            {stats?.completedOrders || 0}
          </div>
          <div className="admin-stat-card__sub">Cancelled: {stats?.cancelledOrders || 0}</div>
        </div>
      </div>

      <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        {[
          ['Cash Collected', stats?.paymentBreakdown?.CASH || 0],
          ['UPI Collected', stats?.paymentBreakdown?.UPI || 0],
          ['Card Collected', stats?.paymentBreakdown?.CARD || 0],
          ['Split Bills Total', stats?.paymentBreakdown?.SPLIT || 0],
        ].map(([label, value]) => (
          <div key={label} className="admin-stat-card">
            <div className="admin-stat-card__label">{label}</div>
            <div className="admin-stat-card__val" style={{ fontSize: '1.25rem', color: '#2E6F40' }}>
              {formatPrice(value)}
            </div>
            <div className="admin-stat-card__sub">Today&apos;s paid POS/orders</div>
          </div>
        ))}
      </div>

      {/* Recent Bills & Invoices List in One Line Table */}
      <div style={{ marginTop: '36px', background: '#FFFFFF', padding: '24px', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', margin: 0 }}>
              🧾 Live Invoices &amp; Bills Registry
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Click any bill to open full customer receipt, items breakdown &amp; QR activation pass.
            </span>
          </div>
          <Link to="/admin/orders" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--caramel)', textDecoration: 'underline' }}>
            View Full Registry →
          </Link>
        </div>

        {stats?.recentOrders?.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No orders placed yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th>Invoice / Order</th>
                  <th>Customer Name</th>
                  <th>Mobile</th>
                  <th>Order Channel</th>
                  <th>Bill Total</th>
                  <th>Payment</th>
                  <th>Royalty Points</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentOrders?.map((ord) => (
                  <tr key={ord.id} style={{ cursor: 'pointer' }} onClick={() => setActiveInvoiceNumber(ord.order_number)}>
                    <td>
                      <strong style={{ color: 'var(--cocoa-dark)' }}>
                        {ord.order_number}
                      </strong>
                    </td>
                    <td style={{ fontWeight: 600 }}>{ord.customer_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{ord.customer_mobile || '—'}</td>
                    <td>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: ord.order_source === 'OFFLINE' ? '#FAF0E4' : '#E2F0E6', color: ord.order_source === 'OFFLINE' ? '#B37B24' : '#2E6F40' }}>
                        {ord.order_source === 'OFFLINE' ? '🏪 Offline POS' : '🌐 Online Store'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, fontSize: '14px', color: 'var(--cocoa-dark)' }}>
                      {formatPrice(ord.total_amount)}
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: ord.payment_status === 'PAID' ? '#2E6F40' : '#B37B24' }}>
                        {ord.payment_method === 'SPLIT' ? 'SPLIT' : ord.payment_method} / {ord.payment_status}
                      </span>
                      {ord.payment_method === 'SPLIT' && Array.isArray(ord.payment_breakdown) && (
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>
                          {ord.payment_breakdown.map((p) => `${p.method}: ${formatPrice(p.amount)}`).join(' + ')}
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: '#B37B24', fontWeight: 800 }}>+{ord.total_royalty_points} pts</span>
                    </td>
                    <td>
                      <span className={`order-badge order-badge--${ord.status.toLowerCase()}`}>
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--gold btn--sm"
                        style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 800 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveInvoiceNumber(ord.order_number)
                        }}
                      >
                        🧾 View Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Modal Preview */}
      {activeInvoiceNumber && (
        <InvoiceModal
          invoiceNumber={activeInvoiceNumber}
          onClose={() => setActiveInvoiceNumber(null)}
        />
      )}
    </div>
  )
}
