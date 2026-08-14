import { useState } from 'react'
import { ScrollReveal, StaggerContainer, StaggerItem } from './ScrollReveal'
import { signatures, categories } from '../data/content'

function formatPrice(price) {
  return `₹${price.toLocaleString('en-IN')}`
}

export default function SignatureCollection() {
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered =
    activeCategory === 'All'
      ? signatures
      : signatures.filter((p) => {
          if (activeCategory === 'Gift Boxes') return p.name.includes('Box')
          if (activeCategory === 'Truffles') return p.name.includes('Truffle') || p.name.includes('Praline')
          return !p.name.includes('Box') && !p.name.includes('Truffle')
        })

  return (
    <section className="signatures" id="signatures">
      <div className="container">
        <ScrollReveal className="signatures__header">
          <span className="section-label">Our Signatures</span>
          <h2 className="section-title">Crafted to Impress</h2>
        </ScrollReveal>

        <ScrollReveal className="explore" delay={0.1}>
          <span className="explore__label">Explore</span>
          <div className="explore__filters" role="tablist" aria-label="Product categories">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat}
                className={`explore__pill ${activeCategory === cat ? 'explore__pill--active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <StaggerContainer className="signatures__grid" key={activeCategory}>
          {filtered.map((product) => (
            <StaggerItem key={product.id}>
              <article
                className={`signature-card ${product.featured ? 'signature-card--featured' : ''}`}
                data-cursor="view"
              >
                <div className="signature-card__image-wrap">
                  <img src={product.image} alt={product.name} className="signature-card__image" loading="lazy" />
                </div>
                <div className="signature-card__body">
                  <h3 className="signature-card__name">{product.name}</h3>
                  <p className="signature-card__desc">{product.description}</p>
                  <div className="signature-card__footer">
                    <span className="signature-card__price">{formatPrice(product.price)}</span>
                    <span className="signature-card__arrow" aria-hidden="true">
                      →
                    </span>
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
