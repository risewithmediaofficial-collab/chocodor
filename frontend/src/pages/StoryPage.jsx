import { Link } from 'react-router-dom'
import { ScrollReveal } from '../components/ScrollReveal'

export default function StoryPage() {
  return (
    <main className="page page--story">
      <div className="container">
        {/* Page Header */}
        <header className="page-header page-header--center">
          <span className="section-label section-label--eyebrow">OUR CRAFT &amp; PHILOSOPHY</span>
          <h1 className="page-title">THE CHOCO D&apos;OR STORY</h1>
          <p className="page-desc">
            Crafted for the moments worth remembering. Every batch tempered fresh, every recipe
            perfected with pure single-origin cacao.
          </p>
        </header>

        {/* Master Dark Bento Card */}
        <div className="story__dark-panel" style={{ marginBottom: '64px' }}>
          <div className="story__media-frame">
            <div className="story__media-inner">
              <img
                src="/images/products/Matilda_Cake.jpg"
                alt="Choco D'or boutique chocolatier kitchen"
                className="story__video-still"
                loading="lazy"
                decoding="async"
              />
              <div className="story__media-badge">
                <span className="story__media-badge-dot" />
                <span>Atelier Master Class</span>
              </div>
            </div>
          </div>

          <div className="story__content">
            <span className="section-label section-label--gold">PURSUIT OF PERFECTION</span>
            <h2 className="story__title">
              WHERE CULINARY PASSION
              <br />
              MEETS MASTER TEMPERING.
            </h2>
            <p className="story__desc">
              We source only ethically harvested, single-origin cacao beans from the fertile soils of
              Ghana and Ecuador. Paired with slow stone grinding and traditional French tempering methods,
              each creation produces a silky melt-in-the-mouth sensation with a signature crisp snap.
            </p>
            <Link to="/shop" className="btn btn--gold">
              Explore The Collection →
            </Link>
          </div>
        </div>

        {/* Bento Details Grid */}
        <div className="brand-craft__bento" style={{ marginBottom: '80px' }}>
          <div className="brand-craft__left-grid">
            <div className="brand-craft__mini-card brand-craft__mini-card--cream">
              <img
                src="/images/products/Pistachio_Salankatia.jpg"
                alt="Single Origin cacao"
                className="brand-craft__stack-img"
                loading="lazy"
                decoding="async"
              />
              <span className="brand-craft__sticker">★ 100% PURE COUVERTURE</span>
            </div>

            <div className="brand-craft__mini-card brand-craft__mini-card--dark">
              <span className="brand-craft__dark-tag">Ethical Craft</span>
              <h3 className="brand-craft__dark-title">
                TEMPERED
                <br />
                FRESH EVERY
                <br />
                SINGLE MORNING.
              </h3>
              <span className="brand-craft__dark-price">Krishnagiri</span>
            </div>
          </div>

          <div className="brand-craft__chef-card">
            <div className="brand-craft__chef-image-wrap">
              <img
                src="/images/products/Burnt_Basque_Cheese_Cake.jpg"
                alt="Artisanal Confectionery Craft at Choco D'or"
                className="brand-craft__chef-img"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="brand-craft__chef-quote">
              <p>
                &ldquo;From warm crispy waffles and layered Salankatia to signature Matilda cakes, our passion is creating memorable sweet moments.&rdquo;
              </p>
              <cite className="brand-craft__chef-author">— Choco D&apos;or Krishnagiri</cite>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
