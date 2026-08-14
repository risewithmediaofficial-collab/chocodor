import { useRef } from 'react'
import { ScrollReveal, StaggerContainer, StaggerItem } from './ScrollReveal'
import { bestSellers } from '../data/content'

function formatPrice(price) {
  return `₹${price.toLocaleString('en-IN')}`
}

export default function BestSellers() {
  const trackRef = useRef(null)

  const scroll = (direction) => {
    if (!trackRef.current) return
    const amount = trackRef.current.offsetWidth * 0.75
    trackRef.current.scrollBy({ left: direction * amount, behavior: 'smooth' })
  }

  return (
    <section className="bestsellers" id="bestsellers">
      <div className="container">
        <ScrollReveal className="bestsellers__header">
          <span className="section-label">Favourites</span>
          <h2 className="section-title">From Choco D&apos;or</h2>
        </ScrollReveal>

        <div className="bestsellers__carousel">
          <button
            type="button"
            className="bestsellers__nav bestsellers__nav--prev"
            aria-label="Previous products"
            onClick={() => scroll(-1)}
          >
            ←
          </button>

          <StaggerContainer className="bestsellers__track" stagger={0.1}>
            <div className="bestsellers__scroll" ref={trackRef}>
              {bestSellers.map((product) => (
                <StaggerItem key={product.id}>
                  <article className="product-card" data-cursor="view">
                    <div className="product-card__image-wrap">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="product-card__image"
                        loading="lazy"
                      />
                      <div className="product-card__hover">
                        <span className="product-card__price">{formatPrice(product.price)}</span>
                      </div>
                    </div>
                    <h3 className="product-card__name">{product.name}</h3>
                    <span className="product-card__arrow" aria-hidden="true">
                      →
                    </span>
                  </article>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>

          <button
            type="button"
            className="bestsellers__nav bestsellers__nav--next"
            aria-label="Next products"
            onClick={() => scroll(1)}
          >
            →
          </button>
        </div>

        <ScrollReveal className="bestsellers__cta-wrap" delay={0.2}>
          <a href="#" className="btn btn--outline">
            View All Chocolates
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}
