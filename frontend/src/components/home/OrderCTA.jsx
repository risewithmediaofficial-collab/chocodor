import { Link } from 'react-router-dom'
import { ScrollReveal } from '../ScrollReveal'

export default function OrderCTA() {
  return (
    <section className="order-cta">
      <div className="container">
        <ScrollReveal className="order-cta__inner">
          <h2>Ready for Something Sweet?</h2>
          <p>
            Choose your favourites and have your Choco D&apos;or order ready for the
            moment.
          </p>
          <Link to="/shop" className="btn btn--gold">
            Order Now
          </Link>
        </ScrollReveal>
      </div>
    </section>
  )
}
