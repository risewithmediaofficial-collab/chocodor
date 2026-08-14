import { useState } from 'react'
import { apiRequest } from '../api/client'

export default function ReviewModal({ product, orderId, customer, onReviewSubmitted, onClose }) {
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [customerName, setCustomerName] = useState(customer?.name || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const ratingLabels = {
    1: 'Needs Improvement',
    2: 'Fair Experience',
    3: 'Good & Tasty',
    4: 'Delicious Delight',
    5: 'Exceptional Luxury Indulgence! 🍫',
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!customerName.trim()) {
      setError('Please provide your name.')
      return
    }

    try {
      setSubmitting(true)
      const res = await apiRequest(`/products/${product.id}/reviews`, {
        method: 'POST',
        body: {
          rating,
          reviewText,
          customerName: customerName.trim(),
          customerId: customer?.id || 'guest',
          orderId: orderId || null,
        },
      })

      if (onReviewSubmitted) onReviewSubmitted(res.review)
      alert('✓ Thank you! Your review and rating have been recorded.')
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cart-drawer-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div
        className="product-modal"
        style={{ maxWidth: '460px', width: '100%', padding: '24px', background: '#FFFFFF', borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--caramel)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Product Review
            </span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cocoa-dark)', margin: '2px 0 0' }}>
              Rate {product?.name}
            </h3>
          </div>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{ background: '#FDF2F2', color: '#BA1B1B', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Interactive Star Rating */}
          <div style={{ background: '#FAF6F0', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cocoa)', marginBottom: '8px' }}>
              Select Your Rating
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '2.2rem', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  style={{
                    color: (hoverRating || rating) >= star ? '#F0C14B' : '#DDD',
                    transition: 'transform 0.15s ease',
                    transform: (hoverRating || rating) >= star ? 'scale(1.15)' : 'scale(1)',
                    userSelect: 'none',
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cocoa-dark)', marginTop: '6px' }}>
              {ratingLabels[hoverRating || rating]}
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="form-label">Your Name</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Sathish Kumar"
              className="form-input"
              style={{ fontSize: '13px', padding: '10px 14px' }}
            />
          </div>

          {/* Review Text */}
          <div>
            <label className="form-label">Review &amp; Tasting Notes (Optional)</label>
            <textarea
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="What did you love about the texture, chocolate intensity, or flavour notes?"
              className="form-input"
              style={{ fontSize: '13px', padding: '10px 14px', resize: 'vertical' }}
            />
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn btn--outline btn--full"
              onClick={onClose}
              style={{ padding: '10px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn--gold btn--full"
              style={{ padding: '10px', fontWeight: 900 }}
            >
              {submitting ? 'Submitting...' : 'Submit Review ★'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
