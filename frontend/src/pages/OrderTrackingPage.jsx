import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { formatPrice } from '../data/content'

export default function OrderTrackingPage() {
  const { orderNumber } = useParams()
  const [inputNum, setInputNum] = useState(orderNumber || '')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchTracking = async (num) => {
    if (!num) return
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest(`/orders/track/${num.trim()}`)
      setOrder(data.order)
    } catch (err) {
      setError(err.message || 'Order not found. Please verify your order number.')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orderNumber) {
      fetchTracking(orderNumber)
    }
  }, [orderNumber])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchTracking(inputNum)
  }

  return (
    <main className="page page--tracking">
      <div className="container">
        <header className="page-header page-header--center">
          <span className="section-label section-label--eyebrow">ORDER PROGRESS &amp; STATUS</span>
          <h1 className="page-title">TRACK YOUR ORDER</h1>
          <p className="page-desc">
            Enter your order reference number (e.g. CD-2026-000001) to view the live kitchen &amp; delivery status.
          </p>
        </header>

        {/* Search Bar */}
        <div className="order-cta__inner" style={{ maxWidth: '560px', margin: '0 auto 40px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              required
              value={inputNum}
              onChange={(e) => setInputNum(e.target.value)}
              placeholder="e.g. CD-2026-000001"
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid rgba(61,37,30,0.2)',
                background: '#FFFFFF',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            />
            <button type="submit" className="btn btn--gold">
              {loading ? 'Searching...' : 'Track'}
            </button>
          </form>
        </div>

        {error && (
          <div style={{ maxWidth: '560px', margin: '0 auto 32px', textAlign: 'center', background: 'rgba(186,27,27,0.1)', color: '#BA1B1B', padding: '14px', borderRadius: '12px', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Order Details Card */}
        {order && (
          <div style={{ maxWidth: '720px', margin: '0 auto', background: '#FFFFFF', padding: '32px', borderRadius: '24px', border: '1px solid rgba(61,37,30,0.1)', boxShadow: '0 12px 36px rgba(43,23,18,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(61,37,30,0.08)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <span className="section-label">ORDER DETAILS</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--cocoa-dark)', margin: '4px 0' }}>
                  {order.order_number}
                </h2>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Placed on {new Date(order.created_at).toLocaleString()} • {order.order_type}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className={`order-badge order-badge--${order.status.toLowerCase()}`}>
                  {order.status.replace(/_/g, ' ')}
                </span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, color: 'var(--cocoa-dark)', marginTop: '8px' }}>
                  {formatPrice(order.total_amount)}
                </div>
              </div>
            </div>

            {/* Visual Lifecycle Timeline */}
            <div className="order-tracker-timeline" style={{ margin: '28px 0' }}>
              <div className={`step-dot ${['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status) ? 'step-dot--active' : ''}`}>
                <span>✓</span> Order Placed
              </div>
              <div className={`step-dot ${['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status) ? 'step-dot--active' : ''}`}>
                <span>✓</span> Confirmed
              </div>
              <div className={`step-dot ${['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status) ? 'step-dot--active' : ''}`}>
                <span>✓</span> Preparing
              </div>
              <div className={`step-dot ${['READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status) ? 'step-dot--active' : ''}`}>
                <span>✓</span> Packed &amp; Ready
              </div>
              <div className={`step-dot ${['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status) ? 'step-dot--active' : ''}`}>
                <span>✓</span> {order.order_type === 'DELIVERY' ? 'Out for Delivery' : 'Ready for Pickup'}
              </div>
              <div className={`step-dot ${['COMPLETED', 'DELIVERED'].includes(order.status) ? 'step-dot--active' : ''}`}>
                <span>✓</span> Completed
              </div>
            </div>

            {/* Royalty Points Snapshot Banner */}
            <div className="cart-summary__points-banner" style={{ margin: '24px 0' }}>
              <div style={{ fontSize: '1.4rem' }}>👑</div>
              <div>
                {order.points_credited ? (
                  <>
                    <strong style={{ color: '#2E6F40' }}>+{order.total_royalty_points} Royalty Points Credited!</strong>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                      This order has been completed and points are added to your balance.
                    </p>
                  </>
                ) : (
                  <>
                    <strong>+{order.total_royalty_points} Royalty Points</strong>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                      Points will be credited automatically to your Royalty account once delivered.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Items Receipt */}
            <div style={{ borderTop: '1px solid rgba(61,37,30,0.08)', paddingTop: '20px' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--cocoa-dark)', marginBottom: '12px' }}>
                Items in This Order
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {order.items?.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <div>
                      <strong>{item.quantity} × {item.product_name_snapshot}</strong>
                      <span style={{ fontSize: '11px', color: '#B37B24', marginLeft: '8px', fontWeight: 800 }}>
                        (+{item.total_points} pts)
                      </span>
                    </div>
                    <span style={{ fontWeight: 700 }}>{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {order.delivery_address && (
                <div style={{ marginTop: '20px', padding: '14px', background: '#FAF6F0', borderRadius: '12px', fontSize: '13px' }}>
                  <strong>🛵 Delivery Address:</strong>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                    {order.delivery_address.doorNo && `${order.delivery_address.doorNo}, `}
                    {order.delivery_address.street}, {order.delivery_address.area}, {order.delivery_address.city}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '28px', textAlign: 'center' }}>
              <Link to="/menu" className="btn btn--outline btn--sm">
                Order More Treats →
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
