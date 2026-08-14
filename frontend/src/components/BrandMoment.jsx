import { ScrollReveal } from './ScrollReveal'

export default function BrandMoment() {
  return (
    <section className="brand-moment">
      <div
        className="brand-moment__texture"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1511381939415-e44015466834?w=1600&q=60)',
        }}
        aria-hidden="true"
      />
      <div className="brand-moment__overlay" aria-hidden="true" />

      <div className="container brand-moment__content">
        <ScrollReveal>
          <h2 className="brand-moment__title">
            Sweet Moments.
            <br />
            Crafted Beautifully.
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <p className="brand-moment__text">
            Because the finest chocolates deserve the finest occasions.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
