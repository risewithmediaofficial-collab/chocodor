import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFoundPage() {
  return (
    <main className="page page--404" style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 20px' }}>
      <div className="container" style={{ maxWidth: '520px' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            background: '#FFFFFF',
            borderRadius: '28px',
            padding: '48px 32px',
            boxShadow: '0 20px 60px rgba(43, 23, 18, 0.1)',
            border: '1px solid rgba(61, 37, 30, 0.08)',
          }}
        >
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '16px' }}>🍫</span>
          <span className="section-label section-label--eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
            ERROR 404
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cocoa-dark)', margin: '0 0 12px' }}>
            Dessert Not Found
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, marginBottom: '28px' }}>
            The page you are looking for does not exist or has been moved. Explore our artisanal menu or return home.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn--outline btn--sm" style={{ padding: '12px 20px' }}>
              Home Page
            </Link>
            <Link to="/menu" className="btn btn--gold btn--sm" style={{ padding: '12px 24px', fontWeight: 800 }}>
              Explore Menu →
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
