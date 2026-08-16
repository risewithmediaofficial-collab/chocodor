import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiRequest } from '../api/client'
import { useCart } from '../context/CartContext'
import { allProducts as defaultProducts, formatPrice } from '../data/content'
import ReviewModal from '../components/ReviewModal'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()

  const fallbackProduct = defaultProducts.find((p) => p.id === id || p.id === `p-${id}` || p.name.toLowerCase().replace(/\s+/g, '-') === id)
  const [product, setProduct] = useState(fallbackProduct || null)
  const [relatedProducts, setRelatedProducts] = useState(defaultProducts.slice(0, 4))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(fallbackProduct?.image || '')
  const [addedToast, setAddedToast] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)

  useEffect(() => {
    async function loadProductData() {
      try {
        setError(null)
        // 1. Fetch current product
        const prodData = await apiRequest(`/products/${id}`)
        if (prodData && prodData.name) {
          setProduct(prodData)
          setSelectedImage(prodData.image)
        }
        // 2. Fetch catalogue for related recommendations
        const allData = await apiRequest('/products')
        const allProds = allData.products || defaultProducts
        const related = allProds
          .filter((p) => p.id !== id && (p.categoryId === prodData?.categoryId || p.category === prodData?.category || p.isBestseller))
          .slice(0, 4)
        setRelatedProducts(related)
      } catch (err) {
        console.warn('Product API notice, using cached product detail:', err.message)
        if (!fallbackProduct) {
          setError('Dessert not found')
        }
      }
    }

    loadProductData()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  const handleAddToCart = () => {
    if (!product) return
    addToCart(product, quantity)
    setAddedToast(true)
    setTimeout(() => setAddedToast(false), 2400)
  }

  const handleBuyNow = () => {
    if (!product) return
    addToCart(product, quantity)
    navigate('/checkout')
  }

  if (loading) {
    return (
      <main className="page" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div className="container">
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '16px' }}>🍫</span>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--cocoa-dark)' }}>
            Preparing Dessert Details...
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Fetching artisanal confectionery specifications.</p>
        </div>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="page" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🧁</span>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--cocoa-dark)' }}>
            Dessert Not Found
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            The item you are looking for might have been updated or moved.
          </p>
          <Link to="/menu" className="btn btn--gold">
            Browse Full Menu →
          </Link>
        </div>
      </main>
    )
  }

  const galleryImages = [product.image, ...(product.extraImages || [])].filter(Boolean)

  return (
    <main className="page page--product-detail">
      <div className="container" style={{ maxWidth: '1140px', paddingBottom: '80px' }}>
        {/* Breadcrumb Trail */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px', flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: 'var(--caramel)', fontWeight: 600 }}>Home</Link>
          <span>/</span>
          <Link to="/menu" style={{ color: 'var(--caramel)', fontWeight: 600 }}>Menu</Link>
          <span>/</span>
          <span>{product.category}</span>
          <span>/</span>
          <strong style={{ color: 'var(--cocoa-dark)' }}>{product.name}</strong>
        </nav>

        {/* Floating Cart Toast Feedback */}
        <AnimatePresence>
          {addedToast && (
            <motion.div
              style={{
                position: 'fixed',
                bottom: '32px',
                right: '32px',
                zIndex: 9999,
                background: '#2B1712',
                color: '#FAF0E4',
                padding: '14px 24px',
                borderRadius: '16px',
                boxShadow: '0 12px 36px rgba(43,23,18,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                fontWeight: 700,
                border: '1px solid rgba(240,193,75,0.4)',
              }}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
            >
              <span>✨</span>
              <span>Added {quantity} × {product.name} to your bag!</span>
              <Link to="/cart" style={{ color: '#F0C14B', marginLeft: '8px', textDecoration: 'underline' }}>
                View Bag →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Product Two-Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px', alignItems: 'start' }}>
          
          {/* Left Column: Image Showcase */}
          <div>
            <div
              style={{
                background: '#FAF6F0',
                borderRadius: '28px',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(61,37,30,0.1)',
                boxShadow: '0 16px 40px rgba(43,23,18,0.06)',
                aspectRatio: '1 / 1',
              }}
            >
              {product.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    zIndex: 2,
                    background: '#2B1712',
                    color: '#F0C14B',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-pill)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {product.badge}
                </span>
              )}

              <img
                src={selectedImage || product.image}
                alt={product.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'transform 0.4s ease',
                }}
              />
            </div>

            {/* Gallery Thumbnails if extra images exist */}
            {galleryImages.length > 1 && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      border: selectedImage === img ? '2px solid var(--caramel)' : '1px solid rgba(61,37,30,0.15)',
                      padding: 0,
                      background: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}

            {/* Royalty Perks Callout */}
            <div
              style={{
                marginTop: '24px',
                background: '#FAF0E4',
                border: '1px solid rgba(179,123,36,0.3)',
                borderRadius: '18px',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <span style={{ fontSize: '2rem' }}>👑</span>
              <div>
                <strong style={{ color: 'var(--cocoa-dark)', fontSize: '14px', display: 'block' }}>
                  Collect +{product.royaltyPoints * quantity} Choco D&apos;or Royalty Points
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--cocoa)' }}>
                  Earn {product.royaltyPoints} pts per item. Redeem for exclusive free desserts and cash discounts.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Details & Ordering */}
          <div>
            {/* Category & Name */}
            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--caramel)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                {product.category}
              </span>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.4rem',
                  color: 'var(--cocoa-dark)',
                  margin: '0 0 8px',
                  lineHeight: 1.15,
                }}
              >
                {product.name}
              </h1>

              {/* Star Rating Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ color: '#F0C14B', fontSize: '15px', fontWeight: 800 }}>★ {product.rating || 5.0}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  ({product.reviewCount || 0} customer reviews)
                </span>
              </div>

              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#B37B24' }}>
                {formatPrice(product.price)}
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: '15px', lineHeight: 1.65, color: 'var(--cocoa)', margin: '0 0 28px' }}>
              {product.description || 'Artisanal dessert prepared fresh with pure Belgian cacao and premium confectionery ingredients.'}
            </p>

            {/* Extra Details Grid */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid rgba(61,37,30,0.1)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginBottom: '32px',
                boxShadow: '0 8px 24px rgba(43,23,18,0.04)',
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--cocoa-dark)', margin: 0, borderBottom: '1px solid rgba(61,37,30,0.08)', paddingBottom: '10px' }}>
                Artisanal Specifications &amp; Details
              </h3>

              {/* Dietary Profile */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '13px' }}>
                <span style={{ fontSize: '1.2rem' }}>🌿</span>
                <div>
                  <strong style={{ color: 'var(--cocoa-dark)', display: 'block' }}>Dietary &amp; Preparation:</strong>
                  <span style={{ color: 'var(--text-muted)' }}>{product.dietaryInfo}</span>
                </div>
              </div>

              {/* Ingredients */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '13px' }}>
                <span style={{ fontSize: '1.2rem' }}>🍫</span>
                <div>
                  <strong style={{ color: 'var(--cocoa-dark)', display: 'block' }}>Key Ingredients:</strong>
                  <span style={{ color: 'var(--text-muted)' }}>{product.ingredients}</span>
                </div>
              </div>

              {/* Serving Suggestion */}
              {product.servingSuggestion && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '13px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🍽️</span>
                  <div>
                    <strong style={{ color: 'var(--cocoa-dark)', display: 'block' }}>Chef&apos;s Serving Pairing:</strong>
                    <span style={{ color: 'var(--text-muted)' }}>{product.servingSuggestion}</span>
                  </div>
                </div>
              )}

              {/* Prep Time & Portion */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '13px' }}>
                <span style={{ fontSize: '1.2rem' }}>⏱️</span>
                <div>
                  <strong style={{ color: 'var(--cocoa-dark)', display: 'block' }}>Portion &amp; Time:</strong>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {product.portionSize} • Fresh Bake Time: {product.preparationTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Quantity Stepper & Add to Cart Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Stepper */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#FAF6F0',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid rgba(61,37,30,0.15)',
                    padding: '4px',
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: 'none',
                      background: '#FFFFFF',
                      color: 'var(--cocoa-dark)',
                      fontSize: '18px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: '36px', textAlign: 'center', fontWeight: 800, fontSize: '15px', color: 'var(--cocoa-dark)' }}>
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: 'none',
                      background: '#FFFFFF',
                      color: 'var(--cocoa-dark)',
                      fontSize: '18px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Add to Bag Button */}
                <button
                  type="button"
                  disabled={!product.isAvailable}
                  className="btn btn--gold"
                  style={{ flex: '1 1 200px', padding: '14px 20px', fontSize: '14px', fontWeight: 800, opacity: product.isAvailable ? 1 : 0.6 }}
                  onClick={handleAddToCart}
                >
                  {product.isAvailable ? `ADD TO CART • ${formatPrice(product.price * quantity)}` : 'Not on Today\'s Menu'}
                </button>
              </div>

              {!product.isAvailable && (
                <div style={{ background: '#FAF0E4', padding: '10px 14px', borderRadius: '12px', fontSize: '12px', color: '#BA1B1B', fontWeight: 700 }}>
                  ⚠️ This dessert is not on today&apos;s fresh batch menu. Please check back tomorrow or browse our active menu!
                </div>
              )}

              {/* Buy Now Button */}
              {product.isAvailable && (
                <button
                  type="button"
                  className="btn btn--outline"
                  style={{ padding: '14px', fontSize: '14px', fontWeight: 700, width: '100%' }}
                  onClick={handleBuyNow}
                >
                  Instant Checkout / Buy Now →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Customer Reviews & Ratings Section */}
        <section style={{ marginTop: '70px', borderTop: '1px solid rgba(61,37,30,0.1)', paddingTop: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
            <div>
              <span className="section-label section-label--eyebrow">VERIFIED INDULGENCE REVIEWS</span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cocoa-dark)', margin: '4px 0 0' }}>
                Customer Ratings &amp; Tasting Notes
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#B37B24' }}>
                  ★ {product.rating || 5.0} / 5.0
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Based on {product.reviewCount || 0} customer reviews
                </div>
              </div>
              <button
                type="button"
                className="btn btn--gold btn--sm"
                style={{ padding: '8px 16px', fontWeight: 800 }}
                onClick={() => setShowReviewModal(true)}
              >
                ✍️ Write a Review
              </button>
            </div>
          </div>

          {/* Reviews List */}
          {(!product.reviews || product.reviews.length === 0) ? (
            <div style={{ background: '#FAF6F0', borderRadius: '18px', padding: '36px', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🍫</span>
              <strong style={{ color: 'var(--cocoa-dark)', display: 'block', fontSize: '15px' }}>
                Be the first to review {product.name}!
              </strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 16px' }}>
                Share your tasting impressions on chocolate intensity, aroma, and silky textures.
              </p>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => setShowReviewModal(true)}
              >
                Rate this Dessert →
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {product.reviews.map((rev) => (
                <div
                  key={rev.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid rgba(61,37,30,0.1)',
                    padding: '20px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--cocoa-dark)', fontSize: '14px' }}>
                      {rev.customer_name}
                    </strong>
                    <span style={{ color: '#F0C14B', fontSize: '13px', letterSpacing: '2px' }}>
                      {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {new Date(rev.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} • Verified Confectionery Order
                  </div>
                  {rev.review_text && (
                    <p style={{ fontSize: '13px', color: 'var(--cocoa)', margin: 0, lineHeight: 1.5 }}>
                      &ldquo;{rev.review_text}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Related Desserts Recommendations */}
        {relatedProducts.length > 0 && (
          <section style={{ marginTop: '70px', borderTop: '1px solid rgba(61,37,30,0.1)', paddingTop: '48px' }}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <span className="section-label section-label--eyebrow">PAIR WITH MORE INDULGENCES</span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cocoa-dark)', margin: '4px 0' }}>
                You May Also Love
              </h2>
            </div>

            <div className="favourites__grid">
              {relatedProducts.map((rel) => (
                <article
                  key={rel.id}
                  className="fav-card fav-card--clickable"
                  onClick={() => navigate(`/product/${rel.id}`)}
                >
                  {rel.badge && <span className="fav-card__badge">{rel.badge}</span>}
                  <div className="fav-card__image-wrap">
                    <img src={rel.image} alt={rel.name} loading="lazy" />
                  </div>
                  <div className="fav-card__body">
                    <div className="fav-card__header">
                      <h3 className="fav-card__name">{rel.name}</h3>
                      <span className="fav-card__price">{formatPrice(rel.price)}</span>
                    </div>
                    <div className="fav-card__points-tag">
                      👑 Earn {rel.royaltyPoints} Royalty Points
                    </div>
                    <p className="fav-card__desc">{rel.description}</p>
                    <button
                      type="button"
                      className="fav-card__add-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        addToCart(rel, 1)
                        setAddedToast(true)
                        setTimeout(() => setAddedToast(false), 2400)
                      }}
                    >
                      + Quick Add
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && product && (
        <ReviewModal
          product={product}
          onClose={() => setShowReviewModal(false)}
          onReviewSubmitted={() => {
            // Reload product data to refresh reviews and rating count
            apiRequest(`/products/${id}`).then((updated) => setProduct(updated))
          }}
        />
      )}
    </main>
  )
}
