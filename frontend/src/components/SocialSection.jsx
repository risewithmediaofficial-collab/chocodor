import { ScrollReveal, StaggerContainer, StaggerItem } from './ScrollReveal'
import { socialImages } from '../data/content'

export default function SocialSection() {
  return (
    <section className="social" id="social">
      <div className="container">
        <ScrollReveal className="social__header">
          <span className="section-label">Follow the Taste</span>
          <h2 className="section-title">
            <a href="https://instagram.com/chocodor" target="_blank" rel="noopener noreferrer" className="social__handle">
              @chocodor
            </a>
          </h2>
        </ScrollReveal>

        <StaggerContainer className="social__grid" stagger={0.08}>
          {socialImages.map((src, i) => (
            <StaggerItem key={i}>
              <a
                href="https://instagram.com/chocodor"
                target="_blank"
                rel="noopener noreferrer"
                className="social__item"
              >
                <img src={src} alt={`Choco D'or on Instagram ${i + 1}`} loading="lazy" />
              </a>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <ScrollReveal className="social__cta-wrap" delay={0.2}>
          <a
            href="https://instagram.com/chocodor"
            target="_blank"
            rel="noopener noreferrer"
            className="story__link"
          >
            Follow Us <span aria-hidden="true">→</span>
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}
