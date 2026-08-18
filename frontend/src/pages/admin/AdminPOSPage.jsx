import { useState, useEffect } from 'react'
import { apiRequest } from '../../api/client'
import { formatPrice } from '../../data/content'
import InvoiceModal from '../../components/InvoiceModal'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

import { PRODUCTS, CATEGORIES } from '../../data/products'

export default function AdminPOSPage() {
  const [categories, setCategories] = useState(CATEGORIES)
  const [products, setProducts] = useState(PRODUCTS)
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [productSearch, setProductSearch] = useState('')
  const [onlyTodayMenu, setOnlyTodayMenu] = useState(true)

  // Customer State (Step 1 of POS)
  const [customerName, setCustomerName] = useState('')
  const [customerMobile, setCustomerMobile] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [custModalOpen, setCustModalOpen] = useState(false)

  // Billing Cart State
  const [cartItems, setCartItems] = useState([])
  const [orderType, setOrderType] = useState('DINE_IN')
  const [tableNo, setTableNo] = useState('Table 1')
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [isSplitPayment, setIsSplitPayment] = useState(false)
  const [splitCash, setSplitCash] = useState('')
  const [splitUpi, setSplitUpi] = useState('')
  const [splitCard, setSplitCard] = useState('')
  const [notes, setNotes] = useState('')

  // Completed Order & QR Pass State
  const [completedData, setCompletedData] = useState(null)
  const [activeInvoiceNumber, setActiveInvoiceNumber] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useBodyScrollLock(Boolean(completedData || activeInvoiceNumber || custModalOpen))

  // Load Menu Data
  useEffect(() => {
    async function loadData() {
      try {
        const prodData = await apiRequest('/products')
        if (prodData && prodData.products && prodData.products.length > 0) {
          setProducts(prodData.products)
        }
        if (prodData && prodData.categories && prodData.categories.length > 0) {
          setCategories(prodData.categories)
        }
      } catch (err) {
        console.warn('Backend unavailable, using static POS menu:', err.message)
      }
    }
    loadData()
  }, [])

  // Fast Customer Search by Mobile / Name
  useEffect(() => {
    if (!customerMobile || customerMobile.trim().length < 3) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const data = await apiRequest(`/pos/customers/search?q=${encodeURIComponent(customerMobile)}`, { isAdmin: true })
        setSearchResults(data.customers || [])
      } catch (err) {
        console.error('Customer search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [customerMobile])

  const selectExistingCustomer = (c) => {
    setSelectedCustomer(c)
    setCustomerName(c.name)
    setCustomerMobile(c.mobile)
    setSearchResults([])
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
    setCustomerName('')
    setCustomerMobile('')
    setSearchResults([])
  }

  const setWalkInGuest = () => {
    setSelectedCustomer(null)
    setCustomerName('')
    setCustomerMobile('')
    setSearchResults([])
  }

  // Cart Manipulations
  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const updateQty = (productId, delta) => {
    setCartItems((prev) =>
      prev
        .map((i) => (i.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  const clearCart = () => {
    setCartItems([])
    setNotes('')
    clearCustomer()
  }

  const getItemQty = (productId) => {
    const item = cartItems.find((i) => i.id === productId)
    return item ? item.quantity : 0
  }

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalRoyaltyPoints = cartItems.reduce(
    (sum, item) => sum + (item.royaltyPoints || item.royalty_points || 0) * item.quantity,
    0
  )
  const takeawayExtraTotal = orderType === 'PICKUP'
    ? cartItems.reduce((sum, item) => sum + Number(item.takeawayExtraCost || item.takeaway_extra_cost || 0) * item.quantity, 0)
    : 0
  const displaySubtotal = subtotal + takeawayExtraTotal
  const deliveryFee = orderType === 'DELIVERY' ? (displaySubtotal >= 500 ? 0 : 40) : 0
  const grandTotal = displaySubtotal + deliveryFee
  const splitTotal = Number(splitCash || 0) + Number(splitUpi || 0) + Number(splitCard || 0)
  const splitBalance = Number((grandTotal - splitTotal).toFixed(2))
  const paymentBreakdown = [
    { method: 'CASH', amount: Number(splitCash || 0) },
    { method: 'UPI', amount: Number(splitUpi || 0) },
    { method: 'CARD', amount: Number(splitCard || 0) },
  ].filter((entry) => entry.amount > 0)

  // Submit Order, Generate Bill, & Auto-Create Account
  const handleCheckoutBill = async ({ holdBill = false } = {}) => {
    if (cartItems.length === 0) {
      alert('Please select at least one dessert item for the bill.')
      return
    }

    const cleanMobile = customerMobile.replace(/\D/g, '')
    if (!holdBill && isSplitPayment && Math.abs(splitBalance) > 0.01) {
      alert(`Split payment must equal bill total. Balance: ${formatPrice(splitBalance)}`)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        customerId: selectedCustomer ? selectedCustomer.id : null,
        customerName: customerName.trim() || 'Walk-in Guest',
        customerMobile: cleanMobile || '9999999999',
        orderType,
        tableOrTokenNo: tableNo,
        items: cartItems.map((i) => ({ productId: i.id, quantity: i.quantity })),
        paymentMethod: !holdBill && isSplitPayment ? 'SPLIT' : paymentMethod,
        paymentBreakdown: !holdBill && isSplitPayment ? paymentBreakdown : [],
        notes,
        autoComplete: !holdBill,
        holdBill,
      }

      const res = await apiRequest('/pos/orders', {
        method: 'POST',
        isAdmin: true,
        body: payload,
      })

      setCompletedData({ ...res, holdBill })
      clearCart()
    } catch (err) {
      alert(`POS Billing Error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchCat = activeCategory === 'ALL' || p.categorySlug === activeCategory || p.category_id === activeCategory
    const matchSearch = !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
    const matchToday = !onlyTodayMenu || p.isAvailable
    return matchCat && matchSearch && matchToday
  })

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ─── STEP 1: CUSTOMER ONBOARDING & IDENTIFICATION BAR ─── */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '2px solid rgba(179,123,36,0.3)',
          padding: '18px 24px',
          boxShadow: '0 8px 24px rgba(43,23,18,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>👤</span>
            <div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--cocoa-dark)' }}>
                Step 1: Customer Details &amp; Royalty Account
              </strong>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                Enter mobile number to automatically create account &amp; generate QR login pass.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={setWalkInGuest}
            >
              ⚡ Fast Walk-in Guest (No Account)
            </button>
            {selectedCustomer && (
              <button
                type="button"
                className="btn btn--sm"
                style={{ background: 'rgba(186,27,27,0.1)', color: '#BA1B1B', padding: '6px 12px', fontSize: '12px' }}
                onClick={clearCustomer}
              >
                ✕ Clear Customer
              </button>
            )}
          </div>
        </div>

        {/* Customer Input Fields */}
        <div className="pos-step-1-grid">
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Customer Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(61,37,30,0.2)', fontSize: '13px', background: '#FFFFFF' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Mobile Number (10 Digits) *
            </label>
            <input
              type="tel"
              maxLength={10}
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              placeholder="Enter 10-digit mobile number"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(61,37,30,0.2)', fontSize: '13px', background: '#FFFFFF' }}
            />

            {/* Live Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                  border: '1px solid rgba(61,37,30,0.15)',
                  marginTop: '4px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectExistingCustomer(c)}
                    style={{ padding: '10px 14px', borderBottom: '1px solid #EEE', cursor: 'pointer', fontSize: '12px' }}
                  >
                    <strong>{c.name}</strong> • {c.mobile}
                    <span style={{ color: '#B37B24', fontWeight: 800, marginLeft: '8px' }}>
                      👑 {c.royalty_id} ({c.current_points || 0} pts)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ paddingTop: '10px' }}>
            {selectedCustomer ? (
              <div style={{ background: '#E2F0E6', color: '#2E6F40', padding: '10px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 800 }}>
                ✓ Existing Member: {selectedCustomer.royalty_id} ({selectedCustomer.current_points} pts)
              </div>
            ) : (customerMobile.replace(/\D/g, '').length === 10 && customerMobile.replace(/\D/g, '') !== '9999999999') ? (
              <div style={{ background: '#FAF0E4', color: '#B37B24', padding: '10px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 800 }}>
                ✨ New Customer: Account auto-created! (Login Password = Mobile No.)
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '10px 0' }}>
                Walk-in guest (leave empty) or enter mobile number to earn Royalty Points
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── STEP 2: CATALOGUE & BILLING SPLIT SCREEN ─── */}
      <div className="pos-split-layout">
        
        {/* LEFT: Menu Items Selection */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)', padding: '20px' }}>
          
          {/* Header & Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🍫</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--cocoa-dark)' }}>
                Step 2: Select Confectionery Items
              </strong>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setOnlyTodayMenu(!onlyTodayMenu)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: onlyTodayMenu ? '1px solid #2E6F40' : '1px solid rgba(61,37,30,0.15)',
                  background: onlyTodayMenu ? '#E2F0E6' : '#FFFFFF',
                  color: onlyTodayMenu ? '#2E6F40' : 'var(--text-muted)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {onlyTodayMenu ? '🟢 Today\'s Live Menu' : '📦 All Store Catalogue'}
              </button>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="🔍 Search dessert..."
                style={{ padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(61,37,30,0.15)', fontSize: '12px', width: '160px' }}
              />
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="pos-category-bar">
            <button
              type="button"
              className={`pos-category-chip ${activeCategory === 'ALL' ? 'pos-category-chip--active' : ''}`}
              onClick={() => setActiveCategory('ALL')}
            >
              All Items ({filteredProducts.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`pos-category-chip ${activeCategory === c.slug || activeCategory === c.id ? 'pos-category-chip--active' : ''}`}
                onClick={() => setActiveCategory(c.slug || c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="pos-product-grid">
            {filteredProducts.map((p) => {
              const inCartQty = getItemQty(p.id)

              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  className={`pos-product-card ${inCartQty > 0 ? 'pos-product-card--active' : ''}`}
                  onClick={() => addToCart(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      addToCart(p)
                    }
                  }}
                  style={{
                    background: inCartQty > 0 ? '#FFF9F0' : '#FFFFFF',
                    borderRadius: '16px',
                    padding: '12px',
                    border: inCartQty > 0 ? '2px solid var(--caramel)' : '1px solid rgba(61,37,30,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: inCartQty > 0 ? '0 4px 16px rgba(179,123,36,0.15)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <img
                      src={p.image}
                      alt={p.name}
                      style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '10px', marginBottom: '8px' }}
                    />
                    <h4 style={{ margin: '0 0 2px', fontSize: '13px', color: 'var(--cocoa-dark)', fontWeight: 800, lineHeight: 1.2 }}>
                      {p.name}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {p.portionSize || '1-2 portions'}
                    </span>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--cocoa-dark)' }}>{formatPrice(p.price)}</strong>
                        {Number(p.takeawayExtraCost || 0) > 0 && (
                          <span style={{ display: 'block', fontSize: '10px', color: '#2E6F40', fontWeight: 800 }}>
                            Takeaway +{formatPrice(p.takeawayExtraCost)}
                          </span>
                        )}
                      </div>
                      <span style={{ background: '#FAF0E4', color: '#B37B24', padding: '2px 6px', borderRadius: 'var(--radius-pill)', fontWeight: 900, fontSize: '10px' }}>
                        +{p.royaltyPoints || p.royalty_points || 0} pts
                      </span>
                    </div>

                    {/* Quantity Stepper on Card */}
                    {inCartQty > 0 ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAF0E4', borderRadius: 'var(--radius-pill)', padding: '2px 4px' }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateQty(p.id, -1)
                          }}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#FFFFFF', cursor: 'pointer', fontWeight: 900, fontSize: '14px' }}
                        >
                          −
                        </button>
                        <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--cocoa-dark)' }}>
                          {inCartQty} in Bill
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateQty(p.id, 1)
                          }}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#FFFFFF', cursor: 'pointer', fontWeight: 900, fontSize: '14px' }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: '8px', borderRadius: 'var(--radius-pill)', background: '#FAF6F0', color: 'var(--cocoa-dark)', fontSize: '11px', fontWeight: 900, textAlign: 'center', border: '1px dashed rgba(61,37,30,0.22)' }}>
                        Click card to add
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Live Bill & Settle Panel */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid rgba(61,37,30,0.12)',
            padding: '20px',
            boxShadow: '0 12px 32px rgba(43,23,18,0.06)',
            position: 'sticky',
            top: '20px',
          }}
        >
          {/* Bill Header */}
          <div style={{ borderBottom: '1px solid rgba(61,37,30,0.1)', paddingBottom: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--cocoa-dark)' }}>
                  🧾 Active Bill Cart
                </span>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Customer: <strong>{customerName || 'Walk-in Guest'}</strong> {customerMobile && `(${customerMobile})`}
                </div>
              </div>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  style={{ background: 'none', border: 'none', color: '#BA1B1B', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Order Type & Table */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(61,37,30,0.15)', fontSize: '12px', background: '#FFFFFF' }}
            >
              <option value="DINE_IN">🍽️ Dine-In</option>
              <option value="PICKUP">🛍️ Takeaway / Pickup</option>
              <option value="DELIVERY">🛵 Store Delivery</option>
            </select>
            <input
              type="text"
              value={tableNo}
              onChange={(e) => setTableNo(e.target.value)}
              placeholder="Table #"
              style={{ width: '100px', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(61,37,30,0.15)', fontSize: '12px' }}
            />
          </div>

          {/* Itemized Cart List */}
          <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '14px', borderBottom: '1px solid rgba(61,37,30,0.08)', paddingBottom: '8px' }}>
            {cartItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '6px' }}>🛒</span>
                No items added yet. Click any product card from the menu.
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #EEE', fontSize: '13px' }}>
                  <div style={{ flex: 1, paddingRight: '8px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--cocoa-dark)' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatPrice(item.price)}
                      {orderType === 'PICKUP' && Number(item.takeawayExtraCost || item.takeaway_extra_cost || 0) > 0
                        ? ` + ${formatPrice(item.takeawayExtraCost || item.takeaway_extra_cost)} parcel`
                        : ''} × {item.quantity} (+{(item.royaltyPoints || item.royalty_points || 0) * item.quantity} pts)
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #CCC', background: '#FFF', cursor: 'pointer', fontWeight: 800 }}
                      onClick={() => updateQty(item.id, -1)}
                    >
                      −
                    </button>
                    <span style={{ minWidth: '18px', textAlign: 'center', fontWeight: 800 }}>{item.quantity}</span>
                    <button
                      type="button"
                      style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #CCC', background: '#FFF', cursor: 'pointer', fontWeight: 800 }}
                      onClick={() => updateQty(item.id, 1)}
                    >
                      +
                    </button>
                    <strong style={{ minWidth: '60px', textAlign: 'right' }}>
                      {formatPrice((item.price + (orderType === 'PICKUP' ? Number(item.takeawayExtraCost || item.takeaway_extra_cost || 0) : 0)) * item.quantity)}
                    </strong>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals & Calculations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            {takeawayExtraTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2E6F40', fontWeight: 800 }}>
                <span>Takeaway / Parcel Extra:</span>
                <span>{formatPrice(takeawayExtraTotal)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Delivery:</span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: 900, color: 'var(--cocoa-dark)', borderTop: '1px solid #000', paddingTop: '6px' }}>
              <span>Payable (Total):</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#B37B24', fontWeight: 800 }}>
              👑 Earns +{totalRoyaltyPoints} Royalty Points
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Payment Method:
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, marginBottom: '8px', color: 'var(--cocoa-dark)' }}>
              <input
                type="checkbox"
                checked={isSplitPayment}
                onChange={(e) => setIsSplitPayment(e.target.checked)}
              />
              Split payment
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {['UPI', 'CASH', 'CARD'].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`btn btn--sm ${paymentMethod === m ? 'btn--gold' : 'btn--outline'}`}
                  disabled={isSplitPayment}
                  style={{ padding: '8px 4px', fontSize: '12px', fontWeight: 800, opacity: isSplitPayment ? 0.55 : 1 }}
                  onClick={() => setPaymentMethod(m)}
                >
                  {m === 'UPI' ? '📱 UPI' : m === 'CASH' ? '💵 CASH' : '💳 CARD'}
                </button>
              ))}
            </div>
            {isSplitPayment && (
              <div style={{ marginTop: '10px', background: '#FAF6F0', borderRadius: '12px', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  ['Cash', splitCash, setSplitCash],
                  ['UPI', splitUpi, setSplitUpi],
                  ['Card', splitCard, setSplitCard],
                ].map(([label, value, setter]) => (
                  <label key={label} style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)' }}>
                    {label}
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder="0"
                      style={{ width: '100%', marginTop: '4px', padding: '7px 8px', borderRadius: '8px', border: '1px solid rgba(61,37,30,0.15)', fontSize: '12px' }}
                    />
                  </label>
                ))}
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 900, color: Math.abs(splitBalance) < 0.01 ? '#2E6F40' : '#BA1B1B' }}>
                  <span>Split total: {formatPrice(splitTotal)} | Balance: {formatPrice(splitBalance)}</span>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => setSplitCash(Math.max(0, splitBalance + Number(splitCash || 0)).toFixed(0))}
                  >
                    Fill Cash Balance
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Settle Bill & Print Button */}
          <button
            type="button"
            disabled={submitting || cartItems.length === 0}
            className="btn btn--gold btn--full"
            style={{ padding: '14px', fontSize: '14px', fontWeight: 900 }}
            onClick={() => handleCheckoutBill({ holdBill: false })}
          >
            {submitting ? 'Generating Bill...' : `✓ Complete Bill & Create Account (${formatPrice(grandTotal)})`}
          </button>
          <button
            type="button"
            disabled={submitting || cartItems.length === 0}
            className="btn btn--outline btn--full"
            style={{ padding: '12px', fontSize: '13px', fontWeight: 900, borderColor: '#2E6F40', color: '#2E6F40', marginTop: '8px' }}
            onClick={() => handleCheckoutBill({ holdBill: true })}
          >
            Hold Bill & Send to KOT ({formatPrice(grandTotal)})
          </button>
        </div>
      </div>

      {/* ─── SUCCESS & ACCOUNT ACTIVATION MODAL ─── */}
      {completedData && (
        <div className="cart-drawer-overlay" onClick={() => setCompletedData(null)}>
          <div
            className="product-modal"
            style={{ maxWidth: '440px', padding: '30px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '6px' }}>🎉</span>
            <span className="section-label">{completedData.holdBill ? 'BILL HELD & SENT TO KOT' : 'BILL SETTLED & ACCOUNT ACTIVATED'}</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--cocoa-dark)', margin: '4px 0 10px' }}>
              {completedData.holdBill ? `KOT ${completedData.kot?.kot_number || ''}` : `Invoice ${completedData.invoice?.invoice_number}`}
            </h2>

            <div style={{ background: '#FAF0E4', padding: '12px', borderRadius: '14px', marginBottom: '16px', fontSize: '13px', textAlign: 'left' }}>
              <div><strong>Customer:</strong> {completedData.customer?.name || customerName || 'Walk-in Guest'}</div>
              <div><strong>Mobile:</strong> {completedData.customer?.mobile || customerMobile || '—'}</div>
              <div><strong>Royalty Member:</strong> <span style={{ color: 'var(--caramel)', fontWeight: 800 }}>{completedData.customer?.royalty_id || 'CDR-ACTIVE'}</span></div>
              <div style={{ color: '#2E6F40', fontWeight: 800, marginTop: '4px' }}>
                👑 Earned +{completedData.invoice?.royalty_points_earned || 0} Royalty Points on this bill!
              </div>
            </div>

            {/* Customer Login Credentials Notice */}
            {completedData.customer?.mobile && completedData.customer.mobile !== '9999999999' && (
              <div style={{ background: '#E2F0E6', border: '1px solid #2E6F40', borderRadius: '14px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#2E6F40', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📱</span> Online Account Login Credentials:
                </div>
                <div style={{ color: 'var(--cocoa-dark)' }}>• <strong>Username:</strong> {completedData.customer.mobile}</div>
                <div style={{ color: 'var(--cocoa-dark)' }}>• <strong>1st Time Password:</strong> {completedData.customer.mobile}</div>
                <div style={{ fontSize: '11px', color: '#2E6F40', marginTop: '6px', lineHeight: 1.4 }}>
                  Customer can log in to view points, redeem rewards, and change their password anytime in their profile.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={completedData.holdBill}
                className="btn btn--gold btn--full"
                style={{ padding: '12px', fontSize: '13px' }}
                onClick={() => {
                  setActiveInvoiceNumber(completedData.invoice.invoice_number)
                  setCompletedData(null)
                }}
              >
                🧾 Print Receipt
              </button>
              <button
                type="button"
                className="btn btn--outline btn--full"
                style={{ padding: '12px', fontSize: '13px' }}
                onClick={() => setCompletedData(null)}
              >
                + Next POS Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Printing Modal */}
      {activeInvoiceNumber && (
        <InvoiceModal
          invoiceNumber={activeInvoiceNumber}
          onClose={() => setActiveInvoiceNumber(null)}
        />
      )}
    </div>
  )
}
