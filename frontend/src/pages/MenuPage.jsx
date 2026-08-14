import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollReveal } from '../components/ScrollReveal'
import { useCart } from '../context/CartContext'
import { apiRequest } from '../api/client'
import { formatPrice } from '../data/content'

export default function MenuPage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeCategory, setActiveCategory] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [addedToast, setAddedToast] = useState(null)

  const navigate = useNavigate()
  const { addToCart } = useCart()

  useEffect(() => {
    async function loadCatalogue() {
      try {
        setLoading(true)
        const data = await apiRequest('/products')
        setCategories(data.categories || [])
        setProducts(data.products || [])
      } catch (err) {
        setError(err.message || 'Failed to load menu catalogue')
      } finally {
        setLoading(false)
      }
    }
    loadCatalogue()
  }, [])

  const filteredProducts = products.filter((p) => {
    const matchCategory =
      activeCategory === 'ALL' ||
      p.category.toLowerCase() === activeCategory.toLowerCase() ||
      p.categorySlug === activeCategory.toLowerCase()

    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())

    return matchCategory && matchSearch
  })

  const handleAdd = (product, qty = 1, e) => {
    if (e) e.stopPropagation()
    addToCart(product, qty)
    setAddedToast(`Added ${qty} × ${product.name} to bag!`)
    setTimeout(() => setAddedToast(null), 2200)
  }

  return (
    <main className="page page--shop">
      <div className="container">
        {/* Page Header */}
        <header className="page-header page-header--center">
          <span className="section-label section-label--eyebrow">AUTHENTIC KRISHNAGIRI DESSERTS</span>
          <h1 className="page-title">OUR FULL MENU</h1>
          <p className="page-desc">
            Handcrafted with pure single-origin cacao and fresh butter. Click any item to explore complete ingredients, dietary details, and tasting notes.
          </p>

          {/* Search Bar */}
          <div style={{ marginTop: '24px', maxWidth: '420px', marginInline: 'auto' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search waffles, salankatia, cakes, brownies..."
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid rgba(61, 37, 30, 0.18)',
                background: '#FFFFFF',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>
        </header>

        {/* Category Pills */}
        <ScrollReveal className="shop-filters-wrap">
          <div className="category-pills">
            <button
              type="button"
              className={`category-pill ${activeCategory === 'ALL' ? 'category-pill--active' : ''}`}
              onClick={() => setActiveCategory('ALL')}
            >
              All Delights ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`category-pill ${activeCategory === cat.slug ? 'category-pill--active' : ''}`}
                onClick={() => setActiveCategory(cat.slug)}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Toast Alert */}
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              ✨ {addedToast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Products Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }}>🍫</span>
            <p>Loading fresh creations from kitchen...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#BA1B1B' }}>
            <p>⚠️ {error}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cocoa-dark)' }}>No items found</p>
            <p>Try searching for another dessert name or reset filters.</p>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              style={{ marginTop: '12px' }}
              onClick={() => {
                setActiveCategory('ALL')
                setSearchQuery('')
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="favourites__grid" style={{ marginTop: '48px', marginBottom: '80px' }}>
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.article
                  key={product.id}
                  className="fav-card fav-card--clickable"
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {product.badge && (
                    <span className="fav-card__badge">{product.badge}</span>
                  )}

                  <div className="fav-card__image-wrap">
                    <motion.img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      whileHover={{ scale: 1.06 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>

                  <div className="fav-card__body">
                    <div className="fav-card__header">
                      <h3 className="fav-card__name">{product.name}</h3>
                      <span className="fav-card__price">{formatPrice(product.price)}</span>
                    </div>

                    <div className="fav-card__points-tag">
                      👑 Earn {product.royaltyPoints} Royalty Points
                    </div>

                    {product.description && (
                      <p className="fav-card__desc">{product.description}</p>
                    )}

                    <button
                      type="button"
                      disabled={!product.isAvailable}
                      className="fav-card__add-btn"
                      onClick={(e) => handleAdd(product, 1, e)}
                    >
                      {product.isAvailable ? '+ Add to Bag' : 'Currently Unavailable'}
                    </button>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  )
}
