import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import { formatPrice } from '../../data/content'

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOrder = async () => {
    try {
      setLoading(true)
      const data = await apiRequest(`/admin/orders/${id}`, { isAdmin: true })
      setOrder(data.order)
    } catch (err) {
      setError(err.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
  }, [id])

  const handleStatusChange = async (newStatus) => {
    try {
      await apiRequest(`/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        isAdmin: true,
        body: { status: newStatus },
      })
      loadOrder()
    } catch (err) {
      alert(`Error updating order status: ${err.message}`)
    }
  }

  if (loading) return <div style={{ padding: '40px' }}>Loading order details...</div>
  if (error || !order) return <div style={{ padding: '40px', color: '#BA1B1B' }}>Error: {error || 'Order not found'}</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Link to="/admin/orders" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--caramel)', textDecoration: 'underline' }}>
            ← Back to Orders
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cocoa-dark)', margin: '8px 0 0' }}>
            Order {order.order_number}
          </h1>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Placed on {new Date(order.created_at).toLocaleString()} • {order.order_type}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={`order-badge order-badge--${order.status.toLowerCase()}`}>
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Left: Customer & Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Customer Info */}
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', margin: '0 0 16px' }}>
              Customer Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div><strong>Name:</strong> {order.customer_name}</div>
              <div><strong>Mobile:</strong> {order.customer_mobile}</div>
              <div><strong>Email:</strong> {order.customer_email || 'Not provided'}</div>
              <div><strong>Order Type:</strong> {order.order_type}</div>
              {order.delivery_address && (
                <div style={{ marginTop: '8px', background: '#FAF6F0', padding: '12px', borderRadius: '10px' }}>
                  <strong>Delivery Address:</strong>
                  <div>
                    {order.delivery_address.doorNo && `${order.delivery_address.doorNo}, `}
                    {order.delivery_address.street}, {order.delivery_address.area}
                  </div>
                  <div>
                    {order.delivery_address.city} - {order.delivery_address.pincode}
                  </div>
                  {order.delivery_address.landmark && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                      Landmark: {order.delivery_address.landmark}
                    </div>
                  )}
                </div>
              )}
              {order.notes && (
                <div style={{ marginTop: '8px', background: '#FAF0E4', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                  <strong>Customer Instructions:</strong> {order.notes}
                </div>
              )}
            </div>
          </div>

          {/* Items with Point Snapshots */}
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', margin: '0 0 16px' }}>
              Ordered Items (Snapshots)
            </h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Unit Price</th>
                  <th>Points Snapshot</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                  <th>Total Points</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700 }}>{item.product_name_snapshot}</td>
                    <td>{formatPrice(item.unit_price_snapshot)}</td>
                    <td style={{ color: '#B37B24', fontWeight: 800 }}>+{item.royalty_points_snapshot} pts</td>
                    <td>{item.quantity}</td>
                    <td style={{ fontWeight: 700 }}>{formatPrice(item.subtotal)}</td>
                    <td style={{ color: '#B37B24', fontWeight: 800 }}>+{item.total_points} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Pricing & Workflow Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Order Actions */}
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', margin: '0 0 16px' }}>
              Order Lifecycle Action
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {order.status === 'NEW' && (
                <button
                  type="button"
                  className="btn btn--gold btn--full"
                  onClick={() => handleStatusChange('CONFIRMED')}
                >
                  ✓ Confirm Order
                </button>
              )}
              {order.status === 'CONFIRMED' && (
                <button
                  type="button"
                  className="btn btn--gold btn--full"
                  onClick={() => handleStatusChange('PREPARING')}
                >
                  👩‍🍳 Move to Preparing (Kitchen)
                </button>
              )}
              {order.status === 'PREPARING' && (
                <button
                  type="button"
                  className="btn btn--gold btn--full"
                  onClick={() => handleStatusChange('READY')}
                >
                  📦 Mark as Ready &amp; Packed
                </button>
              )}
              {order.status === 'READY' && (
                <button
                  type="button"
                  className="btn btn--gold btn--full"
                  onClick={() => handleStatusChange(order.order_type === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY_FOR_PICKUP')}
                >
                  🛵 Dispatch (Out for Delivery / Pickup)
                </button>
              )}
              {['OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'].includes(order.status) && (
                <button
                  type="button"
                  className="btn btn--gold btn--full"
                  onClick={() => handleStatusChange('DELIVERED')}
                >
                  🏠 Mark as Delivered / Handed Over
                </button>
              )}
              {order.status === 'DELIVERED' && (
                <button
                  type="button"
                  className="btn btn--gold btn--full"
                  style={{ background: '#2E6F40', color: '#FFFFFF' }}
                  onClick={() => handleStatusChange('COMPLETED')}
                >
                  👑 Complete Order &amp; Credit {order.total_royalty_points} Points
                </button>
              )}
              {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                <button
                  type="button"
                  className="btn btn--full"
                  style={{ background: 'rgba(186,27,27,0.1)', color: '#BA1B1B', marginTop: '12px' }}
                  onClick={() => handleStatusChange('CANCELLED')}
                >
                  Cancel Order (No Points Credited)
                </button>
              )}
            </div>

            {order.status === 'COMPLETED' && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(46,111,64,0.1)', borderRadius: '10px', color: '#2E6F40', fontSize: '13px', fontWeight: 700 }}>
                ✓ Order Completed: +{order.total_royalty_points} Royalty Points credited to customer ledger.
              </div>
            )}
          </div>

          {/* Payment & Totals */}
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', margin: '0 0 16px' }}>
              Financial Summary
            </h3>

            <div className="cart-summary__lines">
              <div className="cart-summary__line">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="cart-summary__line">
                <span>Delivery Fee</span>
                <span>{order.delivery_fee === 0 ? 'FREE' : formatPrice(order.delivery_fee)}</span>
              </div>
              {order.reward_discount > 0 && (
                <div className="cart-summary__line" style={{ color: '#2E6F40' }}>
                  <span>Reward Discount ({order.applied_reward_code})</span>
                  <span>−{formatPrice(order.reward_discount)}</span>
                </div>
              )}
              <div className="cart-summary__line cart-summary__line--total">
                <span>Grand Total</span>
                <span>{formatPrice(order.total_amount)}</span>
              </div>
            </div>

            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Payment Status: <strong>{order.payment_status}</strong> ({order.payment_method})
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
