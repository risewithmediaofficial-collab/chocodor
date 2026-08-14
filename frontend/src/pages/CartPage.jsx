import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../data/content'

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, quote, appliedRewardCode, setAppliedRewardCode, orderType, setOrderType, quoteLoading } = useCart()
  const { customer, openLogin } = useAuth()
  const navigate = useNavigate()

  const [couponInput, setCouponInput] = useState(appliedRewardCode || '')
  const [couponMsg, setCouponMsg] = useState('')

  const handleApplyCoupon = (e) => {
    e.preventDefault()
    if (!couponInput.trim()) return
    setAppliedRewardCode(couponInput.trim().toUpperCase())
    setCouponMsg('Checking code with server...')
  }

  const handleRemoveCoupon = () => {
    setAppliedRewardCode('')
    setCouponInput('')
    setCouponMsg('')
  }

  return (
    <main className="page page--cart">
      <div className="container">
        <header className="page-header">
          <span className="section-label section-label--eyebrow">YOUR ORDER BAG</span>
          <h1 className="page-title">SHOPPING BAG</h1>
          <p className="page-desc">
            Review your chocolate creations and preview the Royalty Points you&apos;ll earn upon delivery.
          </p>
        </header>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--white)', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(61,37,30,0.1)' }}>
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '16px' }}>🍫</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cocoa-dark)', marginBottom: '8px' }}>
              Your Bag is Currently Empty
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 24px' }}>
              Explore our freshly baked waffles, layered Salankatia, brownies, and artisanal desserts.
            </p>
            <Link to="/menu" className="btn btn--gold">
              Explore Our Menu →
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            {/* Left: Line Items List */}
            <div className="cart-items-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cocoa-dark)' }}>
                  Selected Items ({items.reduce((a, b) => a + b.quantity, 0)})
                </h3>
                <Link to="/menu" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--caramel)', textDecoration: 'underline' }}>
                  + Add More Items
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {items.map((item) => (
                  <div key={item.productId || item.id} className="cart-page-item">
                    <img src={item.image} alt={item.name} className="cart-page-item__img" />
                    <div className="cart-page-item__info">
                      <h4 className="cart-page-item__name">{item.name}</h4>
                      <div className="cart-page-item__meta">
                        <span className="cart-page-item__unit-price">{formatPrice(item.price)} each</span>
                        <span className="cart-page-item__points">👑 +{item.royaltyPoints * item.quantity} Points</span>
                      </div>
                      <div className="cart-page-item__actions">
                        <div className="product-modal__qty-selector">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId || item.id, item.quantity - 1)}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId || item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="cart-item__remove"
                          onClick={() => removeFromCart(item.productId || item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="cart-page-item__subtotal">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="cart-summary-panel">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cocoa-dark)', marginBottom: '16px' }}>
                Order Summary
              </h3>

              {/* Order Type Toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                  type="button"
                  className={`btn ${orderType === 'DELIVERY' ? 'btn--gold' : 'btn--outline'}`}
                  style={{ flex: 1, padding: '10px', fontSize: '12px' }}
                  onClick={() => setOrderType('DELIVERY')}
                >
                  🛵 Delivery
                </button>
                <button
                  type="button"
                  className={`btn ${orderType === 'PICKUP' ? 'btn--gold' : 'btn--outline'}`}
                  style={{ flex: 1, padding: '10px', fontSize: '12px' }}
                  onClick={() => setOrderType('PICKUP')}
                >
                  🛍️ Self-Pickup
                </button>
              </div>

              {/* Coupon / Reward Code Box */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--cocoa)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Have a Royalty Reward or Coupon?
                </label>
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="e.g. CDR-120-X8K2"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid rgba(61,37,30,0.2)',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button type="submit" className="btn btn--gold" style={{ padding: '10px 18px', fontSize: '12px' }}>
                    Apply
                  </button>
                </form>

                {appliedRewardCode && !quote.rewardError && (
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(46,111,64,0.1)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#2E6F40', fontWeight: 700 }}>
                    <span>✓ Applied: {appliedRewardCode} (-₹{quote.rewardDiscount})</span>
                    <button type="button" onClick={handleRemoveCoupon} style={{ color: '#BA1B1B', fontWeight: 800, textDecoration: 'underline' }}>
                      Remove
                    </button>
                  </div>
                )}

                {quote.rewardError && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#BA1B1B', fontWeight: 600 }}>
                    ⚠️ {quote.rewardError}
                  </div>
                )}
              </div>

              {/* Breakdown */}
              <div className="cart-summary__lines">
                <div className="cart-summary__line">
                  <span>Items Subtotal</span>
                  <span>{formatPrice(quote.subtotal)}</span>
                </div>

                {orderType === 'DELIVERY' && (
                  <div className="cart-summary__line">
                    <span>Delivery Fee</span>
                    <span>{quote.deliveryFee === 0 ? <strong style={{ color: '#2E6F40' }}>FREE</strong> : formatPrice(quote.deliveryFee)}</span>
                  </div>
                )}

                {quote.rewardDiscount > 0 && (
                  <div className="cart-summary__line" style={{ color: '#2E6F40', fontWeight: 700 }}>
                    <span>Royalty Reward Discount</span>
                    <span>−{formatPrice(quote.rewardDiscount)}</span>
                  </div>
                )}

                <div className="cart-summary__line cart-summary__line--total">
                  <span>Grand Total</span>
                  <span>{formatPrice(quote.grandTotal)}</span>
                </div>
              </div>

              {/* Points to be earned callout */}
              <div className="cart-summary__points-banner">
                <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>👑</div>
                <div>
                  <strong>+{quote.totalRoyaltyPoints} Royalty Points</strong> to be credited to your account upon order completion!
                </div>
              </div>

              <button
                type="button"
                className="btn btn--gold btn--full"
                style={{ marginTop: '20px', padding: '16px' }}
                onClick={() => navigate('/checkout')}
              >
                Proceed to Checkout ({formatPrice(quote.grandTotal)}) →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
