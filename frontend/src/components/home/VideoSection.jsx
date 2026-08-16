import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScrollReveal } from '../ScrollReveal'

export default function VideoSection() {
  return (
    <section className="story" id="story-preview">
      <div className="container">
        <ScrollReveal>
          <div className="story__dark-panel">
            {/* Ambient Background Doodles */}
            <div className="story__doodle story__doodle--1" aria-hidden="true">
              <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10,90 Q50,10 90,90 M30,50 Q50,30 70,50" opacity="0.15" />
              </svg>
            </div>

            {/* Left Media / Video / Image Frame */}
            <div className="story__media-frame">
              <div className="story__media-inner">
                <img
                  src="/images/products/Matilda_Cake.jpg"
                  alt="Choco D'or signature decadent Matilda Chocolate Cake"
                  className="story__video-still"
                  loading="lazy"
                />
                <div className="story__media-badge">
                  <span className="story__media-badge-dot" />
                  <span>Artisan Atelier</span>
                </div>
              </div>
            </div>

            {/* Right Copy */}
            <div className="story__content">
              <div className="story__wifi-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0C14B" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                  <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                  <line x1="12" y1="20" x2="12.01" y2="20" />
                </svg>
              </div>

              <span className="section-label section-label--gold">THE CHOCO D&apos;OR MOMENT</span>

              <h2 className="story__title">
                WHY IS CHOCOLATE
                <br />
                CONSIDERED AS
                <br />
                AN ART FORM?
              </h2>

              <p className="story__desc">
                From single-origin bean selection to meticulous temperature tempering, every
                creation is balanced for silky texture, audibly crisp snaps, and unforgettable moments.
              </p>

              <div className="story__action">
                <Link to="/story" className="btn btn--gold">
                  Our Story →
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
