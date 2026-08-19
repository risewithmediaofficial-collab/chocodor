import { useState, useEffect } from 'react'
import { apiRequest } from '../../api/client'
import { formatPrice } from '../../data/content'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState([])
  const [redemptions, setRedemptions] = useState([])
  const [loading, setLoading] = useState(true)

  // Create/Edit form state
  const [modalOpen, setModalOpen] = useState(false)
  useBodyScrollLock(modalOpen)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pointsRequired, setPointsRequired] = useState('')
  const [discountValue, setDiscountValue] = useState('')
  const [minOrderValue, setMinOrderValue] = useState('')
  const [validityDays, setValidityDays] = useState('30')

  const loadRewards = async () => {
    try {
      setLoading(true)
      const data = await apiRequest('/admin/rewards', { isAdmin: true })
      setRewards(data.rewards || [])
      setRedemptions(data.redemptions || [])
    } catch (err) {
      console.error('Failed to load rewards:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRewards()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await apiRequest('/admin/rewards', {
        method: 'POST',
        isAdmin: true,
        body: {
          name: name.trim(),
          description: description.trim(),
          pointsRequired: parseInt(pointsRequired, 10),
          discountValue: parseFloat(discountValue),
          minOrderValue: parseFloat(minOrderValue || 0),
          validityDays: parseInt(validityDays, 10),
        },
      })
      setModalOpen(false)
      setName('')
      setDescription('')
      setPointsRequired('')
      setDiscountValue('')
      setMinOrderValue('')
      loadRewards()
    } catch (err) {
      alert(`Creation failed: ${err.message}`)
    }
  }

  const toggleRewardActive = async (reward) => {
    try {
      await apiRequest(`/admin/rewards/${reward.id}`, {
        method: 'PATCH',
        isAdmin: true,
        body: { isActive: reward.is_active === 1 ? false : true },
      })
      loadRewards()
    } catch (err) {
      alert(`Failed to update reward: ${err.message}`)
    }
  }

  const handleDeleteReward = async (reward) => {
    if (!window.confirm(`Are you sure you want to delete reward template "${reward.name}"?`)) return
    try {
      await apiRequest(`/admin/rewards/${reward.id}`, {
        method: 'DELETE',
        isAdmin: true,
      })
      alert(`✓ Reward "${reward.name}" deleted.`)
      loadRewards()
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  const handleDeleteRedemption = async (red) => {
    if (!window.confirm(`Are you sure you want to delete redemption coupon "${red.redemption_code}"?`)) return
    try {
      await apiRequest(`/admin/rewards/redemptions/${red.id || red.redemption_code}`, {
        method: 'DELETE',
        isAdmin: true,
      })
      alert(`✓ Redemption coupon "${red.redemption_code}" deleted.`)
      loadRewards()
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cocoa-dark)', margin: 0 }}>
            Royalty Rewards &amp; Redemptions Manager
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Configure points required for discount vouchers and track customer coupon redemptions.
          </p>
        </div>

        <button type="button" className="btn btn--gold btn--sm" onClick={() => setModalOpen(true)}>
          + Create New Reward
        </button>
      </div>

      {/* Rewards Catalog */}
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', marginBottom: '16px' }}>
        Configured Reward Definitions
      </h3>

      <div className="table-responsive admin-scroll-panel admin-scroll-panel--md" style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)', marginBottom: '24px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading rewards...</div>
        ) : (
          <table className="admin-table" style={{ minWidth: '760px' }}>
            <thead>
              <tr>
                <th>Reward Name</th>
                <th>Points Required</th>
                <th>Discount Value</th>
                <th>Min. Order</th>
                <th>Validity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.description}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: '#B37B24' }}>{r.points_required} PTS</span>
                  </td>
                  <td style={{ fontWeight: 800, color: '#2E6F40' }}>₹{r.discount_value} OFF</td>
                  <td>{formatPrice(r.min_order_value)}</td>
                  <td>{r.validity_days} days</td>
                  <td>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: r.is_active ? '#2E6F40' : '#BA1B1B' }}>
                      {r.is_active ? '✓ Active' : '✕ Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => toggleRewardActive(r)}
                      >
                        {r.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm"
                        style={{ padding: '4px 8px', fontSize: '11px', background: '#FDE8E8', color: '#BA1B1B', border: '1px solid rgba(186,27,27,0.2)' }}
                        onClick={() => handleDeleteReward(r)}
                        title="Delete reward definition"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Redemptions Log */}
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', marginBottom: '16px' }}>
        Customer Coupon Redemptions ({redemptions.length})
      </h3>

      <div className="table-responsive admin-scroll-panel admin-scroll-panel--md" style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
        {redemptions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No customer redemptions yet.</div>
        ) : (
          <table className="admin-table" style={{ minWidth: '760px' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Reward</th>
                <th>Coupon Code</th>
                <th>Points Spent</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map((red) => (
                <tr key={red.id}>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(red.created_at).toLocaleString()}
                  </td>
                  <td>
                    <strong>{red.customer_name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{red.customer_mobile}</div>
                  </td>
                  <td>{red.reward_name}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, background: '#FAF0E4', padding: '4px 8px', borderRadius: '6px' }}>
                      {red.redemption_code}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800, color: '#BA1B1B' }}>-{red.points_spent} PTS</td>
                  <td>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: red.is_used ? '#BA1B1B' : '#2E6F40' }}>
                      {red.is_used ? 'USED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--sm"
                      style={{ padding: '4px 8px', fontSize: '11px', background: '#FDE8E8', color: '#BA1B1B', border: '1px solid rgba(186,27,27,0.2)' }}
                      onClick={() => handleDeleteRedemption(red)}
                      title="Delete coupon redemption"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div className="cart-drawer-overlay" onClick={() => setModalOpen(false)}>
          <div className="product-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="product-modal__close" onClick={() => setModalOpen(false)}>
              ✕
            </button>

            <div className="product-modal__content" style={{ padding: '32px' }}>
              <span className="section-label">CREATE ROYALTY REWARD</span>
              <h2 className="product-modal__title" style={{ fontSize: '1.4rem' }}>
                New Reward Voucher
              </h2>

              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                <div>
                  <label className="form-label">Reward Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. ₹50 OFF Your Order"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Valid on all waffles and cakes"
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Points Required *</label>
                    <input
                      type="number"
                      required
                      value={pointsRequired}
                      onChange={(e) => setPointsRequired(e.target.value)}
                      placeholder="e.g. 500"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Discount in ₹ *</label>
                    <input
                      type="number"
                      required
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="e.g. 50"
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Min. Order Value (₹)</label>
                    <input
                      type="number"
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(e.target.value)}
                      placeholder="e.g. 299"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Validity (Days)</label>
                    <input
                      type="number"
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn--gold btn--full" style={{ marginTop: '8px' }}>
                  Save &amp; Activate Reward →
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
