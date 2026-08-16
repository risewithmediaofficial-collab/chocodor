import { useState } from 'react'
import { Link, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'
import logoImg from '../../assets/logo.jpg'

export default function AdminLayout() {
  const { admin, loading, logout } = useAdminAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pulse-indicator" style={{ width: '18px', height: '18px' }} />
      </div>
    )
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />
  }

  const navItems = [
    { label: '📊 Dashboard', to: '/admin/dashboard' },
    { label: '⚡ POS / Billing', to: '/admin/pos' },
    { label: '🛵 Live Orders', to: '/admin/orders' },
    { label: '🍳 KOT Kitchen', to: '/admin/kot' },
    { label: '🍫 Products & Points', to: '/admin/products' },
    { label: '👥 Customers & Royalty', to: '/admin/customers' },
    { label: '📜 Royalty Ledger', to: '/admin/royalty' },
    { label: '🎁 Rewards Manager', to: '/admin/rewards' },
    { label: '📈 Reports & Analytics', to: '/admin/reports' },
    { label: '⚙️ Settings', to: '/admin/settings' },
  ]

  const currentItem = navItems.find((n) => location.pathname.startsWith(n.to)) || navItems[0]

  return (
    <div className="admin-container">
      {/* Mobile Top Navigation Bar */}
      <header className="admin-mobile-header no-print">
        <button
          type="button"
          className="admin-mobile-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          <span className="admin-mobile-hamburger__line" />
          <span className="admin-mobile-hamburger__line" />
          <span className="admin-mobile-hamburger__line" />
        </button>

        <div className="admin-mobile-header__title">
          <img
            src={logoImg}
            alt="Choco D'or"
            style={{ width: '26px', height: '26px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <strong>{currentItem.label.replace(/^[\uD800-\uDBFF\uDC00-\uDFFF\s]+/, '')}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            to="/"
            target="_blank"
            className="btn btn--outline btn--sm"
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            Store ↗
          </Link>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="admin-mobile-overlay no-print"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Responsive drawer on mobile, sticky on desktop) */}
      <aside className={`admin-sidebar no-print ${mobileMenuOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__brand">
          <img
            src={logoImg}
            alt="Choco D'or"
            style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }}
          />
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', margin: 0, color: 'var(--cocoa-dark)' }}>
              Choco D&apos;or
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
              ENTERPRISE POS &amp; STORE
            </span>
          </div>
        </div>

        <nav className="admin-sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cocoa-dark)' }}>{admin.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{admin.email} ({admin.role})</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/" target="_blank" className="btn btn--outline btn--sm" style={{ flex: 1, padding: '8px', fontSize: '11px' }}>
              Store ↗
            </Link>
            <button
              type="button"
              className="btn btn--sm"
              style={{ background: 'rgba(186,27,27,0.1)', color: '#BA1B1B', padding: '8px 12px', fontSize: '11px' }}
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
