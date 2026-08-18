import { useState } from 'react'
import { Link, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import {
  BadgePercent,
  BarChart3,
  Boxes,
  ChefHat,
  ClipboardList,
  ExternalLink,
  Gift,
  LayoutDashboard,
  LogOut,
  PanelsTopLeft,
  ReceiptText,
  ScrollText,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react'
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
    { label: 'Hold Bills', to: '/admin/hold-bills', icon: ReceiptText },
    { label: 'Stock Management', to: '/admin/stock', icon: Boxes },
    { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'POS / Billing', to: '/admin/pos', icon: ShoppingCart },
    { label: 'Live Orders', to: '/admin/orders', icon: ClipboardList },
    { label: 'KOT Kitchen', to: '/admin/kot', icon: ChefHat },
    { label: 'Operations', to: '/admin/operations', icon: PanelsTopLeft },
    { label: 'Products & Points', to: '/admin/products', icon: BadgePercent },
    { label: 'Customers & Loyalty', to: '/admin/customers', icon: Users },
    { label: 'Royalty Ledger', to: '/admin/royalty', icon: ScrollText },
    { label: 'Rewards Manager', to: '/admin/rewards', icon: Gift },
    { label: 'Reports & Analytics', to: '/admin/reports', icon: BarChart3 },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
  ]

  const currentItem = navItems.find((n) => location.pathname.startsWith(n.to)) || navItems[0]

  return (
    <div className="admin-container">
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
          <strong>{currentItem.label}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            to="/"
            target="_blank"
            className="btn btn--outline btn--sm"
            style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            Store <ExternalLink size={13} strokeWidth={2.2} />
          </Link>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="admin-mobile-overlay no-print"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

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
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`
                }
              >
                <span className="admin-nav-item__icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.1} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cocoa-dark)' }}>{admin.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{admin.email} ({admin.role})</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              to="/"
              target="_blank"
              className="btn btn--outline btn--sm"
              style={{ flex: 1, padding: '8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              Store <ExternalLink size={13} strokeWidth={2.2} />
            </Link>
            <button
              type="button"
              className="btn btn--sm"
              style={{ background: 'rgba(186,27,27,0.1)', color: '#BA1B1B', padding: '8px 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              onClick={logout}
            >
              <LogOut size={13} strokeWidth={2.2} /> Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
