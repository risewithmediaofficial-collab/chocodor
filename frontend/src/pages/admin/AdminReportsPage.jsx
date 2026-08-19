import { useState, useEffect } from 'react'
import { apiRequest } from '../../api/client'
import { formatPrice } from '../../data/content'
import DateRangeFilter from '../../components/admin/DateRangeFilter'

export default function AdminReportsPage() {
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const loadReports = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (fromDate) params.append('fromDate', fromDate)
      if (toDate) params.append('toDate', toDate)
      const data = await apiRequest(`/reports/sales?${params.toString()}`, { isAdmin: true })
      setReportData(data)
    } catch (err) {
      console.error('Reports load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [fromDate, toDate])

  const { totals, sourceBreakdown = [], paymentBreakdown = [], productSales = [], deliveryStats, firstOrderStats } = reportData || {}

  const totalRevenue = totals?.total_revenue || 0
  const totalOrders = totals?.total_orders || 0
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      
      {/* ─── STATIC TOP CONTROLS ─── */}
      <div style={{ flexShrink: 0 }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--cocoa-dark)', margin: 0 }}>
              Sales &amp; Business Intelligence
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Executive analytics, revenue channels, settlement breakdown, and product velocity.
            </p>
          </div>
        </div>

        {/* Date-to-Date Filter */}
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => {
            setFromDate(from)
            setToDate(to)
          }}
        />
      </div>

      {/* ─── SCROLLABLE ANALYTICS BODY ─── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', background: '#FFFFFF', borderRadius: '18px', border: '1px solid rgba(61,37,30,0.1)' }}>
            Aggregating real sales and business reports...
          </div>
        ) : (
          <>
            {/* 1. Contiguous Executive KPI Ribbon */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid rgba(61,37,30,0.12)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '18px 20px', borderRight: '1px solid rgba(61,37,30,0.08)' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Total Net Revenue
                </span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 900, color: '#2E6F40' }}>
                  {formatPrice(totalRevenue)}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {totalOrders} settled orders
                </span>
              </div>

              <div style={{ padding: '18px 20px', borderRight: '1px solid rgba(61,37,30,0.08)' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Product Subtotals
                </span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 900, color: 'var(--cocoa-dark)' }}>
                  {formatPrice(totals?.total_subtotal || 0)}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Gross catalogue value
                </span>
              </div>

              <div style={{ padding: '18px 20px', borderRight: '1px solid rgba(61,37,30,0.08)' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Avg Order Value (AOV)
                </span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 900, color: 'var(--cocoa-dark)' }}>
                  {formatPrice(avgOrderValue)}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Per completed transaction
                </span>
              </div>

              <div style={{ padding: '18px 20px', borderRight: '1px solid rgba(61,37,30,0.08)' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Discounts Absorbed
                </span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 900, color: '#BA1B1B' }}>
                  {formatPrice((totals?.total_first_order_discounts || 0) + (totals?.total_reward_discounts || 0))}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Promo: {formatPrice(totals?.total_first_order_discounts || 0)} • Rewards: {formatPrice(totals?.total_reward_discounts || 0)}
                </span>
              </div>

              <div style={{ padding: '18px 20px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Royalty Points Issued
                </span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 900, color: '#B37B24' }}>
                  +{totals?.total_royalty_points_issued || 0} pts
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Earned across customers
                </span>
              </div>
            </div>

            {/* 2. Channel Distribution & Payment Methods Table */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              
              {/* Sales Channels */}
              <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid rgba(61,37,30,0.12)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(61,37,30,0.08)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🌐</span>
                    <strong style={{ fontSize: '14px', color: 'var(--cocoa-dark)' }}>
                      Sales Channel Performance
                    </strong>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Online vs Physical Counter</span>
                </div>

                <div className="table-responsive admin-scroll-panel admin-scroll-panel--sm">
                <table className="admin-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th style={{ textAlign: 'center' }}>Orders</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                      <th style={{ textAlign: 'right' }}>% Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                          No settled orders in this timeframe.
                        </td>
                      </tr>
                    ) : (
                      sourceBreakdown.map((src) => {
                        const share = totalRevenue > 0 ? Math.round((src.revenue / totalRevenue) * 100) : 0
                        const isOffline = src.order_source === 'OFFLINE'

                        return (
                          <tr key={src.order_source}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{isOffline ? '🏪' : '🌐'}</span>
                                <strong style={{ color: 'var(--cocoa-dark)' }}>
                                  {isOffline ? 'Offline POS Counter' : 'Online Storefront'}
                                </strong>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{src.count}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--cocoa-dark)' }}>
                              {formatPrice(src.revenue)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                <div style={{ width: '60px', height: '6px', background: '#EEE', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${share}%`, height: '100%', background: isOffline ? '#B37B24' : '#2E6F40' }} />
                                </div>
                                <span style={{ fontWeight: 800, fontSize: '11px', minWidth: '32px' }}>{share}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Payment Methods */}
              <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid rgba(61,37,30,0.12)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(61,37,30,0.08)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>💳</span>
                    <strong style={{ fontSize: '14px', color: 'var(--cocoa-dark)' }}>
                      Payment Methods &amp; Settlements
                    </strong>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>UPI / Cash / Card</span>
                </div>

                <div className="table-responsive admin-scroll-panel admin-scroll-panel--sm">
                <table className="admin-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th style={{ textAlign: 'center' }}>Transactions</th>
                      <th style={{ textAlign: 'right' }}>Volume</th>
                      <th style={{ textAlign: 'right' }}>% Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                          No settled payments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      paymentBreakdown.map((pm) => {
                        const share = totalRevenue > 0 ? Math.round((pm.total_amount / totalRevenue) * 100) : 0

                        return (
                          <tr key={pm.payment_method}>
                            <td>
                              <strong style={{ color: 'var(--cocoa-dark)' }}>
                                {pm.payment_method === 'UPI' ? '📱 UPI' : pm.payment_method === 'CASH' ? '💵 Cash' : pm.payment_method === 'CARD' ? '💳 Card' : pm.payment_method}
                              </strong>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{pm.count}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--cocoa-dark)' }}>
                              {formatPrice(pm.total_amount)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                <div style={{ width: '60px', height: '6px', background: '#EEE', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${share}%`, height: '100%', background: '#2E6F40' }} />
                                </div>
                                <span style={{ fontWeight: 800, fontSize: '11px', minWidth: '32px' }}>{share}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>

            {/* 3. Product Sales Velocity & Revenue Contribution Table */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid rgba(61,37,30,0.12)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(61,37,30,0.08)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🍫</span>
                  <strong style={{ fontSize: '14px', color: 'var(--cocoa-dark)' }}>
                    Product Sales Velocity &amp; Revenue Ranking
                  </strong>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ranked by units sold</span>
              </div>

              <div className="table-responsive admin-scroll-panel admin-scroll-panel--md">
                <table className="admin-table" style={{ margin: 0, width: '100%', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Dessert Product</th>
                      <th style={{ textAlign: 'center' }}>Units Sold</th>
                      <th style={{ textAlign: 'right' }}>Total Revenue</th>
                      <th style={{ textAlign: 'right' }}>Royalty Points Issued</th>
                      <th style={{ textAlign: 'right' }}>% Revenue Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productSales.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                          No product sales recorded in this timeframe.
                        </td>
                      </tr>
                    ) : (
                      productSales.map((p, idx) => {
                        const share = totals?.total_subtotal > 0 ? ((p.total_revenue / totals.total_subtotal) * 100).toFixed(1) : 0

                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 800, color: 'var(--text-muted)' }}>
                              #{idx + 1}
                            </td>
                            <td>
                              <strong style={{ color: 'var(--cocoa-dark)', fontSize: '13px' }}>{p.name}</strong>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '14px' }}>
                              {p.quantity_sold}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--cocoa-dark)' }}>
                              {formatPrice(p.total_revenue)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span style={{ background: '#FAF0E4', color: '#B37B24', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 800, fontSize: '11px' }}>
                                +{p.total_points_issued} pts
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                              {share}%
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Logistics & Promotional Summary Strip */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid rgba(61,37,30,0.12)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                overflow: 'hidden',
                marginBottom: '10px',
              }}
            >
              <div style={{ padding: '16px 20px', borderRight: '1px solid rgba(61,37,30,0.08)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  🛵 Free Deliveries (&ge; ₹500)
                </span>
                <strong style={{ fontSize: '1.2rem', color: '#2E6F40' }}>
                  {deliveryStats?.free_deliveries || 0} Orders
                </strong>
              </div>

              <div style={{ padding: '16px 20px', borderRight: '1px solid rgba(61,37,30,0.08)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  🛵 Paid Deliveries (&lt; ₹500)
                </span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--cocoa-dark)' }}>
                  {deliveryStats?.paid_deliveries || 0} Orders
                </strong>
              </div>

              <div style={{ padding: '16px 20px', borderRight: '1px solid rgba(61,37,30,0.08)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  Delivery Charges Collected
                </span>
                <strong style={{ fontSize: '1.2rem', color: '#B37B24' }}>
                  {formatPrice(deliveryStats?.delivery_revenue || 0)}
                </strong>
              </div>

              <div style={{ padding: '16px 20px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  First-Order Promo Redeemed
                </span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--cocoa-dark)' }}>
                  {firstOrderStats?.offers_used || 0} uses ({formatPrice(firstOrderStats?.total_discount_given || 0)})
                </strong>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
