import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function TopBanner() {
  return (
    <motion.div
      className="top-banner"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="top-banner__inner container">
        <div className="top-banner__pills">
          <span className="top-banner__pill">🏷️ 15% Off on Orders Above ₹1,500</span>
          <span className="top-banner__pill">🍫 Handcrafted &amp; Tempered Fresh Daily</span>
          <span className="top-banner__pill">🎁 Complimentary Luxury Gift Packaging</span>
        </div>
        <div className="top-banner__royalty-cta">
          <span>👑 Join Choco D&apos;or Royalty &amp; Earn Rewards — </span>
          <Link to="/royalty" className="top-banner__link">
            Join Club →
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
