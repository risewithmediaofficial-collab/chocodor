import { ScrollReveal, StaggerContainer, StaggerItem } from '../ScrollReveal'
import { brand, instagramImages } from '../../data/content'
import { motion } from 'framer-motion'

export default function InstagramSection() {
  return (
    <section className="instagram-section" id="instagram">
      <div className="container">
        <ScrollReveal className="section-head section-head--center">
          <span className="section-label">COMMUNITY &amp; SOCIAL</span>
          <h2 className="section-title">A Taste of Choco D&apos;or.</h2>
          <p className="section-desc">
            Follow along for chocolate moments, new creations and everything sweet.
          </p>
        </ScrollReveal>

        <StaggerContainer className="instagram-section__grid">
          {instagramImages.map((item) => (
            <StaggerItem key={item.id}>
              <a
                href={brand.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="instagram-card"
              >
                <div className="instagram-card__image-wrap">
                  <motion.img
                    src={item.src}
                    alt={item.alt}
                    loading="lazy"
                    whileHover={{ scale: 1.08 }}
                    transition={{ duration: 0.4 }}
                  />
                  <div className="instagram-card__overlay">
                    <span className="instagram-card__icon">📷</span>
                    <span className="instagram-card__handle">{brand.instagramHandle}</span>
                  </div>
                </div>
              </a>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <ScrollReveal className="section-cta" delay={0.1}>
          <a
            href={brand.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline"
          >
            Follow {brand.instagramHandle} →
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}
