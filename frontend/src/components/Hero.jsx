import { motion } from 'framer-motion'

export default function Hero() {
  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  }

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } },
  }

  return (
    <section className="hero" id="hero">
      <svg className="doodle doodle--star hero__doodle-1" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <svg className="doodle doodle--squiggle hero__doodle-2" viewBox="0 0 80 40" aria-hidden="true">
        <path d="M5 20 Q20 5 40 20 T75 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <div className="container hero__grid">
        <motion.div className="hero__copy" variants={stagger} initial="hidden" animate="visible">
          <motion.h1 className="hero__title" variants={fadeUp}>
            <span className="hero__line">TASTE THE</span>
            <span className="hero__line hero__line--main">
              CH
              <span className="hero__badge">RICH</span>
              OCL
              <span className="hero__badge hero__badge--alt">SMOOTH</span>
              ATES
            </span>
          </motion.h1>

          <motion.div className="hero__bottom" variants={fadeUp}>
            <p className="hero__desc">
              Premium handcrafted chocolates made with the finest cocoa — rich,
              velvety, and unforgettable in every bite.
            </p>
            <div className="hero__actions">
              <a href="#products" className="btn btn--gold">
                Order Now
              </a>
              <a href="#story" className="hero__link">
                Our Story <span aria-hidden="true">&gt;</span>
              </a>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero__visual"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="hero__product-card">
            <motion.img
              src="https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=700&q=85"
              alt="Choco D'or premium chocolate stack"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <svg className="doodle doodle--bean hero__doodle-3" viewBox="0 0 32 32" aria-hidden="true">
            <ellipse cx="16" cy="16" rx="10" ry="14" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(-20 16 16)" />
            <path d="M12 10 Q16 16 12 22" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </motion.div>
      </div>
    </section>
  )
}
