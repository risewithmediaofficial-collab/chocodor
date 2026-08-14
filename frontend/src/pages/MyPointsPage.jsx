import { Link } from 'react-router-dom'
import { useMouseTilt } from '../hooks/useMouseTilt'

export default function MyPointsPage() {
  const { ref, handleMove, handleLeave } = useMouseTilt(8)

  return (
    <main className="page page--royalty-sub">
      <div className="container">
        <header className="page-header page-header--center">
          <span className="section-label section-label--eyebrow">ROYALTY BALANCE</span>
          <h1 className="page-title">MY POINTS &amp; CARD</h1>
          <p className="page-desc">
            Your live Royalty points balance, transaction history, and digital card.
          </p>
        </header>

        {/* 3D Physical Card */}
        <div
          className="royalty-preview__card-wrap"
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          style={{ margin: '24px auto 48px' }}
        >
          <div ref={ref} className="royalty-card">
            <div className="royalty-card__shine" aria-hidden="true" />
            <div className="royalty-card__front">
              <div className="royalty-card__top">
                <div>
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
                  <span>👑 GOLD MEMBER</span>
                </div>
              </div>

              <div className="royalty-card__bottom">
                <div>
                  <span className="royalty-card__label">MEMBER NAME</span>
                  <span className="royalty-card__holder">VALUED GUEST</span>
                </div>
                <div>
                  <span className="royalty-card__label">POINTS BALANCE</span>
                  <span className="royalty-card__pts">1,450 PTS</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Points Summary Bento */}
        <div className="brand-craft__left-grid" style={{ maxWidth: '800px', margin: '0 auto 80px' }}>
          <div className="brand-craft__mini-card brand-craft__mini-card--cream">
            <div style={{ flex: 1 }}>
              <span className="brand-craft__sticker">AVAILABLE TO REDEEM</span>
              <h3 style={{ margin: '12px 0 4px', fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--cocoa-dark)' }}>
                1,450 Royalty Points
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Equivalent to ₹145 store credit on any order.
              </p>
            </div>
            <Link to="/royalty/rewards" className="btn btn--gold">
              Redeem Now →
            </Link>
          </div>

          <div className="brand-craft__mini-card brand-craft__mini-card--dark">
            <span className="brand-craft__dark-tag">TIER PROGRESS</span>
            <h3 className="brand-craft__dark-title">550 PTS TO DIAMOND TIER</h3>
            <p style={{ margin: '0 0 16px', color: 'rgba(250, 246, 240, 0.8)', fontSize: '0.9rem' }}>
              Diamond tier members receive free boutique tasting boxes every season.
            </p>
            <Link to="/shop" className="btn btn--outline" style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
              Shop To Earn More Points
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
