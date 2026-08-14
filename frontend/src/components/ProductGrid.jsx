import { ScrollReveal, StaggerContainer, StaggerItem } from './ScrollReveal'
import { dailyProducts, formatPrice } from '../data/content'

export default function ProductGrid() {
  return (
    <section className="products" id="products">
      <div className="container">
        <ScrollReveal className="products__header">
          <h2 className="products__title">
            Products We Craft
            <br />
            Here Daily<span className="products__dash">—</span>
          </h2>
        </ScrollReveal>

        <StaggerContainer className="products__grid" stagger={0.1}>
          {dailyProducts.map((product) => (
            <StaggerItem key={product.id}>
              <article className="product-tile" data-cursor="view">
                <div className="product-tile__visual" style={{ background: product.bg }}>
                  <svg className="doodle doodle--star product-tile__doodle" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  <img src={product.image} alt={product.name} loading="lazy" />
                </div>
                <div className="product-tile__meta">
                  <h3>{product.name}</h3>
                  <span>{formatPrice(product.price)}</span>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <ScrollReveal className="products__cta" delay={0.15}>
          <a href="#" className="btn btn--outline">View All Chocolates</a>
        </ScrollReveal>
      </div>
    </section>
  )
}
