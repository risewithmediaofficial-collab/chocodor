import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScrollReveal } from '../ScrollReveal'

export default function BrandCraftSection() {
  return (
    <section className="brand-craft" id="brand-craft">
      <div className="container">
        <ScrollReveal className="section-head section-head--between">
          <div>
            <h2 className="section-title">
              WHY CHOCO D&apos;OR 🍫
              <br />
              IS SO SPECIAL TO GUESTS?
            </h2>
          </div>
          <div>
            <Link to="/shop" className="btn btn--gold">
              Shop Now
            </Link>
          </div>
        </ScrollReveal>

        <div className="brand-craft__bento">
          {/* Left Mini Cards Grid */}
          <div className="brand-craft__left-grid">
            {/* Stack Card */}
            <div className="brand-craft__mini-card brand-craft__mini-card--cream">
              <img
                src="/images/products/Lotus_Biscoff_Cheese_Cake.jpg"
                alt="Choco D'or Lotus Biscoff Cheesecake"
                className="brand-craft__stack-img"
                loading="lazy"
                decoding="async"
              />
              <span className="brand-craft__sticker">★ FRESH DAILY</span>
            </div>

            {/* Dark Promo Card */}
            <div className="brand-craft__mini-card brand-craft__mini-card--dark">
              <span className="brand-craft__dark-tag">100% Cacao</span>
              <h3 className="brand-craft__dark-title">
                TASTE THE REAL
                <br />
                SINGLE-ORIGIN
                <br />
                CREATIONS.
              </h3>
              <span className="brand-craft__dark-price">₹1,200</span>
            </div>
          </div>

          {/* Right Chef Yellow Master Card */}
          <div className="brand-craft__chef-card">
            <div className="brand-craft__chef-image-wrap">
              <img
                src="/images/products/Burnt_Basque_Cheese_Cake.jpg"
                alt="Burnt Basque Cheese Cake at Choco D'or"
                className="brand-craft__chef-img"
                loading="lazy"
                decoding="async"
              />
              <span className="brand-craft__chef-badge">COMBO</span>
            </div>

            <div className="brand-craft__chef-quote">
              <p>
                &ldquo;Every dessert is crafted fresh in Krishnagiri to bring a touch of luxury and sweetness to your day.&rdquo;
              </p>
              <cite className="brand-craft__chef-author">— Choco D&apos;or Krishnagiri</cite>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
