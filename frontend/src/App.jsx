import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import AuthModal from './components/AuthModal'
import Layout from './components/Layout'

// Lazy Loaded Customer Pages
const HomePage = lazy(() => import('./pages/HomePage'))
const MenuPage = lazy(() => import('./pages/MenuPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const RoyaltyPage = lazy(() => import('./pages/RoyaltyPage'))
const QRScanLoginPage = lazy(() => import('./pages/QRScanLoginPage'))
const StoryPage = lazy(() => import('./pages/StoryPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const DeliveryPage = lazy(() => import('./pages/DeliveryPage'))
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

// Lazy Loaded Admin Pages
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminPOSPage = lazy(() => import('./pages/admin/AdminPOSPage'))
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'))
const AdminOrderDetailPage = lazy(() => import('./pages/admin/AdminOrderDetailPage'))
const AdminKOTPage = lazy(() => import('./pages/admin/AdminKOTPage'))
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'))
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage'))
const AdminRoyaltyPage = lazy(() => import('./pages/admin/AdminRoyaltyPage'))
const AdminRewardsPage = lazy(() => import('./pages/admin/AdminRewardsPage'))
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'))

// Premium Suspense Fallback Loader
function PageLoadingFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
      <div className="pulse-indicator" style={{ width: '16px', height: '16px' }} />
      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--caramel)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Choco D&apos;or Artisanal Experience
      </span>
    </div>
  )
}

export default function App() {
  return (
    <AdminAuthProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AuthModal />
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {/* Customer Portal */}
                <Route element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="menu" element={<MenuPage />} />
                  <Route path="menu/:id" element={<ProductDetailPage />} />
                  <Route path="shop" element={<MenuPage />} />
                  <Route path="product/:id" element={<ProductDetailPage />} />
                  <Route path="cart" element={<CartPage />} />
                  <Route path="checkout" element={<CheckoutPage />} />
                  <Route path="account" element={<AccountPage />} />
                  <Route path="royalty" element={<RoyaltyPage />} />
                  <Route path="royalty/rewards" element={<RoyaltyPage />} />
                  <Route path="royalty/points" element={<RoyaltyPage />} />
                  <Route path="royalty/scan/:token" element={<QRScanLoginPage />} />
                  <Route path="story" element={<StoryPage />} />
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="delivery" element={<DeliveryPage />} />
                  <Route path="order-tracking" element={<OrderTrackingPage />} />
                  <Route path="orders/:orderNumber" element={<OrderTrackingPage />} />
                  <Route path="login" element={<AuthPage mode="login" />} />
                  <Route path="signin" element={<AuthPage mode="login" />} />
                  <Route path="register" element={<AuthPage mode="register" />} />
                  <Route path="signup" element={<AuthPage mode="register" />} />
                  <Route path="auth" element={<AuthPage mode="login" />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Admin & POS Portal */}
                <Route path="admin/login" element={<AdminLoginPage />} />
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="pos" element={<AdminPOSPage />} />
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="orders/:id" element={<AdminOrderDetailPage />} />
                  <Route path="kot" element={<AdminKOTPage />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="customers" element={<AdminCustomersPage />} />
                  <Route path="royalty" element={<AdminRoyaltyPage />} />
                  <Route path="rewards" element={<AdminRewardsPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </AdminAuthProvider>
  )
}
