import { ScrollReveal, StaggerContainer, StaggerItem } from './ScrollReveal'
import { delight, featured, categories, formatPrice } from '../data/content'

export default function FeaturedSection() {
  return (
    <section className="featured" id="featured">
      <div className="container">
        <ScrollReveal>
          <h2 className="featured__title">{delight.title}</h2>
        </ScrollReveal>

        <div className="featured__layout">
          <ScrollReveal className="featured__image-wrap" delay={0.1}>
            <div className="featured__image-card">
              <img src={delight.image} alt={delight.imageAlt} loading="lazy" />
            </div>
          </ScrollReveal>

          <ScrollReveal className="featured__card-wrap" delay={0.2}>
            <article className="featured-item">
              <span className="featured-item__tag">{featured.tag}</span>
              <div className="featured-item__image">
                <img src={featured.image} alt={featured.name} loading="lazy" />
              </div>
              <div className="featured-item__info">
                <h3>{featured.name}</h3>
                <span>{formatPrice(featured.price)}</span>
              </div>
            </article>
          </ScrollReveal>
        </div>

        <StaggerContainer className="category-pills" stagger={0.06}>
          {categories.map((cat) => (
            <StaggerItem key={cat.id}>
              <button
                type="button"
                className="category-pill"
                style={{ background: cat.color, color: cat.text }}
              >
                {cat.label} <span>{cat.count}</span>
              </button>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
