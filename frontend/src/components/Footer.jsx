import { Link } from 'react-router-dom'
import { footerLinks, brand } from '../data/content'
import logoImg from '../assets/logo.jpg'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__inner">
          <div className="footer__brand">
            <Link to="/" className="footer__logo">
              <img src={logoImg} alt="Choco D'or" className="footer__logo-img" />
              <span>CHOCO D&apos;OR</span>
            </Link>
          </div>

          <nav className="footer__col" aria-label="Shop">
            <span className="footer__col-title">Shop</span>
            {footerLinks.shop.map((link) => (
              <Link key={link.label} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>

          <nav className="footer__col" aria-label="Royalty">
            <span className="footer__col-title">Royalty</span>
            {footerLinks.royalty.map((link) => (
              <Link key={link.label} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>

          <nav className="footer__col" aria-label="Help">
            <span className="footer__col-title">Help</span>
            {footerLinks.help.map((link) => (
              <Link key={link.label} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>

          <nav className="footer__col footer__col--boutique" aria-label="Visit Boutique">
            <span className="footer__col-title">Visit Boutique</span>
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'rgba(250, 246, 240, 0.8)', lineHeight: 1.5 }}>
              Royakottai flyover, near SBI Bank, Londenpet, Krishnagiri, Bayanapalli, Tamil Nadu 635001
            </p>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--gold)', fontWeight: 700 }}>
              📞 +91 94880 54036
            </p>
            {footerLinks.follow.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <p className="footer__copy">
          &copy; 2026 {brand.name}. Royakottai flyover, near SBI Bank, Londenpet, Krishnagiri — 635001. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
