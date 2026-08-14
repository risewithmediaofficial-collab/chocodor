import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../data/content'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { customer, royalty, openLogin } = useAuth()
  const { items, totalCount, updateQuantity, removeFromCart, quote, cartDrawerOpen, setCartDrawerOpen } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    document.body.style.overflow = menuOpen || cartDrawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen, cartDrawerOpen])

  const links = [
    { label: 'Home', to: '/' },
    { label: 'Menu', to: '/menu' },
    { label: 'Royalty', to: '/royalty' },
    { label: 'My Orders', to: customer ? '/account?tab=orders' : '/order-tracking' },
    { label: 'Our Story', to: '/story' },
    { label: 'Contact', to: '/contact' },
  ]

  return (
    <>
      <motion.header
        className="navbar"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1 }}
      >
        <div className="navbar__container">
          {/* Left: Logo */}
          <Link to="/" className="navbar__logo">
            <span className="navbar__logo-icon">🍫</span>
            CHOCO D&apos;OR<span className="navbar__dot">.</span>
          </Link>

          {/* Center: Clean Nav Links */}
          <nav className="navbar__center" aria-label="Main">
            {links.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  `navbar__link ${isActive ? 'navbar__link--active' : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Account & Cart Actions */}
          <div className="navbar__actions">
            {customer ? (
              <Link to="/account" className="navbar__user-pill" title="My Account & Royalty Card">
                <span className="navbar__user-avatar">{customer.name.charAt(0).toUpperCase()}</span>
                <div className="navbar__user-info">
                  <span className="navbar__user-name">{customer.name.split(' ')[0]}</span>
                  {royalty && (
                    <span className="navbar__user-pts">👑 {royalty.currentPoints} pts</span>
                  )}
                </div>
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={openLogin}
              >
                Sign In
              </button>
            )}

            <button
              type="button"
              className="navbar__icon-btn"
              aria-label="Cart"
              onClick={() => setCartDrawerOpen(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {totalCount > 0 && <span className="navbar__cart-badge">{totalCount}</span>}
            </button>

            <button
              type="button"
              className="navbar__menu-btn"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Slide-out Quick Cart Drawer */}
      <AnimatePresence>
        {cartDrawerOpen && (
          <div className="cart-drawer-overlay" onClick={() => setCartDrawerOpen(false)}>
            <motion.div
              className="cart-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cart-drawer__header">
                <h3>Your Chocolate Bag ({totalCount})</h3>
                <button
                  type="button"
                  className="cart-drawer__close"
                  onClick={() => setCartDrawerOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="cart-drawer__items">
                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>🍫</span>
                    <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--cocoa-dark)', margin: '0 0 8px' }}>
                      Your bag is empty
                    </p>
                    <p style={{ fontSize: '0.85rem', margin: '0 0 20px' }}>
                      Explore our handcrafted waffles, cakes and layered Salankatia.
                    </p>
                    <Link
                      to="/menu"
                      className="btn btn--gold btn--sm"
                      onClick={() => setCartDrawerOpen(false)}
                    >
                      Browse Menu →
                    </Link>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.productId || item.id} className="cart-item">
                      <img src={item.image} alt={item.name} className="cart-item__img" />
                      <div className="cart-item__details">
                        <h4>{item.name}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                          <span className="cart-item__price">{formatPrice(item.price * item.quantity)}</span>
                          <span style={{ fontSize: '11px', color: '#B37B24', fontWeight: 800 }}>
                            +{item.royaltyPoints * item.quantity} pts
                          </span>
                        </div>
                        <div className="cart-item__qty-controls">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId || item.id, item.quantity - 1)}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId || item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="cart-item__remove"
                            onClick={() => removeFromCart(item.productId || item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="cart-drawer__footer">
                  <div className="cart-drawer__subtotal">
                    <span>Subtotal</span>
                    <strong>{formatPrice(quote.subtotal)}</strong>
                  </div>

                  {quote.totalRoyaltyPoints > 0 && (
                    <div className="cart-drawer__perk">
                      👑 +{quote.totalRoyaltyPoints} Royalty Points to be earned on delivery!
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <Link
                      to="/cart"
                      className="btn btn--outline"
                      style={{ flex: 1, padding: '12px' }}
                      onClick={() => setCartDrawerOpen(false)}
                    >
                      View Cart
                    </Link>
                    <button
                      type="button"
                      className="btn btn--gold"
                      style={{ flex: 1.5, padding: '12px' }}
                      onClick={() => {
                        setCartDrawerOpen(false)
                        navigate('/checkout')
                      }}
                    >
                      Checkout →
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {menuOpen && (
          <div className="mobile-nav-overlay" onClick={() => setMenuOpen(false)}>
            <motion.div
              className="mobile-nav"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <nav aria-label="Mobile">
                {links.map((link) => (
                  <NavLink
                    key={link.label}
                    to={link.to}
                    className="mobile-nav__link"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </NavLink>
                ))}

                {customer ? (
                  <Link
                    to="/account"
                    className="mobile-nav__link"
                    style={{ color: 'var(--caramel)' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    My Account ({royalty ? `${royalty.currentPoints} pts` : customer.name})
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="btn btn--gold mobile-nav__cta"
                    onClick={() => {
                      setMenuOpen(false)
                      openLogin()
                    }}
                  >
                    Sign In / Join Royalty
                  </button>
                )}
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
