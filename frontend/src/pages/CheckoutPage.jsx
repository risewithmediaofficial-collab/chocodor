import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../api/client'
import { formatPrice } from '../data/content'

export default function CheckoutPage() {
  const { items, quote, orderType, setOrderType, appliedRewardCode, clearCart } = useCart()
  const { customer, openLogin } = useAuth()
  const navigate = useNavigate()

  // Form State
  const [name, setName] = useState(customer ? customer.name : '')
  const [mobile, setMobile] = useState(customer ? customer.mobile : '')
  const [email, setEmail] = useState(customer ? customer.email : '')

  const [doorNo, setDoorNo] = useState('')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState('Krishnagiri')
  const [pincode, setPincode] = useState('')
  const [landmark, setLandmark] = useState('')
  const [preferredTime, setPreferredTime] = useState('As soon as possible (30-45 mins)')
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY') // 'RAZORPAY' | 'COD'
  const [applyFirstOrder, setApplyFirstOrder] = useState(false)
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [paymentFailedOrder, setPaymentFailedOrder] = useState(null)

  // Sync if customer signs in while on checkout
  useEffect(() => {
    if (customer) {
      if (!name) setName(customer.name)
      if (!mobile) setMobile(customer.mobile)
      if (!email) setEmail(customer.email)
    }
  }, [customer])

  if (items.length === 0 && !paymentFailedOrder) {
    return (
      <main className="page page--checkout">
        <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🛒</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cocoa-dark)' }}>
            Your Bag is Empty
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            Please add items from our menu before proceeding to checkout.
          </p>
          <Link to="/menu" className="btn btn--gold">
            Browse Menu →
          </Link>
        </div>
      </main>
    )
  }

  // Load Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true)
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter your full name')
      return
    }

    if (!mobile.trim() || mobile.trim().length < 10) {
      setError('A valid 10-digit mobile number is required to receive order updates')
      return
    }

    if (orderType === 'DELIVERY' && (!street.trim() || !area.trim())) {
      setError('Please provide your street address and area in Krishnagiri for delivery')
      return
    }

    setSubmitting(true)

    try {
      const deliveryAddressPayload =
        orderType === 'DELIVERY'
          ? {
              doorNo: doorNo.trim(),
              street: street.trim(),
              area: area.trim(),
              city: city.trim() || 'Krishnagiri',
              pincode: pincode.trim(),
              landmark: landmark.trim(),
            }
          : null

      // 1. Create Order on Server
      const orderRes = await apiRequest('/orders', {
        method: 'POST',
        body: {
          customerName: name.trim(),
          customerMobile: mobile.trim(),
          customerEmail: email.trim(),
          orderSource: 'ONLINE',
          orderType,
          deliveryAddress: deliveryAddressPayload,
          pickupTime: preferredTime,
          items: items.map((i) => ({ productId: i.productId || i.id, quantity: i.quantity })),
          appliedRewardCode: appliedRewardCode || null,
          applyFirstOrderOffer: applyFirstOrder,
          paymentMethod,
          notes: notes.trim(),
        },
      })

      const placedOrder = orderRes.order

      // 2. Handle Online Razorpay Payment
      if (paymentMethod === 'RAZORPAY') {
        const rzpData = await apiRequest('/orders/razorpay-order', {
          method: 'POST',
          body: { orderId: placedOrder.id },
        })

        const scriptLoaded = await loadRazorpayScript()

        if (scriptLoaded && window.Razorpay) {
          const options = {
            key: rzpData.razorpayOrder.keyId || 'rzp_test_chocodor_live',
            amount: rzpData.razorpayOrder.amount,
            currency: 'INR',
            name: "Choco D'or Krishnagiri",
            description: `Order #${placedOrder.order_number}`,
            image: '/images/hero_chocolate.jpg',
            order_id: rzpData.razorpayOrder.id,
            handler: async function (response) {
              try {
                // Server-side Cryptographic Verification
                const verifyRes = await apiRequest('/orders/verify-payment', {
                  method: 'POST',
                  body: {
                    orderId: placedOrder.id,
                    razorpayOrderId: response.razorpay_order_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                  },
                })
                clearCart()
                navigate(`/orders/${verifyRes.order.order_number}`, { state: { newOrder: true } })
              } catch (verifyErr) {
                setError(`Payment Verification Failed: ${verifyErr.message}`)
                setPaymentFailedOrder(placedOrder)
              }
            },
            prefill: {
              name: name.trim(),
              contact: mobile.trim(),
              email: email.trim(),
            },
            theme: { color: '#2B1712' },
            modal: {
              ondismiss: async function () {
                await apiRequest('/orders/payment-failed', {
                  method: 'POST',
                  body: { orderId: placedOrder.id, reason: 'Payment dismissed by customer' },
                })
                setPaymentFailedOrder(placedOrder)
                setSubmitting(false)
              },
            },
          }

          const rzp = new window.Razorpay(options)
          rzp.on('payment.failed', async function (response) {
            await apiRequest('/orders/payment-failed', {
              method: 'POST',
              body: { orderId: placedOrder.id, reason: response.error.description },
            })
            setError(`Payment Failed: ${response.error.description}`)
            setPaymentFailedOrder(placedOrder)
            setSubmitting(false)
          })
          rzp.open()
          return
        } else {
          // If in test mode or script offline, complete directly
          clearCart()
          navigate(`/orders/${placedOrder.order_number}`, { state: { newOrder: true } })
          return
        }
      }

      // COD Flow
      clearCart()
      navigate(`/orders/${placedOrder.order_number}`, { state: { newOrder: true } })
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Calculated displayed totals
  const fallbackSubtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)
  const subtotal = quote.subtotal > 0 ? quote.subtotal : fallbackSubtotal
  const firstOrderDiscount = applyFirstOrder ? 20 : 0
  const deliveryFee = orderType === 'DELIVERY' ? (quote.deliveryFee !== undefined ? quote.deliveryFee : (subtotal >= 500 ? 0 : 40)) : 0
  const rewardDiscount = quote.rewardDiscount || 0
  const totalPayable = Math.max(0, subtotal - firstOrderDiscount - rewardDiscount) + deliveryFee

  return (
    <main className="page page--checkout">
      <div className="container">
        <header className="page-header">
          <span className="section-label section-label--eyebrow">ONLINE ORDERING &amp; CHECKOUT</span>
          <h1 className="page-title">CHECKOUT</h1>
          <p className="page-desc">
            Complete your delivery details. Royalty points and delivery rules are calculated server-side.
          </p>
        </header>

        {paymentFailedOrder && (
          <div style={{ background: 'rgba(186, 27, 27, 0.1)', border: '1px solid #BA1B1B', padding: '18px 24px', borderRadius: '16px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong style={{ color: '#BA1B1B', fontSize: '15px' }}>⚠️ Payment Incomplete / Failed</strong>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--cocoa)' }}>
                Order <strong>#{paymentFailedOrder.order_number}</strong> is pending payment. Click below to retry payment.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--gold btn--sm"
              onClick={() => handlePlaceOrder()}
            >
              🔄 Retry Payment Now
            </button>
          </div>
        )}

        {/* First-Order Offer Banner */}
        <div style={{ background: '#FAF0E4', border: '1px solid rgba(179,123,36,0.3)', padding: '16px 20px', borderRadius: '16px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong style={{ color: 'var(--cocoa-dark)' }}>🎉 FIRST ORDER SPECIAL OFFER</strong>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cocoa)' }}>
              New to Choco D&apos;or? Get <strong>₹20 OFF</strong> your first order! (Verified server-side).
            </p>
          </div>
          <button
            type="button"
            className={`btn btn--sm ${applyFirstOrder ? 'btn--gold' : 'btn--outline'}`}
            onClick={() => setApplyFirstOrder(!applyFirstOrder)}
          >
            {applyFirstOrder ? '✓ ₹20 Offer Applied' : '+ Apply ₹20 Offer'}
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(186, 27, 27, 0.1)', color: '#BA1B1B', padding: '14px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, marginBottom: '24px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="cart-layout">
          {/* Left Form: Details */}
          <div className="cart-items-panel" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Section 1: Customer Contact */}
            <div style={{ background: '#FFFFFF', padding: 'clamp(14px, 3vw, 24px)', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', marginBottom: '16px' }}>
                1. Contact Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '14px' }}>
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Mobile Number * (Required)</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="form-input"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com (for digital invoice)"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Order Type & Delivery */}
            <div style={{ background: '#FFFFFF', padding: 'clamp(14px, 3vw, 24px)', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', margin: 0 }}>
                  2. Order Type &amp; Address
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn btn--sm ${orderType === 'DELIVERY' ? 'btn--gold' : 'btn--outline'}`}
                    onClick={() => setOrderType('DELIVERY')}
                  >
                    🛵 Delivery
                  </button>
                  <button
                    type="button"
                    className={`btn btn--sm ${orderType === 'PICKUP' ? 'btn--gold' : 'btn--outline'}`}
                    onClick={() => setOrderType('PICKUP')}
                  >
                    🛍️ Pickup
                  </button>
                </div>
              </div>

              {orderType === 'DELIVERY' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: '14px' }}>
                  <div>
                    <label className="form-label">Door / Flat / House No.</label>
                    <input
                      type="text"
                      value={doorNo}
                      onChange={(e) => setDoorNo(e.target.value)}
                      placeholder="e.g. 12/A"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Street / Road *</label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="e.g. MG Road, Near Bus Stand"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Area / Locality *</label>
                    <input
                      type="text"
                      required
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Gandhi Nagar"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Landmark</label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Opposite Post Office"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Pincode</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 635001"
                      className="form-input"
                    />
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', background: '#FAF6F0', borderRadius: '12px' }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--cocoa-dark)' }}>
                    📍 Boutique Pickup Location:
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                    Choco D&apos;or Confectionery Boutique, Krishnagiri. Freshly boxed upon your arrival.
                  </p>
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <label className="form-label">
                  {orderType === 'DELIVERY' ? 'Preferred Delivery Time' : 'Preferred Pickup Time'}
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="form-input"
                  style={{ background: '#FFFFFF' }}
                >
                  <option value="As soon as possible (30-45 mins)">As soon as possible (30–45 mins)</option>
                  <option value="Today: Evening (5:00 PM – 7:00 PM)">Today: Evening (5:00 PM – 7:00 PM)</option>
                  <option value="Today: Night (7:00 PM – 9:00 PM)">Today: Night (7:00 PM – 9:00 PM)</option>
                </select>
              </div>
            </div>

            {/* Section 3: Payment Method Selector */}
            <div style={{ background: '#FFFFFF', padding: 'clamp(14px, 3vw, 24px)', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', marginBottom: '16px' }}>
                3. Payment Method
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '12px' }}>
                <div
                  onClick={() => setPaymentMethod('RAZORPAY')}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    border: paymentMethod === 'RAZORPAY' ? '2px solid var(--caramel)' : '1px solid rgba(61,37,30,0.15)',
                    background: paymentMethod === 'RAZORPAY' ? '#FAF0E4' : '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 800, color: 'var(--cocoa-dark)', marginBottom: '4px' }}>
                    ⚡ Razorpay Online
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    UPI, Google Pay, PhonePe, Cards, NetBanking (Instant Confirmation)
                  </div>
                </div>

                <div
                  onClick={() => setPaymentMethod('COD')}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    border: paymentMethod === 'COD' ? '2px solid var(--caramel)' : '1px solid rgba(61,37,30,0.15)',
                    background: paymentMethod === 'COD' ? '#FAF0E4' : '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 800, color: 'var(--cocoa-dark)', marginBottom: '4px' }}>
                    💵 Cash on Delivery (COD)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Pay with Cash or UPI upon receiving your box
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Notes */}
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', marginBottom: '12px' }}>
                4. Special Instructions / Kitchen Note
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Less sauce please / Birthday message: 'Happy Birthday!'"
                rows={2}
                className="form-input"
                style={{ borderRadius: '14px', resize: 'none' }}
              />
            </div>
          </div>

          {/* Right Summary */}
          <div className="cart-summary-panel">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cocoa-dark)', marginBottom: '16px' }}>
              Order Review
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '220px', overflowY: 'auto' }}>
              {items.map((i) => (
                <div key={i.productId || i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--cocoa)' }}>
                    {i.quantity} × {i.name}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--cocoa-dark)' }}>
                    {formatPrice(i.price * i.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="cart-summary__lines">
              <div className="cart-summary__line">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              {orderType === 'DELIVERY' && (
                <div className="cart-summary__line">
                  <span>Delivery Fee {subtotal >= 500 && <span style={{ color: '#2E6F40', fontSize: '11px' }}>(≥₹500 Free)</span>}</span>
                  <span>{deliveryFee === 0 ? <strong style={{ color: '#2E6F40' }}>FREE</strong> : formatPrice(deliveryFee)}</span>
                </div>
              )}

              {firstOrderDiscount > 0 && (
                <div className="cart-summary__line" style={{ color: '#2E6F40', fontWeight: 700 }}>
                  <span>First Order Offer</span>
                  <span>−{formatPrice(firstOrderDiscount)}</span>
                </div>
              )}

              {rewardDiscount > 0 && (
                <div className="cart-summary__line" style={{ color: '#2E6F40', fontWeight: 700 }}>
                  <span>Reward ({appliedRewardCode})</span>
                  <span>−{formatPrice(rewardDiscount)}</span>
                </div>
              )}

              <div className="cart-summary__line cart-summary__line--total">
                <span>Total Payable</span>
                <span>{formatPrice(totalPayable)}</span>
              </div>
            </div>

            <div className="cart-summary__points-banner">
              👑 You will earn <strong>+{quote.totalRoyaltyPoints} Points</strong> upon order completion.
            </div>

            <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Payment: <strong>{paymentMethod === 'RAZORPAY' ? 'Razorpay Secure Checkout' : 'Cash / UPI on Delivery'}</strong>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn--gold btn--full"
              style={{ marginTop: '20px', padding: '16px' }}
            >
              {submitting ? 'Processing Order...' : `Pay ${formatPrice(totalPayable)} →`}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
