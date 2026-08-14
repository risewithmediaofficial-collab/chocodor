import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const navigate = useNavigate()

  if (!admin) {
    navigate('/admin/login')
    return null
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

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar no-print">
        <div className="admin-sidebar__brand">
          <span style={{ fontSize: '1.6rem' }}>🍫</span>
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
