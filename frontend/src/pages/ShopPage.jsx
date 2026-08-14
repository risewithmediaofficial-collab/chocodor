import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollReveal } from '../components/ScrollReveal'
import { categories, allProducts, formatPrice } from '../data/content'

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [addedId, setAddedId] = useState(null)

  const filteredProducts =
    activeCategory === 'ALL'
      ? allProducts
      : allProducts.filter((p) => p.category === activeCategory)

  const handleAddToCart = (product, qty = 1, e) => {
    if (e) e.stopPropagation()
    setAddedId(product.id)
    setTimeout(() => setAddedId(null), 1800)
  }

  const openProductModal = (product) => {
    setSelectedProduct(product)
    setQuantity(1)
  }

  return (
    <main className="page page--shop">
      <div className="container">
        {/* Page Header */}
        <header className="page-header page-header--center">
          <span className="section-label section-label--eyebrow">CHOCO D&apos;OR MENU</span>
          <h1 className="page-title">ALL DESSERTS &amp; CREATIONS</h1>
          <p className="page-desc">
            Explore our complete handcrafted menu — from flaky layered Salankatia and Belgian waffles
            to fudgy brownies and molten Basque cheesecakes.
          </p>
        </header>

        {/* Category Filter Pills (11 Categories) */}
        <ScrollReveal className="shop-filters-wrap">
          <div className="category-pills">
            <button
              type="button"
              className={`category-pill ${activeCategory === 'ALL' ? 'category-pill--active' : ''}`}
              style={{ background: '#E8D5BD' }}
              onClick={() => setActiveCategory('ALL')}
            >
              <span className="category-pill__label">ALL</span>
              <span className="category-pill__badge">{allProducts.length}</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                className={`category-pill ${activeCategory === cat.name ? 'category-pill--active' : ''}`}
                style={{ background: cat.color }}
                onClick={() => setActiveCategory(cat.name)}
              >
                <span className="category-pill__label">{cat.name.toUpperCase()}</span>
                <span className="category-pill__badge">
                  {allProducts.filter((p) => p.category === cat.name).length}
                </span>
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Products Grid */}
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
                transition={{ duration: 0.3 }}
                onClick={() => openProductModal(product)}
                title="Click to view details"
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

                  <p className="fav-card__desc">{product.description}</p>

                  <button
                    type="button"
                    className={`fav-card__add-btn ${addedId === product.id ? 'fav-card__add-btn--added' : ''}`}
                    onClick={(e) => handleAddToCart(product, 1, e)}
                  >
                    {addedId === product.id ? '✓ Added to Cart' : '+ Add to Cart'}
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        {/* Product Details Modal */}
        <AnimatePresence>
          {selectedProduct && (
            <div className="cart-drawer-overlay" onClick={() => setSelectedProduct(null)}>
              <motion.div
                className="product-modal"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="product-modal__close"
                  onClick={() => setSelectedProduct(null)}
                >
                  ✕
                </button>

                <div className="product-modal__image-wrap">
                  <img src={selectedProduct.image} alt={selectedProduct.name} />
                  {selectedProduct.badge && (
                    <span className="fav-card__badge" style={{ top: '16px', left: '16px' }}>
                      {selectedProduct.badge}
                    </span>
                  )}
                </div>

                <div className="product-modal__content">
                  <span className="section-label">{selectedProduct.category.toUpperCase()}</span>
                  <h2 className="product-modal__title">{selectedProduct.name}</h2>
                  <div className="product-modal__price">{formatPrice(selectedProduct.price)}</div>

                  <p className="product-modal__desc">{selectedProduct.description}</p>

                  <div className="product-modal__actions">
                    <div className="product-modal__qty-selector">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        −
                      </button>
                      <span>{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn--gold btn--full"
                      onClick={() => {
                        handleAddToCart(selectedProduct, quantity)
                        setSelectedProduct(null)
                      }}
                    >
                      Add to Cart • {formatPrice(selectedProduct.price * quantity)}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Chilled Melt-proof Promise Callout */}
        <div className="dose-delight" style={{ marginBottom: '80px' }}>
          <div className="dose-delight__stamp-wrap">
            <div className="dose-delight__basket-card">
              <img
                src="/images/chocolate_gift_box.jpg"
                alt="Luxury Packaging"
                className="dose-delight__basket-img"
              />
            </div>
          </div>
          <div className="dose-delight__copy">
            <span className="section-label">FRESHLY BAKED &amp; PREPARED DAILY</span>
            <h2 className="dose-delight__title">
              AUTHENTIC DESSERTS
              <br />
              CRAFTED IN KRISHNAGIRI
            </h2>
            <p className="dose-delight__desc">
              From our famous layered Salankatia to hot crispy Belgian waffles and Korean cheese buns,
              every creation is made fresh upon order with pure premium ingredients.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
