import { Link } from 'react-router-dom'

export default function DeliveryPage() {
  return (
    <main className="page page--delivery">
      <div className="container">
        <header className="page-header page-header--center">
          <span className="section-label section-label--eyebrow">CHILLED TEMPERATURE GUARANTEE</span>
          <h1 className="page-title">DELIVERY INFORMATION</h1>
          <p className="page-desc">
            We take extreme care to ensure your chocolates arrive in pristine, melt-free condition.
          </p>
        </header>

        <div className="dose-delight" style={{ marginBottom: '48px' }}>
          <div className="dose-delight__stamp-wrap">
            <div className="dose-delight__basket-card">
              <img
                src="/images/products/Pistachio_Salankatia.jpg"
                alt="Delivery Insulated Pack"
                className="dose-delight__basket-img"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <div className="dose-delight__copy">
            <span className="section-label">MELT-PROOF PROMISE</span>
            <h2 className="dose-delight__title">
              THERMAL INSULATED COURIER PACKAGING
            </h2>
            <p className="dose-delight__desc">
              All deliveries are packed inside food-grade thermal insulation with reusable chilled ice packs.
              If your order suffers any heat damage during transit, we replace it immediately at zero cost.
            </p>
          </div>
        </div>

        <div className="signatures__grid" style={{ marginBottom: '80px' }}>
          <div className="signature-card" style={{ background: '#FAF0E4' }}>
            <span className="signature-card__tag">⚡ Express Delivery</span>
            <h3 className="signature-card__name">Same-Day Local Delivery</h3>
            <p className="signature-card__desc">Orders placed before 2 PM are delivered the same evening.</p>
            <span className="signature-card__price">₹150 (Free on ₹999+)</span>
          </div>

          <div className="signature-card" style={{ background: '#FDF4D8' }}>
            <span className="signature-card__tag">📦 Pan-India Shipping</span>
            <h3 className="signature-card__name">Chilled Air Shipping</h3>
            <p className="signature-card__desc">Fast 2-3 business day air express with temperature monitoring.</p>
            <span className="signature-card__price">₹200 (Free on ₹1,500+)</span>
          </div>

          <div className="signature-card" style={{ background: '#EAF0F4' }}>
            <span className="signature-card__tag">🎁 Gift Messaging</span>
            <h3 className="signature-card__name">Bespoke Handwritten Notes</h3>
            <p className="signature-card__desc">Complimentary gold embossed greeting card included with your gift.</p>
            <span className="signature-card__price">Free</span>
          </div>
        </div>
      </div>
    </main>
  )
}
