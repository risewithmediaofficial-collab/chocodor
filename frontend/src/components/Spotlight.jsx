import { ScrollReveal } from './ScrollReveal'
import { useMouseTilt } from '../hooks/useMouseTilt'
import { spotlight, royaltyCallout } from '../data/content'

export default function Spotlight() {
  const { ref, handleMove, handleLeave } = useMouseTilt(6)

  return (
    <section className="spotlight" id="royalty">
      <div className="container spotlight__grid">
        <ScrollReveal className="spotlight__chef">
          <div className="spotlight__chef-card">
            <svg className="doodle doodle--bean spotlight__doodle-1" viewBox="0 0 32 32" aria-hidden="true">
              <ellipse cx="16" cy="16" rx="10" ry="14" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(-20 16 16)" />
            </svg>
            <svg className="doodle doodle--star spotlight__doodle-2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
            <img src={spotlight.image} alt={spotlight.author} loading="lazy" />
          </div>
        </ScrollReveal>

        <ScrollReveal className="spotlight__quote" delay={0.15}>
          <blockquote>
            <p>&ldquo;{spotlight.quote}&rdquo;</p>
            <footer>
              — {spotlight.author}, <cite>{spotlight.role}</cite>
            </footer>
          </blockquote>
        </ScrollReveal>

        <ScrollReveal className="spotlight__royalty" delay={0.25}>
          <div
            className="royalty-callout"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
          >
            <div ref={ref} className="royalty-callout__inner">
              <div className="royalty-callout__text">
                <h3>{royaltyCallout.title}</h3>
                <span className="royalty-callout__price">{royaltyCallout.price}</span>
                <a href="#" className="btn btn--gold btn--sm">
                  Join Now
                </a>
              </div>
              <div className="royalty-callout__image">
                <img src={royaltyCallout.image} alt="Choco D'or Royalty rewards" loading="lazy" />
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
