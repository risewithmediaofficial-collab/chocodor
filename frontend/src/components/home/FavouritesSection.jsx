import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScrollReveal, StaggerContainer, StaggerItem } from '../ScrollReveal'
import { favouriteProducts, formatPrice } from '../../data/content'
import { useCart } from '../../context/CartContext'

export default function FavouritesSection() {
  const [addedId, setAddedId] = useState(null)
  const navigate = useNavigate()
  const { addToCart } = useCart()

  const handleAddToCart = (product, e) => {
    e.stopPropagation()
    addToCart(product, 1)
    setAddedId(product.id)
    setTimeout(() => setAddedId(null), 1800)
  }

  return (
    <section className="favourites" id="favourites">
      <div className="container">
        <ScrollReveal className="section-head section-head--center">
          <span className="section-label">CHOCO D&apos;OR FAVOURITES</span>
          <h2 className="section-title">The Ones You&apos;ll Come Back For.</h2>
        </ScrollReveal>

        <StaggerContainer className="favourites__grid">
          {favouriteProducts.map((product) => (
            <StaggerItem key={product.id}>
              <article
                className="fav-card fav-card--clickable"
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

                  <p className="fav-card__desc">{product.description}</p>

                  <button
                    type="button"
                    className={`fav-card__add-btn ${addedId === product.id ? 'fav-card__add-btn--added' : ''}`}
                    onClick={(e) => handleAddToCart(product, e)}
                  >
                    {addedId === product.id ? '✓ Added to Bag' : '+ Add to Bag'}
                  </button>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <ScrollReveal className="section-cta" delay={0.1}>
          <Link to="/menu" className="btn btn--outline">
            View All Desserts &amp; Treats →
          </Link>
        </ScrollReveal>
      </div>
    </section>
  )
}
