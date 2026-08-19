import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import { formatPrice } from '../../data/content'
import InvoiceModal from '../../components/InvoiceModal'
import DateRangeFilter from '../../components/admin/DateRangeFilter'

const chartPanelStyle = {
  background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFDF9 100%)',
  border: '1px solid rgba(61,37,30,0.1)',
  borderRadius: '18px',
  padding: '20px',
  minHeight: '260px',
}

function DonutChart({ segments, title, value, subtitle }) {
  let offset = 0
  const total = segments.reduce((sum, item) => sum + Math.max(Number(item.value) || 0, 0), 0)
  const normalized = total > 0 ? segments : [{ label: 'Empty', value: 1, color: '#EEE7DF' }]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '18px', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 150, height: 150 }}>
        <svg viewBox="0 0 100 100" width="150" height="150" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="38" fill="none" stroke="#F3EAE1" strokeWidth="12" />
          {normalized.map((item) => {
            const portion = total > 0 ? (Math.max(Number(item.value) || 0, 0) / total) * 100 : 100
            const circle = (
              <circle
                key={item.label}
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke={item.color}
                strokeWidth="12"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray={`${portion} ${100 - portion}`}
                strokeDashoffset={-offset}
              />
            )
            offset += portion
            return circle
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <strong style={{ display: 'block', fontSize: '1.15rem', color: 'var(--cocoa-dark)' }}>{value}</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{subtitle}</span>
          </div>
        </div>
      </div>
      <div>
        <h3 style={{ margin: '0 0 12px', color: 'var(--cocoa-dark)' }}>{title}</h3>
        <div style={{ display: 'grid', gap: '9px' }}>
          {segments.map((item) => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: item.color }} />
                {item.label}
              </span>
              <strong style={{ color: 'var(--cocoa-dark)' }}>{item.display ?? item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BarChart({ title, subtitle, bars }) {
  const max = Math.max(...bars.map((bar) => Math.abs(Number(bar.value) || 0)), 1)

  return (
    <div style={chartPanelStyle}>
      <div style={{ marginBottom: '18px' }}>
        <h3 style={{ margin: 0, color: 'var(--cocoa-dark)' }}>{title}</h3>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{subtitle}</span>
      </div>
      <div style={{ display: 'grid', gap: '14px' }}>
        {bars.map((bar) => {
          const width = Math.max((Math.abs(Number(bar.value) || 0) / max) * 100, Number(bar.value) ? 8 : 2)
          return (
            <div key={bar.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '6px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>{bar.label}</span>
                <strong style={{ color: bar.color }}>{bar.display ?? bar.value}</strong>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: '#F1E8DE', overflow: 'hidden' }}>
                <div style={{ width: `${width}%`, height: '100%', borderRadius: 999, background: bar.color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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

  const isTodayFilter = stats?.filter?.isToday !== false
  const periodLabel = isTodayFilter ? 'Today' : 'Selected Period'
  const lowStock = stats?.stockSummary?.lowStock || []
  const recentMovements = stats?.stockSummary?.recentMovements || []
  const staffAttendance = stats?.staffSummary?.attendance || []
  const paymentBreakdown = stats?.paymentBreakdown || {}
  const activeStaff = stats?.staffSummary?.activeStaff || 0
  const presentStaff = stats?.staffSummary?.presentToday || 0
  const lowStockCount = stats?.stockSummary?.lowStockCount || 0
  const materialsCount = stats?.stockSummary?.materialsCount || 0
  const healthyStockCount = Math.max(materialsCount - lowStockCount, 0)
  const movementIn = recentMovements.filter((row) => row.type === 'IN').reduce((sum, row) => sum + Number(row.quantity || 0), 0)
  const movementOut = recentMovements.filter((row) => row.type !== 'IN').reduce((sum, row) => sum + Math.abs(Number(row.quantity || 0)), 0)
  const paymentSegments = [
    { label: 'Cash', value: paymentBreakdown.CASH || 0, display: formatPrice(paymentBreakdown.CASH || 0), color: '#2E6F40' },
    { label: 'UPI', value: paymentBreakdown.UPI || 0, display: formatPrice(paymentBreakdown.UPI || 0), color: '#F2C94C' },
    { label: 'Card', value: paymentBreakdown.CARD || 0, display: formatPrice(paymentBreakdown.CARD || 0), color: '#7A4E2D' },
    { label: 'Split', value: paymentBreakdown.SPLIT || 0, display: formatPrice(paymentBreakdown.SPLIT || 0), color: '#C56F35' },
  ]
  const stockSegments = [
    { label: 'Healthy Stock', value: healthyStockCount, color: '#2E6F40' },
    { label: 'Low Stock', value: lowStockCount, color: '#BA1B1B' },
  ]
  const staffSegments = [
    { label: 'Present', value: presentStaff, color: '#2E6F40' },
    { label: 'Not Marked', value: Math.max(activeStaff - presentStaff, 0), color: '#D8C4B0' },
  ]

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

      <section style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <div style={{ ...chartPanelStyle, minHeight: '320px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '18px', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>{periodLabel} Revenue</div>
              <div style={{ fontSize: '2.35rem', fontFamily: 'var(--font-display)', color: '#2E6F40', lineHeight: 1.05 }}>
                {formatPrice(stats?.todaySales || 0)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                {stats?.todayOrders || 0} orders | {stats?.completedOrders || 0} completed | lifetime {formatPrice(stats?.totalSales || 0)}
              </div>
            </div>
            <Link to="/admin/pos" className="btn btn--gold btn--sm">New Bill</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', alignItems: 'end', height: 155, marginTop: '28px' }}>
            {[
              { label: 'Orders', value: stats?.todayOrders || 0, color: '#7A4E2D' },
              { label: 'Pending', value: stats?.pendingOrders || 0, color: '#BA1B1B' },
              { label: 'Kitchen', value: stats?.processingOrders || 0, color: '#C56F35' },
              { label: 'Done', value: stats?.completedOrders || 0, color: '#2E6F40' },
            ].map((bar) => {
              const maxOrder = Math.max(stats?.todayOrders || 0, stats?.pendingOrders || 0, stats?.processingOrders || 0, stats?.completedOrders || 0, 1)
              return (
                <div key={bar.label} style={{ display: 'grid', gap: '8px', alignItems: 'end', height: '100%' }}>
                  <div style={{ alignSelf: 'end', height: `${Math.max((bar.value / maxOrder) * 100, bar.value ? 12 : 4)}%`, minHeight: 4, borderRadius: '12px 12px 4px 4px', background: bar.color }} />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--cocoa-dark)' }}>{bar.value}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bar.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={chartPanelStyle}>
          <DonutChart
            title="Payment Mix"
            value={formatPrice(stats?.todaySales || 0)}
            subtitle="collected"
            segments={paymentSegments}
          />
        </div>
      </section>

      <section style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <BarChart
          title="Operations Flow"
          subtitle="Sales, buying, expenses, and estimated profit."
          bars={[
            { label: 'Sales', value: stats?.todaySales || 0, display: formatPrice(stats?.todaySales || 0), color: '#2E6F40' },
            { label: 'Purchases', value: stats?.operationsSummary?.purchases || 0, display: formatPrice(stats?.operationsSummary?.purchases || 0), color: '#C56F35' },
            { label: 'Expenses', value: stats?.operationsSummary?.expenses || 0, display: formatPrice(stats?.operationsSummary?.expenses || 0), color: '#BA1B1B' },
            { label: 'Estimated Profit', value: stats?.operationsSummary?.estimatedProfit || 0, display: formatPrice(stats?.operationsSummary?.estimatedProfit || 0), color: '#7A4E2D' },
          ]}
        />

        <div style={chartPanelStyle}>
          <DonutChart
            title="Stock Health"
            value={`${healthyStockCount}/${materialsCount}`}
            subtitle="healthy"
            segments={stockSegments}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginTop: '18px' }}>
            <span style={{ color: lowStockCount ? '#BA1B1B' : '#2E6F40', fontWeight: 900 }}>
              {lowStockCount ? `${lowStockCount} material needs refill` : 'All materials are above minimum'}
            </span>
            <Link to="/admin/stock" className="btn btn--outline btn--sm">Open Stock</Link>
          </div>
        </div>

        <div style={chartPanelStyle}>
          <DonutChart
            title="Staff Attendance"
            value={`${presentStaff}/${activeStaff}`}
            subtitle="present"
            segments={staffSegments}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
            <Link to="/admin/staff" className="btn btn--outline btn--sm">Manage Staff</Link>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <BarChart
          title="Stock Movement"
          subtitle="Latest raw material in/out activity."
          bars={[
            { label: 'Stock In', value: movementIn, display: movementIn, color: '#2E6F40' },
            { label: 'Stock Out', value: movementOut, display: movementOut, color: '#BA1B1B' },
            { label: 'Wastage', value: stats?.operationsSummary?.wastageQuantity || 0, display: stats?.operationsSummary?.wastageQuantity || 0, color: '#C56F35' },
          ]}
        />

        <div style={chartPanelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--cocoa-dark)' }}>Stock Alerts</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Materials that need refilling.</span>
            </div>
            <Link to="/admin/stock" className="btn btn--outline btn--sm">Open Stock</Link>
          </div>
          {lowStock.length === 0 ? (
            <p style={{ margin: 0, color: '#2E6F40', fontWeight: 800 }}>All raw materials are above minimum stock.</p>
          ) : (
              <div className="table-responsive admin-scroll-panel admin-scroll-panel--sm">
              <table className="admin-table" style={{ minWidth: '420px', margin: 0 }}>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Current</th>
                    <th>Minimum</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.supplier || 'No supplier'}</div>
                      </td>
                      <td style={{ color: '#BA1B1B', fontWeight: 900 }}>{item.current_stock} {item.unit}</td>
                      <td>{item.min_stock} {item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={chartPanelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--cocoa-dark)' }}>Staff Timeline</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Today check-in and check-out view.</span>
            </div>
            <Link to="/admin/staff" className="btn btn--outline btn--sm">Staff</Link>
          </div>
          {staffAttendance.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>No staff attendance marked today.</p>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {staffAttendance.map((row) => (
                <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(61,37,30,0.08)' }}>
                  <div>
                    <strong>{row.staff_name}</strong>
                    <div style={{ marginTop: '5px', height: 8, borderRadius: 999, background: '#F1E8DE', overflow: 'hidden' }}>
                      <div style={{ width: row.check_out ? '100%' : row.check_in ? '55%' : '5%', height: '100%', borderRadius: 999, background: row.check_out ? '#2E6F40' : '#F2C94C' }} />
                    </div>
                  </div>
                  <span style={{ color: '#2E6F40', fontWeight: 900, whiteSpace: 'nowrap' }}>
                    {row.check_in ? new Date(row.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    {row.check_out ? ` - ${new Date(row.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        <div style={chartPanelStyle}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>Royalty Members</div>
          <div style={{ marginTop: '12px', fontSize: '2rem', fontFamily: 'var(--font-display)', color: '#B37B24' }}>{stats?.totalMembers || 0}</div>
          <div style={{ marginTop: '12px', height: 10, borderRadius: 999, background: '#F1E8DE', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min((Number(stats?.activePointsPool || 0) / Math.max(Number(stats?.pointsIssued || 1), 1)) * 100, 100)}%`, height: '100%', borderRadius: 999, background: '#B37B24' }} />
          </div>
          <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>{stats?.activePointsPool || 0} active points pool</div>
        </div>

        <div style={chartPanelStyle}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>Points Issued</div>
          <div style={{ marginTop: '12px', fontSize: '2rem', fontFamily: 'var(--font-display)', color: 'var(--cocoa-dark)' }}>{stats?.periodPointsIssued || 0} pts</div>
          <div style={{ marginTop: '12px', height: 10, borderRadius: 999, background: '#F1E8DE', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min((Number(stats?.periodPointsIssued || 0) / Math.max(Number(stats?.pointsIssued || 1), 1)) * 100, 100)}%`, height: '100%', borderRadius: 999, background: '#F2C94C' }} />
          </div>
          <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>Lifetime issued {stats?.pointsIssued || 0} pts</div>
        </div>

        <div style={chartPanelStyle}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>Recent Movements</div>
          <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
            {recentMovements.slice(0, 4).map((row) => (
              <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '12px' }}>{row.material_name}</strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.reason || 'Manual update'}</div>
                </div>
                <strong style={{ color: row.type === 'IN' ? '#2E6F40' : '#BA1B1B' }}>{row.type} {row.quantity}</strong>
              </div>
            ))}
            {recentMovements.length === 0 && <p style={{ margin: 0, color: 'var(--text-muted)' }}>No stock movement recorded yet.</p>}
          </div>
        </div>
      </section>

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
          <div className="admin-scroll-panel admin-scroll-panel--md" style={{ overflowX: 'auto' }}>
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
