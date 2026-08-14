import { ScrollReveal } from '../ScrollReveal'

export default function BrandStatement() {
  return (
    <section className="brand-statement">
      <div className="brand-statement__overlay" aria-hidden="true" />
      <div className="container brand-statement__content">
        <ScrollReveal>
          <h2>
            Sweet Moments
            <br />
            Deserve Something Special.
          </h2>
          <p>Choco D&apos;or — made for sharing, celebrating and treating yourself.</p>
        </ScrollReveal>
      </div>
    </section>
  )
}
