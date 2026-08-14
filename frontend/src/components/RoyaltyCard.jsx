import { motion } from 'framer-motion'
import { ScrollReveal } from './ScrollReveal'
import { useMouseTilt } from '../hooks/useMouseTilt'

export default function RoyaltyCard() {
  const { ref, handleMove, handleLeave } = useMouseTilt(8)

  return (
    <section className="royalty" id="royalty">
      <div className="royalty__bg" aria-hidden="true" />

      <div className="container royalty__inner">
        <ScrollReveal className="royalty__header">
          <span className="section-label section-label--light">Membership</span>
          <h2 className="section-title section-title--light">
            Discover the
            <br />
            Choco D&apos;or Royalty
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div
            className="royalty__card-wrap"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
          >
            <motion.div
              ref={ref}
              className="royalty-card"
              initial={{ opacity: 0, rotateY: -12, y: 40 }}
              whileInView={{ opacity: 1, rotateY: 0, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="royalty-card__shine" aria-hidden="true" />
              <div className="royalty-card__top">
                <span className="royalty-card__brand">Choco D&apos;or</span>
                <span className="royalty-card__tier">Royalty</span>
              </div>
              <div className="royalty-card__middle">
                <span className="royalty-card__label">Member</span>
                <span className="royalty-card__dots">•••• ••••</span>
              </div>
              <div className="royalty-card__bottom">
                <span className="royalty-card__points">2,450 pts</span>
                <span className="royalty-card__gold-line" aria-hidden="true" />
              </div>
            </motion.div>
          </div>
        </ScrollReveal>

        <ScrollReveal className="royalty__copy" delay={0.35}>
          <p className="royalty__tagline">Earn. Enjoy. Repeat.</p>
          <p className="royalty__desc">
            Exclusive rewards, special treats and more moments to celebrate.
          </p>
          <a href="#" className="btn btn--gold royalty__cta">
            Join Now
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}
