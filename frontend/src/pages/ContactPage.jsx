import { brand } from '../data/content'

export default function ContactPage() {
  return (
    <main className="page page--contact">
      <div className="container">
        <header className="page-header page-header--center">
          <span className="section-label section-label--eyebrow">CUSTOMER CARE &amp; CONCIERGE</span>
          <h1 className="page-title">GET IN TOUCH</h1>
          <p className="page-desc">
            We are here to assist you with bespoke chocolate gifting, corporate orders, or order enquiries.
          </p>
        </header>

        <div className="brand-craft__bento" style={{ marginBottom: '80px' }}>
          <div className="brand-craft__left-grid">
            <div className="brand-craft__mini-card brand-craft__mini-card--cream">
              <div>
                <span className="brand-craft__sticker">INSTAGRAM CONCIERGE</span>
                <h3 style={{ margin: '12px 0 6px', fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cocoa-dark)' }}>
                  {brand.instagramHandle}
                </h3>
                <p style={{ margin: '0 0 14px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Direct message us for immediate responses, custom hampers, and flavour recommendations.
                </p>
                <a href={brand.instagram} target="_blank" rel="noopener noreferrer" className="btn btn--gold">
                  Message on Instagram →
                </a>
              </div>
            </div>

            <div className="brand-craft__mini-card brand-craft__mini-card--dark">
              <span className="brand-craft__dark-tag">BOUTIQUE ADDRESS &amp; HOURS</span>
              <h3 className="brand-craft__dark-title" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                Royakottai flyover, near SBI Bank, Londenpet, Krishnagiri, Bayanapalli, Tamil Nadu 635001
              </h3>
              <p style={{ margin: '0 0 6px', color: 'var(--caramel)', fontSize: '0.95rem', fontWeight: 800 }}>
                📞 Call: +91 94880 54036
              </p>
              <p style={{ margin: 0, color: 'rgba(250, 246, 240, 0.8)', fontSize: '0.85rem' }}>
                Open 7 Days a Week: 10:00 AM – 10:00 PM • Fresh batches baked daily.
              </p>
            </div>
          </div>

          <div className="brand-craft__chef-card" style={{ background: '#FAF0E4' }}>
            <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--cocoa-dark)' }}>
              Send an Enquiry
            </h3>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                placeholder="Your Name"
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid rgba(61,37,30,0.15)',
                  background: '#FFFFFF',
                  fontFamily: 'inherit',
                }}
              />
              <input
                type="email"
                placeholder="Email or Phone Number"
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid rgba(61,37,30,0.15)',
                  background: '#FFFFFF',
                  fontFamily: 'inherit',
                }}
              />
              <textarea
                placeholder="How can we make your chocolate moment special?"
                rows={3}
                style={{
                  padding: '14px 18px',
                  borderRadius: '16px',
                  border: '1px solid rgba(61,37,30,0.15)',
                  background: '#FFFFFF',
                  fontFamily: 'inherit',
                  resize: 'none',
                }}
              />
              <button type="submit" className="btn btn--gold btn--full">
                Submit Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
