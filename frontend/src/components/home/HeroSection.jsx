import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { brand } from '../../data/content'

export default function HeroSection() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 25, stiffness: 120 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)

  const rotateX = useTransform(y, [-300, 300], [3, -3])
  const rotateY = useTransform(x, [-300, 300], [-3, 3])
  const floatY1 = useTransform(y, [-300, 300], [-8, 8])

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetX = e.clientX - (rect.left + rect.width / 2)
    const offsetY = e.clientY - (rect.top + rect.height / 2)
    mouseX.set(offsetX)
    mouseY.set(offsetY)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <section className="hero" id="hero" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div className="container hero__grid">
        {/* Left Copy */}
        <motion.div
          className="hero__copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="section-label section-label--eyebrow">{brand.name.toUpperCase()}</span>

          <h1 className="hero__title">
            A LITTLE LUXURY
            <br />
            IN EVERY BITE.
          </h1>

          <p className="hero__desc">
            Discover beautifully crafted chocolates made for everyday indulgence,
            thoughtful gifting and unforgettable moments.
          </p>

          <div className="hero__actions">
            <Link to="/shop" className="btn btn--gold">
              Shop Now
            </Link>
          </div>
        </motion.div>

        {/* Right Visual / Bento */}
        <motion.div
          className="hero__visual-container"
          style={{ rotateX, rotateY }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="hero__bento-card">
            <div className="hero__bento-image-wrap">
              <img
                src="/images/products/Pistachio_Salankatia.jpg"
                alt="Choco D'or luxury artisanal Pistachio Salankatia"
                className="hero__main-image"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Circular Stamp Badge */}
            <motion.div
              className="hero__stamp"
              style={{ y: floatY1 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            >
              <svg viewBox="0 0 120 120" className="hero__stamp-svg">
                <path
                  id="circlePath"
                  d="M 60, 60 m -45, 0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0"
                  fill="none"
                />
                <text className="hero__stamp-text">
                  <textPath href="#circlePath" startOffset="0%">
                    ★ CHOCO D&apos;OR LUXURY ★ HANDCRAFTED ★
                  </textPath>
                </text>
              </svg>
              <div className="hero__stamp-center">🍫</div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
