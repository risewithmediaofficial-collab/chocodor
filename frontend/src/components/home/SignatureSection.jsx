import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScrollReveal, StaggerContainer, StaggerItem } from '../ScrollReveal'
import { signatureProducts, formatPrice } from '../../data/content'

export default function SignatureSection() {
  return (
    <section className="signatures" id="signatures">
      <div className="container">
        {/* Editorial Spotlight Callout (inspired by "YOUR ONLY DOSE OF DELIGHT" in reference) */}
        <ScrollReveal>
          <div className="dose-delight">
            <div className="dose-delight__stamp-wrap">
              <div className="dose-delight__stamp">
                <span className="dose-delight__stamp-text">★ CRAFTED FRESH ★ DAILY IN KRISHNAGIRI ★</span>
                <span className="dose-delight__stamp-icon">✨</span>
              </div>
              <div className="dose-delight__basket-card">
                <img
                  src="/images/products/Pistachio_+_Biscoff_+_Nutella_Salankatia.jpg"
                  alt="Pistachio + Biscoff + Nutella Salankatia"
                  className="dose-delight__basket-img"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>

            <div className="dose-delight__copy">
              <span className="section-label">OUR SIGNATURES</span>
              <h2 className="dose-delight__title">
                YOUR ONLY 🍪
                <br />
                DOSE OF DELIGHT
              </h2>
              <div className="dose-delight__featured-pill">
                <span className="dose-delight__featured-label">Featured Item —</span>
                <span className="dose-delight__featured-name">Pistachio + Biscoff + Nutella Salankatia</span>
                <span className="dose-delight__featured-tag">Signature Lalban</span>
                <span className="dose-delight__featured-price">| ₹399</span>
              </div>
              <p className="dose-delight__desc">
                Crispy golden pastry layers filled and topped with pistachio cream, caramelized Lotus Biscoff,
                and authentic Nutella. Freshly prepared upon every order.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Section Header */}
        <ScrollReveal className="section-head section-head--between">
          <div>
            <span className="section-label">SIGNATURE COLLECTION</span>
            <h2 className="section-title">Made to Be Savoured.</h2>
          </div>
          <p className="section-desc section-desc--right">
            Explore Choco D&apos;or favourites, crafted to make every chocolate moment a
            little more special.
          </p>
        </ScrollReveal>

        {/* Signature Cards Grid */}
        <StaggerContainer className="signatures__grid">
          {signatureProducts.map((product) => (
            <StaggerItem key={product.id}>
              <article
                className="signature-card"
                style={{ '--card-bg': '#FAF0E4' }}
              >
                <div className="signature-card__tag-wrap">
                  <span className="signature-card__tag">{product.badge || 'Signature'}</span>
                </div>

                <div className="signature-card__image-wrap">
                  <motion.img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    whileHover={{ scale: 1.05, rotate: 1 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                <div className="signature-card__body">
                  <h3 className="signature-card__name">{product.name}</h3>
                  <p className="signature-card__desc">{product.description}</p>
                  <div className="signature-card__footer">
                    <span className="signature-card__price">{formatPrice(product.price)}</span>
                    <Link to="/shop" className="signature-card__arrow" aria-label={`View ${product.name}`}>
                      →
                    </Link>
                  </div>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
