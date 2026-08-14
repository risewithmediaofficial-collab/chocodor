import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScrollReveal } from '../ScrollReveal'
import { useMouseTilt } from '../../hooks/useMouseTilt'
import { royaltySteps } from '../../data/content'

export default function RoyaltyPreview() {
  const { ref, handleMove, handleLeave } = useMouseTilt(10)
  const [memberName, setMemberName] = useState('VIP GUEST')
  const [isFlipped, setIsFlipped] = useState(false)

  return (
    <section className="royalty-preview" id="royalty-preview">
      <div className="royalty-preview__bg" aria-hidden="true" />

      <div className="container royalty-preview__inner">
        <ScrollReveal className="section-head section-head--center section-head--light">
          <span className="section-label section-label--gold">CHOCO D&apos;OR ROYALTY</span>
          <h2 className="section-title section-title--light">
            More Than Chocolate.
            <br />
            More to Enjoy.
          </h2>
          <p className="section-desc section-desc--light">
            Join the Choco D&apos;or Royalty and make every purchase a little more
            rewarding. Earn points, unlock rewards and enjoy more from every visit.
          </p>
        </ScrollReveal>

        {/* 3D Physical Royalty Card Showcase */}
        <ScrollReveal delay={0.15}>
          <div
            className="royalty-preview__card-wrap"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            onClick={() => setIsFlipped(!isFlipped)}
            title="Click to flip card"
          >
            <div ref={ref} className={`royalty-card ${isFlipped ? 'royalty-card--flipped' : ''}`}>
              <div className="royalty-card__shine" aria-hidden="true" />

              {/* Card Front */}
              <div className="royalty-card__front">
                <div className="royalty-card__top">
                  <div className="royalty-card__logo-wrap">
                    <span className="royalty-card__brand">CHOCO D&apos;OR</span>
                    <span className="royalty-card__tag">ROYALTY CLUB</span>
                  </div>
                  <div className="royalty-card__chip">
                    <div className="royalty-card__chip-lines" />
                  </div>
                </div>

                <div className="royalty-card__middle">
                  <span className="royalty-card__number">•••• •••• •••• 2026</span>
                  <div className="royalty-card__tier-badge">
                    <span>👑 BLACK GOLD TIER</span>
                  </div>
                </div>

                <div className="royalty-card__bottom">
                  <div>
                    <span className="royalty-card__label">MEMBER NAME</span>
                    <span className="royalty-card__holder">{memberName}</span>
                  </div>
                  <div className="royalty-card__points-counter">
                    <span className="royalty-card__label">POINTS BALANCE</span>
                    <span className="royalty-card__pts">1,250 PTS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="royalty-card__interactive-hint">✦ Hover &amp; move cursor to inspect physical card reflections</p>
        </ScrollReveal>

        <ScrollReveal className="royalty-preview__actions" delay={0.25}>
          <Link to="/royalty" className="btn btn--gold">
            Join Royalty
          </Link>
          <Link to="/royalty/points" className="btn btn--ghost">
            View My Card
          </Link>
        </ScrollReveal>

        {/* 3 Steps: EARN. REDEEM. ENJOY. */}
        <div className="royalty-steps-block">
          <ScrollReveal className="section-head section-head--center section-head--light">
            <h3 className="section-title section-title--light" style={{ fontSize: '1.75rem' }}>
              EARN. REDEEM. ENJOY.
            </h3>
          </ScrollReveal>

          <div className="royalty-steps__grid">
            {royaltySteps.map((item) => (
              <article key={item.step} className="step-card">
                <div className="step-card__header">
                  <span className="step-card__num">{item.step}</span>
                  <span className="step-card__icon">{item.icon}</span>
                </div>
                <h4 className="step-card__title">{item.title}</h4>
                <p className="step-card__desc">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
