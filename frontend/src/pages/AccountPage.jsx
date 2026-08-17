import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { apiRequest } from '../api/client'
import { formatPrice } from '../data/content'
import { useMouseTilt } from '../hooks/useMouseTilt'
import ReviewModal from '../components/ReviewModal'
import InvoiceModal from '../components/InvoiceModal'

export default function AccountPage() {
  const { customer, royalty, logout, openLogin, refreshProfile } = useAuth()
  const { addToCart, setCartDrawerOpen } = useCart()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'orders'
  const [orderFilter, setOrderFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'COMPLETED'

  const [orders, setOrders] = useState([])
  const [cardData, setCardData] = useState(null)
  const [rewardsData, setRewardsData] = useState({ rewards: [], myRedemptions: [] })
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const [reviewModalItem, setReviewModalItem] = useState(null)
  const [selectedInvoiceOrderId, setSelectedInvoiceOrderId] = useState(null)
  const [reviewedProductMap, setReviewedProductMap] = useState({})

  // Profile Edit State
  const [profileName, setProfileName] = useState(customer?.name || '')
  const [profileMobile, setProfileMobile] = useState(customer?.mobile || '')
  const [profileEmail, setProfileEmail] = useState(customer?.email || '')
  const [profileMsg, setProfileMsg] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdMsg, setPwdMsg] = useState(null)
  const [pwdSubmitting, setPwdSubmitting] = useState(false)

  useEffect(() => {
    if (customer) {
      setProfileName(customer.name || '')
      setProfileMobile(customer.mobile || '')
      setProfileEmail(customer.email || '')
    }
  }, [customer])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setProfileMsg(null)
    setProfileSaving(true)

    try {
      const res = await apiRequest('/auth/update-profile', {
        method: 'POST',
        body: { name: profileName, mobile: profileMobile, email: profileEmail },
      })
      setProfileMsg({ type: 'success', text: res.message || 'Profile updated successfully!' })
      await refreshProfile()
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwdMsg(null)

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters long' })
      return
    }

    setPwdSubmitting(true)
    try {
      const res = await apiRequest('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      })
      setPwdMsg({ type: 'success', text: res.message || 'Password changed successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message })
    } finally {
      setPwdSubmitting(false)
    }
  }

  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) return
    order.items.forEach((item) => {
      addToCart({
        id: item.product_id,
        productId: item.product_id,
        name: item.product_name_snapshot,
        price: item.unit_price_snapshot || item.price,
        image: item.image || '/images/products/lalban-hazelnut.jpg',
        royaltyPoints: item.royalty_points_snapshot || 0,
      }, item.quantity)
    })
    setCartDrawerOpen(true)
    setActionMsg(`🛒 Added items from order ${order.order_number} to your bag!`)
    setTimeout(() => setActionMsg(''), 4000)
  }

  const { ref: cardRef, handleMove, handleLeave } = useMouseTilt(8)

  useEffect(() => {
    if (!customer) return

    async function loadAccountData() {
      setLoading(true)
      try {
        const [ordersRes, cardRes, rewardsRes, txRes, reviewsRes] = await Promise.all([
          apiRequest('/orders/my-orders').catch(() => ({ orders: [] })),
          apiRequest('/royalty/card').catch(() => ({ member: null })),
          apiRequest('/royalty/rewards').catch(() => ({ rewards: [], myRedemptions: [] })),
          apiRequest('/royalty/transactions').catch(() => ({ transactions: [] })),
          apiRequest(`/products/customer/${customer.id}/reviews`).catch(() => ({ reviews: [] })),
        ])

        setOrders(ordersRes.orders || [])
        setCardData(cardRes.member)
        setRewardsData(rewardsRes)
        setTransactions(txRes.transactions || [])

        const revMap = {}
        reviewsRes.reviews?.forEach((r) => {
          revMap[`${r.product_id}_${r.order_id || 'any'}`] = r.rating
          revMap[r.product_id] = r.rating
        })
        setReviewedProductMap(revMap)
      } catch (err) {
        console.error('Error loading account:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAccountData()
  }, [customer])

  const handleRedeem = async (rewardId) => {
    setActionMsg('')
    try {
      const res = await apiRequest('/royalty/redeem', {
        method: 'POST',
        body: { rewardId },
      })
      setActionMsg(`🎉 Reward redeemed! Your single-use code is ${res.redemptionCode}`)
      refreshProfile()
      // Reload rewards and transactions
      const [rewardsRes, txRes, cardRes] = await Promise.all([
        apiRequest('/royalty/rewards'),
        apiRequest('/royalty/transactions'),
        apiRequest('/royalty/card'),
      ])
      setRewardsData(rewardsRes)
      setTransactions(txRes.transactions || [])
      setCardData(cardRes.member)
    } catch (err) {
      setActionMsg(`⚠️ ${err.message}`)
    }
  }

  if (!customer) {
    return (
      <main className="page page--account">
        <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>👑</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cocoa-dark)' }}>
            Customer Sign In Required
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 24px' }}>
            Please sign in to view your orders, digital Royalty Card, point ledger, and rewards.
          </p>
          <button type="button" className="btn btn--gold" onClick={openLogin}>
            Sign In / Register →
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page page--account">
      <div className="container">
        {/* Account Header */}
        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span className="section-label section-label--eyebrow">CUSTOMER DASHBOARD</span>
            <h1 className="page-title" style={{ margin: '8px 0 4px' }}>
              Hello, {customer.name}
            </h1>
            <p className="page-desc" style={{ fontSize: '14px' }}>
              Royalty ID: <strong style={{ color: 'var(--cocoa-dark)' }}>{royalty?.royaltyId || 'CDR-000000'}</strong> • Mobile: {customer.mobile}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#FAF0E4', padding: '10px 18px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(179,123,36,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>👑</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)', textTransform: 'uppercase' }}>Current Balance</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, color: 'var(--cocoa-dark)' }}>
                  {royalty?.currentPoints || 0} PTS
                </div>
              </div>
            </div>
            <button type="button" className="btn btn--outline btn--sm" onClick={logout}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="account-tabs">
          <button
            type="button"
            className={`account-tab ${activeTab === 'orders' ? 'account-tab--active' : ''}`}
            onClick={() => setSearchParams({ tab: 'orders' })}
          >
            📦 My Orders ({orders.length})
          </button>
          <button
            type="button"
            className={`account-tab ${activeTab === 'card' ? 'account-tab--active' : ''}`}
            onClick={() => setSearchParams({ tab: 'card' })}
          >
            👑 Digital Royalty Card
          </button>
          <button
            type="button"
            className={`account-tab ${activeTab === 'rewards' ? 'account-tab--active' : ''}`}
            onClick={() => setSearchParams({ tab: 'rewards' })}
          >
            🎁 Rewards &amp; Coupons
          </button>
          <button
            type="button"
            className={`account-tab ${activeTab === 'history' ? 'account-tab--active' : ''}`}
            onClick={() => setSearchParams({ tab: 'history' })}
          >
            📜 Points History Ledger
          </button>
          <button
            type="button"
            className={`account-tab ${activeTab === 'profile' ? 'account-tab--active' : ''}`}
            onClick={() => setSearchParams({ tab: 'profile' })}
          >
            👤 Profile &amp; Addresses
          </button>
        </div>

        {actionMsg && (
          <div style={{ margin: '20px 0', padding: '12px 18px', borderRadius: '12px', background: '#FAF0E4', border: '1px solid rgba(179,123,36,0.3)', fontWeight: 700, fontSize: '14px', color: 'var(--cocoa-dark)' }}>
            {actionMsg}
          </div>
        )}

        {/* TAB 1: MY ORDERS & REAL-TIME TRACKING */}
        {activeTab === 'orders' && (
          <div style={{ marginTop: '28px' }}>
            {/* Real-Time Active Order Spotlight Banner */}
            {orders.some((o) => !['COMPLETED', 'DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status)) && (
              (() => {
                const activeOrd = orders.find((o) => !['COMPLETED', 'DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status))
                return (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, var(--cocoa-dark), #1A0D09)',
                      color: '#FFFFFF',
                      padding: '24px',
                      borderRadius: '20px',
                      marginBottom: '28px',
                      boxShadow: '0 8px 32px rgba(43, 23, 18, 0.35)',
                      border: '1px solid rgba(240, 193, 75, 0.35)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="pulse-indicator" style={{ width: '10px', height: '10px', background: '#48BB78' }} />
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          LIVE ACTIVE ORDER • {activeOrd.order_number}
                        </span>
                      </div>
                      <span style={{ fontSize: '12.5px', color: 'rgba(250,246,240,0.8)' }}>
                        Status: <strong style={{ color: 'var(--gold)' }}>{activeOrd.status.replace(/_/g, ' ')}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, color: '#FFFFFF' }}>
                          {activeOrd.order_type === 'DELIVERY' ? '🛵 Preparing for Fresh Delivery' : '🏪 Freshly Baking for Boutique Pickup'}
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(250,246,240,0.7)' }}>
                          {activeOrd.items?.length || 0} confectioneries • Total: {formatPrice(activeOrd.total_amount)} • +{activeOrd.total_royalty_points} Points
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)', padding: '8px 16px' }}
                          onClick={() => setSelectedInvoiceOrderId(activeOrd.id)}
                        >
                          📄 View Bill
                        </button>
                        <Link
                          to={`/orders/${activeOrd.order_number}`}
                          className="btn btn--gold btn--sm"
                          style={{ padding: '8px 20px', fontWeight: 800 }}
                        >
                          Track Real-Time Status →
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })()
            )}

            {/* Order Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`account-tab ${orderFilter === 'ALL' ? 'account-tab--active' : ''}`}
                style={{ padding: '6px 16px', fontSize: '12px' }}
                onClick={() => setOrderFilter('ALL')}
              >
                All Orders ({orders.length})
              </button>
              <button
                type="button"
                className={`account-tab ${orderFilter === 'ACTIVE' ? 'account-tab--active' : ''}`}
                style={{ padding: '6px 16px', fontSize: '12px' }}
                onClick={() => setOrderFilter('ACTIVE')}
              >
                Active ({orders.filter((o) => !['COMPLETED', 'DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status)).length})
              </button>
              <button
                type="button"
                className={`account-tab ${orderFilter === 'COMPLETED' ? 'account-tab--active' : ''}`}
                style={{ padding: '6px 16px', fontSize: '12px' }}
                onClick={() => setOrderFilter('COMPLETED')}
              >
                Delivered / Completed ({orders.filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status)).length})
              </button>
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px' }}>Loading your orders...</p>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>🛍️</span>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cocoa-dark)' }}>No Orders Placed Yet</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                  No Choco D&apos;or orders yet. Your next sweet moment is waiting.
                </p>
                <Link to="/menu" className="btn btn--gold btn--sm">
                  Order Now →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {orders
                  .filter((ord) => {
                    if (orderFilter === 'ACTIVE') return !['COMPLETED', 'DELIVERED', 'CANCELLED', 'REJECTED'].includes(ord.status)
                    if (orderFilter === 'COMPLETED') return ['COMPLETED', 'DELIVERED'].includes(ord.status)
                    return true
                  })
                  .map((ord) => (
                  <div key={ord.id} className="order-card-customer">
                    <div className="order-card-customer__header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)' }}>
                            {ord.order_number}
                          </h3>
                          <span className={`order-badge order-badge--${ord.status.toLowerCase()}`}>
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Placed on {new Date(ord.created_at).toLocaleString()} • {ord.order_type}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, color: 'var(--cocoa-dark)' }}>
                          {formatPrice(ord.total_amount)}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: ord.points_credited ? '#2E6F40' : '#B37B24' }}>
                          {ord.points_credited ? `✓ +${ord.total_royalty_points} Points Credited` : `👑 +${ord.total_royalty_points} Points on Delivery`}
                        </span>
                      </div>
                    </div>

                    {/* Progress tracker */}
                    <div className="order-tracker-timeline">
                      <div className={`step-dot ${['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(ord.status) ? 'step-dot--active' : ''}`}>
                        <span>✓</span> Placed
                      </div>
                      <div className={`step-dot ${['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(ord.status) ? 'step-dot--active' : ''}`}>
                        <span>✓</span> Confirmed
                      </div>
                      <div className={`step-dot ${['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(ord.status) ? 'step-dot--active' : ''}`}>
                        <span>✓</span> Preparing
                      </div>
                      <div className={`step-dot ${['READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(ord.status) ? 'step-dot--active' : ''}`}>
                        <span>✓</span> Ready
                      </div>
                      <div className={`step-dot ${['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(ord.status) ? 'step-dot--active' : ''}`}>
                        <span>✓</span> Out
                      </div>
                      <div className={`step-dot ${['COMPLETED', 'DELIVERED'].includes(ord.status) ? 'step-dot--active' : ''}`}>
                        <span>✓</span> Done
                      </div>
                    </div>

                    {/* Items preview & Review Actions */}
                    <div style={{ borderTop: '1px solid rgba(61,37,30,0.08)', paddingTop: '14px', marginTop: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Ordered Confectioneries ({ord.items?.length || 0} items):
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        {ord.items?.map((item) => {
                          const existingRating = reviewedProductMap[`${item.product_id}_${ord.id}`] || reviewedProductMap[item.product_id]

                          return (
                            <div
                              key={item.id || item.product_id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#FAF6F0',
                                padding: '8px 14px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                gap: '10px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <div>
                                <strong style={{ color: 'var(--cocoa-dark)' }}>{item.product_name_snapshot}</strong>
                                <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '12px' }}>
                                  Qty: {item.quantity} • {formatPrice(item.unit_price_snapshot || item.price || 0)}
                                </span>
                              </div>

                              <div>
                                {existingRating ? (
                                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#2E6F40', background: '#E2F0E6', padding: '4px 10px', borderRadius: 'var(--radius-pill)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    ✓ Rated <span style={{ color: '#B37B24' }}>★ {existingRating}</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn--gold btn--sm"
                                    style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 800 }}
                                    onClick={() =>
                                      setReviewModalItem({
                                        product: { id: item.product_id, name: item.product_name_snapshot },
                                        orderId: ord.id,
                                      })
                                    }
                                  >
                                    ⭐ Rate &amp; Review
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Order Action Buttons */}
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          style={{ fontSize: '12px', padding: '6px 14px' }}
                          onClick={() => setSelectedInvoiceOrderId(ord.id)}
                        >
                          📄 Tax Invoice
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          style={{ fontSize: '12px', padding: '6px 14px' }}
                          onClick={() => handleReorder(ord)}
                        >
                          ↻ Reorder Items
                        </button>
                        <Link
                          to={`/orders/${ord.order_number}`}
                          className="btn btn--gold btn--sm"
                          style={{ fontSize: '12px', padding: '6px 16px', fontWeight: 800 }}
                        >
                          🚚 Track Order →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DIGITAL ROYALTY CARD */}
        {activeTab === 'card' && (
          <div style={{ marginTop: '28px', textAlign: 'center' }}>
            <div
              className="royalty-preview__card-wrap"
              onMouseMove={handleMove}
              onMouseLeave={handleLeave}
              style={{ margin: '0 auto 40px' }}
            >
              <div ref={cardRef} className="royalty-card">
                <div className="royalty-card__shine" aria-hidden="true" />
                <div className="royalty-card__front">
                  <div className="royalty-card__top">
                    <div>
                      <span className="royalty-card__brand">CHOCO D&apos;OR</span>
                      <span className="royalty-card__tag">ROYALTY CARD</span>
                    </div>
                    <div className="royalty-card__chip">
                      <div className="royalty-card__chip-lines" />
                    </div>
                  </div>

                  <div className="royalty-card__middle">
                    <span className="royalty-card__number">{cardData?.royaltyId || royalty?.royaltyId || 'CDR-000101'}</span>
                    <div className="royalty-card__tier-badge">
                      <span>👑 {royalty?.tier || 'GOLD MEMBER'}</span>
                    </div>
                  </div>

                  <div className="royalty-card__bottom">
                    <div>
                      <span className="royalty-card__label">MEMBER NAME</span>
                      <span className="royalty-card__holder">{customer.name.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="royalty-card__label">BALANCE</span>
                      <span className="royalty-card__pts">{cardData?.currentPoints || royalty?.currentPoints || 0} PTS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Identification */}
            {cardData?.qrCode && (
              <div style={{ background: '#FFFFFF', maxWidth: '360px', margin: '0 auto 40px', padding: '24px', borderRadius: '24px', border: '1px solid rgba(61,37,30,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--cocoa-dark)', margin: '0 0 12px' }}>
                  Member Digital Pass
                </h4>
                <img src={cardData.qrCode} alt="Royalty Member QR Code" style={{ width: '180px', height: '180px', margin: '0 auto', display: 'block' }} />
                <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Scan at our Krishnagiri boutique to earn &amp; redeem points in person.
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="brand-craft__left-grid" style={{ maxWidth: '780px', margin: '0 auto' }}>
              <div className="brand-craft__mini-card brand-craft__mini-card--cream">
                <span className="brand-craft__sticker">LIFETIME POINTS</span>
                <h3 style={{ margin: '10px 0 4px', fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--cocoa-dark)' }}>
                  {cardData?.lifetimePoints || 0} Points
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Earned across all completed orders and promotions.
                </p>
              </div>

              <div className="brand-craft__mini-card brand-craft__mini-card--dark">
                <span className="brand-craft__dark-tag">POINTS REDEEMED</span>
                <h3 className="brand-craft__dark-title">{cardData?.pointsRedeemed || 0} Points</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(250,246,240,0.8)' }}>
                  Redeemed for sweet discounts &amp; coupon codes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REWARDS */}
        {activeTab === 'rewards' && (
          <div style={{ marginTop: '28px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cocoa-dark)', marginBottom: '16px' }}>
              Available Royalty Rewards
            </h3>

            <div className="signatures__grid" style={{ marginBottom: '40px' }}>
              {rewardsData.rewards?.map((r) => (
                <div key={r.id} className="signature-card" style={{ background: '#FFFFFF' }}>
                  <div className="signature-card__tag-wrap">
                    <span className="signature-card__tag">👑 {r.pointsRequired} Points</span>
                  </div>
                  <div style={{ padding: '24px' }}>
                    <h3 className="signature-card__name" style={{ fontSize: '1.3rem' }}>{r.name}</h3>
                    <p className="signature-card__desc">{r.description}</p>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '12px 0' }}>
                      Min Order: {formatPrice(r.minOrderValue)}
                    </div>
                    <button
                      type="button"
                      disabled={!r.canRedeem}
                      className="btn btn--gold btn--full"
                      onClick={() => handleRedeem(r.id)}
                    >
                      {r.canRedeem ? `Redeem for ${r.pointsRequired} Pts` : `Need ${r.pointsRequired - (royalty?.currentPoints || 0)} More Pts`}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* My Active Coupons */}
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cocoa-dark)', marginBottom: '16px' }}>
              My Redeemed Coupons
            </h3>

            {rewardsData.myRedemptions?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>You have not redeemed any reward coupons yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {rewardsData.myRedemptions?.map((coupon) => (
                  <div key={coupon.id} style={{ background: coupon.isUsed ? '#F5F2EC' : '#FFFFFF', padding: '18px', borderRadius: '16px', border: '1px solid rgba(61,37,30,0.1)', opacity: coupon.isUsed ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong>{coupon.rewardName}</strong>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: coupon.isUsed ? '#BA1B1B' : '#2E6F40' }}>
                        {coupon.isUsed ? 'USED' : 'ACTIVE'}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 900, color: 'var(--cocoa-dark)', background: '#FAF0E4', padding: '8px 12px', borderRadius: '8px', textAlign: 'center', letterSpacing: '0.08em' }}>
                      {coupon.redemptionCode}
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Discount: ₹{coupon.discountValue} • Min order: ₹{coupon.minOrderValue}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: POINTS HISTORY LEDGER */}
        {activeTab === 'history' && (
          <div style={{ marginTop: '28px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cocoa-dark)', marginBottom: '16px' }}>
              Points Transaction Ledger
            </h3>

            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: '#FFFFFF', borderRadius: '16px' }}>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                  Your Royalty journey starts with your first order.
                </p>
              </div>
            ) : (
              <div className="table-responsive" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid rgba(61,37,30,0.1)' }}>
                <table style={{ width: '100%', minWidth: '560px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#FAF6F0', borderBottom: '1px solid rgba(61,37,30,0.08)' }}>
                      <th style={{ padding: '14px 18px' }}>Date</th>
                      <th style={{ padding: '14px 18px' }}>Transaction Reason</th>
                      <th style={{ padding: '14px 18px' }}>Type</th>
                      <th style={{ padding: '14px 18px' }}>Amount</th>
                      <th style={{ padding: '14px 18px' }}>Balance After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid rgba(61,37,30,0.06)' }}>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--cocoa-dark)' }}>
                          {tx.reason}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', background: '#FAF0E4', color: 'var(--cocoa-dark)' }}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 800, color: tx.direction === 'CREDIT' ? '#2E6F40' : '#BA1B1B' }}>
                          {tx.direction === 'CREDIT' ? `+${tx.amount}` : `-${tx.amount}`} PTS
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--cocoa-dark)' }}>
                          {tx.balance_after} PTS
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROFILE & SECURITY */}
        {activeTab === 'profile' && (
          <div style={{ marginTop: '28px', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Edit Profile Form */}
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--cocoa-dark)', margin: 0 }}>
                  👤 Edit Profile Information
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--caramel)', background: '#FAF0E4', padding: '4px 10px', borderRadius: 'var(--radius-pill)' }}>
                  👑 {royalty?.royaltyId || 'ROYALTY MEMBER'}
                </span>
              </div>

              {profileMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    marginBottom: '14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: profileMsg.type === 'success' ? '#E2F0E6' : '#FDE8E8',
                    color: profileMsg.type === 'success' ? '#2E6F40' : '#BA1B1B',
                  }}
                >
                  {profileMsg.text}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cocoa)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Your Full Name"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(61,37,30,0.2)', fontSize: '14px', background: '#FAF6F0' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cocoa)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Mobile Number * (For Delivery &amp; Points)
                  </label>
                  <input
                    type="tel"
                    required
                    value={profileMobile}
                    onChange={(e) => setProfileMobile(e.target.value)}
                    placeholder="Your 10-digit mobile number"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(61,37,30,0.2)', fontSize: '14px', background: '#FAF6F0' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cocoa)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Email Address * (For Invoices &amp; Recovery)
                  </label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(61,37,30,0.2)', fontSize: '14px', background: '#FAF6F0' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="btn btn--gold btn--sm"
                  style={{ alignSelf: 'flex-start', padding: '10px 20px', marginTop: '4px', fontWeight: 800 }}
                >
                  {profileSaving ? 'Saving Changes...' : 'Save Profile Changes →'}
                </button>
              </form>
            </div>

            {/* Change Password Form */}
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', marginBottom: '8px' }}>
                🔐 Change Account Password
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Walk-in customer initial password was your mobile number. You can update your password below at any time.
              </p>

              {pwdMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    marginBottom: '14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: pwdMsg.type === 'success' ? '#E2F0E6' : '#FDE8E8',
                    color: pwdMsg.type === 'success' ? '#2E6F40' : '#BA1B1B',
                  }}
                >
                  {pwdMsg.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cocoa)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Current Password (or Mobile Number) *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password or mobile number"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(61,37,30,0.2)', fontSize: '14px', background: '#FAF6F0' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cocoa)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    New Password (Min. 6 Characters) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new secure password"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(61,37,30,0.2)', fontSize: '14px', background: '#FAF6F0' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cocoa)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(61,37,30,0.2)', fontSize: '14px', background: '#FAF6F0' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={pwdSubmitting}
                  className="btn btn--gold btn--sm"
                  style={{ alignSelf: 'flex-start', padding: '10px 20px', marginTop: '4px', fontWeight: 800 }}
                >
                  {pwdSubmitting ? 'Updating Password...' : 'Update Password →'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModalItem && (
        <ReviewModal
          product={reviewModalItem.product}
          orderId={reviewModalItem.orderId}
          customer={customer}
          onClose={() => setReviewModalItem(null)}
          onReviewSubmitted={(newRev) => {
            setReviewedProductMap((prev) => ({
              ...prev,
              [`${newRev.product_id}_${reviewModalItem.orderId}`]: newRev.rating,
              [newRev.product_id]: newRev.rating,
            }))
            setActionMsg(`⭐ Thank you for rating "${reviewModalItem.product.name}"!`)
          }}
        />
      )}

      {/* Tax Invoice Modal */}
      {selectedInvoiceOrderId && (
        <InvoiceModal
          orderId={selectedInvoiceOrderId}
          onClose={() => setSelectedInvoiceOrderId(null)}
        />
      )}
    </main>
  )
}
