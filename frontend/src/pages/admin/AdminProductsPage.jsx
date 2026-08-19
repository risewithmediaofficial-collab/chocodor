import { useState, useEffect } from 'react'
import { apiRequest } from '../../api/client'
import { formatPrice } from '../../data/content'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

import { PRODUCTS, CATEGORIES } from '../../data/products'

// Curated High-Res Dessert Image Library for One-Click Admin Selection
const IMAGE_LIBRARY = [
  { name: 'Artisanal Assortment', url: '/images/hero_chocolate.jpg' },
  { name: 'Dark Truffle Stack', url: '/images/chocolate_truffles_stack_1786684830986.jpg' },
  { name: 'Luxury Gift Box', url: '/images/chocolate_gift_box_1786684802545.jpg' },
  { name: 'Dark Chocolate Bar', url: '/images/chocolate_bar.jpg' },
  { name: 'Kitchen Showcase', url: '/images/chocolatier_kitchen_1786684770776.jpg' },
  { name: 'Master Chocolatier', url: '/images/master_chocolatier.jpg' },
]

export default function AdminProductsPage() {
  const [products, setProducts] = useState(PRODUCTS)
  const [categoriesList, setCategoriesList] = useState(CATEGORIES)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [todayMenuFilter, setTodayMenuFilter] = useState('ALL') // 'ALL' | 'ACTIVE_TODAY' | 'UNAVAILABLE'
  const [saveMsg, setSaveMsg] = useState('')

  // Product Modal State (Add or Edit)
  const [isModalOpen, setIsModalOpen] = useState(false)
  useBodyScrollLock(isModalOpen)
  const [editingProduct, setEditingProduct] = useState(null) // null = create new

  // Form Fields
  const [formName, setFormName] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formTakeawayExtraCost, setFormTakeawayExtraCost] = useState('')
  const [formPoints, setFormPoints] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formBadge, setFormBadge] = useState('')
  const [formImage, setFormImage] = useState('/images/hero_chocolate.jpg')
  const [formIngredients, setFormIngredients] = useState('')
  const [formDietary, setFormDietary] = useState('100% Vegetarian, Eggless')
  const [formServing, setFormServing] = useState('')
  const [formPrepTime, setFormPrepTime] = useState('15–20 mins')
  const [formPortion, setFormPortion] = useState('Serves 1–2')
  const [formAvailable, setFormAvailable] = useState(true)
  const [formFeatured, setFormFeatured] = useState(false)
  const [formBestseller, setFormBestseller] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const data = await apiRequest('/admin/products', { isAdmin: true })
      if (data && data.products && data.products.length > 0) {
        setProducts(data.products)
      }

      const catData = await apiRequest('/products')
      if (catData && catData.categories && catData.categories.length > 0) {
        setCategoriesList(catData.categories)
      }
    } catch (err) {
      console.warn('Backend unavailable, using rich static catalogue:', err.message)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Fast 1-Click Availability Toggle for Today's Menu
  const toggleTodayAvailability = async (p, e) => {
    if (e) e.stopPropagation()
    const newStatus = !p.isAvailable

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, isAvailable: newStatus } : item))
    )

    try {
      await apiRequest(`/admin/products/${p.id}`, {
        method: 'PATCH',
        isAdmin: true,
        body: { isAvailable: newStatus },
      })
      setSaveMsg(`✓ "${p.name}" ${newStatus ? 'is now ACTIVE on Today\'s Menu' : 'is OFF Today\'s Menu'}.`)
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      alert(`Update failed: ${err.message}`)
      loadData()
    }
  }

  // Bulk Today's Menu Actions
  const handleBulkDailyMenu = async (action, categoryId = null, isAvailable = true) => {
    try {
      await apiRequest('/admin/products-daily-menu', {
        method: 'PATCH',
        isAdmin: true,
        body: { action, categoryId, isAvailable },
      })
      setSaveMsg(`✓ Today's Menu updated successfully!`)
      loadData()
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      alert(`Bulk update failed: ${err.message}`)
    }
  }

  const openCreateModal = () => {
    setEditingProduct(null)
    setFormName('')
    setFormCategoryId(categoriesList[0]?.id || 'cat-1')
    setFormPrice('')
    setFormTakeawayExtraCost('0')
    setFormPoints('')
    setFormDescription('')
    setFormBadge('')
    setFormImage(IMAGE_LIBRARY[0].url)
    setFormIngredients('Belgian Cocoa, Fresh Cream, Pure Butter, Cane Sugar, Roasted Nuts')
    setFormDietary('100% Vegetarian, Eggless')
    setFormServing('Best served warm. Enjoy within 24 hours of fresh boutique baking.')
    setFormPrepTime('15–20 mins')
    setFormPortion('Serves 1–2')
    setFormAvailable(true)
    setFormFeatured(false)
    setFormBestseller(false)
    setIsModalOpen(true)
    setSaveMsg('')
  }

  const openEditModal = (p) => {
    setEditingProduct(p)
    setFormName(p.name)
    setFormCategoryId(p.categoryId)
    setFormPrice(p.price)
    setFormTakeawayExtraCost(p.takeawayExtraCost || 0)
    setFormPoints(p.royaltyPoints)
    setFormDescription(p.description || '')
    setFormBadge(p.badge || '')
    setFormImage(p.image || IMAGE_LIBRARY[0].url)
    setFormIngredients(p.ingredients || '')
    setFormDietary(p.dietaryInfo || '100% Vegetarian, Eggless')
    setFormServing(p.servingSuggestion || '')
    setFormPrepTime(p.preparationTime || '15–20 mins')
    setFormPortion(p.portionSize || 'Serves 1–2')
    setFormAvailable(p.isAvailable)
    setFormFeatured(p.isFeatured)
    setFormBestseller(p.isBestseller)
    setIsModalOpen(true)
    setSaveMsg('')
  }

  const handlePriceChange = (val) => {
    setFormPrice(val)
    if (!editingProduct && val && !isNaN(parseFloat(val))) {
      setFormPoints(Math.max(1, Math.round(parseFloat(val) * 0.08)))
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormImage(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload = {
        name: formName.trim(),
        categoryId: formCategoryId,
        price: parseFloat(formPrice),
        takeawayExtraCost: parseFloat(formTakeawayExtraCost) || 0,
        royaltyPoints: parseInt(formPoints, 10),
        description: formDescription.trim(),
        badge: formBadge.trim(),
        image: formImage,
        ingredients: formIngredients.trim(),
        dietaryInfo: formDietary.trim(),
        servingSuggestion: formServing.trim(),
        preparationTime: formPrepTime.trim(),
        portionSize: formPortion.trim(),
        isAvailable: formAvailable,
        isFeatured: formFeatured,
        isBestseller: formBestseller,
      }

      if (editingProduct) {
        await apiRequest(`/admin/products/${editingProduct.id}`, {
          method: 'PATCH',
          isAdmin: true,
          body: payload,
        })
        setSaveMsg(`✓ Product "${formName}" updated successfully!`)
      } else {
        await apiRequest('/admin/products', {
          method: 'POST',
          isAdmin: true,
          body: payload,
        })
        setSaveMsg(`✓ New product "${formName}" added successfully to store!`)
      }

      setIsModalOpen(false)
      loadData()
    } catch (err) {
      alert(`Operation failed: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (p) => {
    if (!confirm(`Are you sure you want to permanently delete "${p.name}"?`)) return
    try {
      await apiRequest(`/admin/products/${p.id}`, {
        method: 'DELETE',
        isAdmin: true,
      })
      setSaveMsg(`✓ Product "${p.name}" deleted.`)
      loadData()
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  const activeTodayCount = products.filter((p) => p.isAvailable).length
  const uniqueCategories = Array.from(new Set(products.map((p) => p.category)))

  const filtered = products.filter((p) => {
    const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchToday =
      todayMenuFilter === 'ALL' ||
      (todayMenuFilter === 'ACTIVE_TODAY' && p.isAvailable) ||
      (todayMenuFilter === 'UNAVAILABLE' && !p.isAvailable)
    return matchCat && matchSearch && matchToday
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '14px' }}>
      
      {/* ─── STATIC TOP SECTION (Header + Today's Menu Controls + Filters) ─── */}
      <div style={{ flexShrink: 0 }}>
        {/* Header & Add Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--cocoa-dark)', margin: 0 }}>
              Daily Menu &amp; Products Manager
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Select which desserts are active on Today&apos;s Menu. Only selected active items will show in customer ordering.
            </p>
          </div>

          <button
            type="button"
            className="btn btn--gold"
            style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 800 }}
            onClick={openCreateModal}
          >
            + Add New Product
          </button>
        </div>

        {saveMsg && (
          <div style={{ background: 'rgba(46,111,64,0.1)', color: '#2E6F40', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, marginBottom: '12px', fontSize: '12px' }}>
            {saveMsg}
          </div>
        )}

        {/* ─── TODAY'S LIVE MENU CONTROLS ─── */}
        <div style={{ background: '#FFFFFF', padding: '14px 20px', borderRadius: '16px', border: '2px solid rgba(179,123,36,0.3)', marginBottom: '14px', boxShadow: '0 4px 16px rgba(43,23,18,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid rgba(61,37,30,0.08)', paddingBottom: '10px', marginBottom: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📅</span>
                <strong style={{ fontSize: '1rem', color: 'var(--cocoa-dark)' }}>
                  Today&apos;s Live Menu Selection
                </strong>
                <span style={{ background: '#E2F0E6', color: '#2E6F40', padding: '2px 10px', borderRadius: 'var(--radius-pill)', fontWeight: 800, fontSize: '11px' }}>
                  🟢 {activeTodayCount} / {products.length} Active Today
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Enable or disable desserts for today. Changes take effect instantly across customer store &amp; POS.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn--sm"
                style={{ background: '#2E6F40', color: '#FFFFFF', padding: '6px 12px', fontSize: '11px', fontWeight: 800 }}
                onClick={() => handleBulkDailyMenu('SET_ALL', null, true)}
              >
                ✓ Select All for Today
              </button>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 800 }}
                onClick={() => handleBulkDailyMenu('SET_ALL', null, false)}
              >
                ✕ Clear All / Deselect
              </button>
            </div>
          </div>

          {/* Category Quick Chips */}
          <div>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--cocoa)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Quick Toggle Entire Category for Today:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {categoriesList.map((cat) => {
                const catProds = products.filter((p) => p.categoryId === cat.id)
                const catActiveCount = catProds.filter((p) => p.isAvailable).length
                const isAllActive = catProds.length > 0 && catActiveCount === catProds.length

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleBulkDailyMenu('SET_CATEGORY', cat.id, !isAllActive)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      border: isAllActive ? '1px solid #2E6F40' : '1px solid rgba(61,37,30,0.15)',
                      background: isAllActive ? '#FAF0E4' : '#FFFFFF',
                      color: isAllActive ? 'var(--cocoa-dark)' : 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{isAllActive ? '🟢' : '⚪'}</span>
                    <span>{cat.name} ({catActiveCount}/{catProds.length})</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ background: '#FFFFFF', padding: '12px 18px', borderRadius: '14px', border: '1px solid rgba(61,37,30,0.1)', marginBottom: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search product name, ingredients, or taste notes..."
            style={{ flex: '1 1 220px', padding: '8px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(61,37,30,0.15)', fontSize: '12px', fontFamily: 'inherit' }}
          />

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn btn--sm ${todayMenuFilter === 'ALL' ? 'btn--gold' : 'btn--outline'}`}
              style={{ padding: '6px 12px', fontSize: '11px' }}
              onClick={() => setTodayMenuFilter('ALL')}
            >
              All Items ({products.length})
            </button>
            <button
              type="button"
              className={`btn btn--sm ${todayMenuFilter === 'ACTIVE_TODAY' ? 'btn--gold' : 'btn--outline'}`}
              style={{ padding: '6px 12px', fontSize: '11px' }}
              onClick={() => setTodayMenuFilter('ACTIVE_TODAY')}
            >
              🟢 Active Today ({activeTodayCount})
            </button>
            <button
              type="button"
              className={`btn btn--sm ${todayMenuFilter === 'UNAVAILABLE' ? 'btn--gold' : 'btn--outline'}`}
              style={{ padding: '6px 12px', fontSize: '11px' }}
              onClick={() => setTodayMenuFilter('UNAVAILABLE')}
            >
              ⚪ Off Today ({products.length - activeTodayCount})
            </button>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(61,37,30,0.15)', fontSize: '12px', fontFamily: 'inherit', background: '#FFFFFF' }}
          >
            <option value="ALL">All Categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── SCROLLABLE PRODUCTS TABLE SECTION ─── */}
      <div className="table-responsive admin-scroll-panel admin-scroll-panel--lg" style={{ background: '#FFFFFF', borderRadius: '18px', border: '1px solid rgba(61,37,30,0.1)' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading products...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No products found matching your search.</div>
        ) : (
          <table className="admin-table" style={{ margin: 0, minWidth: '700px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#FAF6F0', zIndex: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <tr>
                <th>Dessert Item</th>
                <th>Category</th>
                <th>Dine-In Price</th>
                <th>Takeaway Extra</th>
                <th>Royalty Points</th>
                <th>Today&apos;s Menu (1-Click Toggle)</th>
                <th>Dietary / Ingredients</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ opacity: p.isAvailable ? 1 : 0.65 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img
                        src={p.image}
                        alt={p.name}
                        style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(61,37,30,0.1)' }}
                      />
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--cocoa-dark)' }}>{p.name}</strong>
                        {p.badge && (
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--caramel)', fontWeight: 800 }}>
                            ★ {p.badge}
                          </span>
                        )}
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                          {p.portionSize || 'Serves 1-2'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--cocoa)' }}>{p.category}</span>
                  </td>
                  <td style={{ fontWeight: 800, fontSize: '14px' }}>{formatPrice(p.price)}</td>
                  <td style={{ fontWeight: 800, fontSize: '13px', color: Number(p.takeawayExtraCost || 0) > 0 ? '#2E6F40' : 'var(--text-muted)' }}>
                    {Number(p.takeawayExtraCost || 0) > 0 ? `+${formatPrice(p.takeawayExtraCost)}` : 'No extra'}
                  </td>
                  <td>
                    <span style={{ background: '#FAF0E4', color: '#B37B24', padding: '4px 10px', borderRadius: 'var(--radius-pill)', fontWeight: 900, fontSize: '13px' }}>
                      👑 {p.royaltyPoints} pts
                    </span>
                  </td>
                  <td>
                    {/* 1-Click Toggle Button for Today's Menu */}
                    <button
                      type="button"
                      onClick={(e) => toggleTodayAvailability(p, e)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-pill)',
                        border: p.isAvailable ? '1px solid #2E6F40' : '1px solid rgba(61,37,30,0.2)',
                        background: p.isAvailable ? '#E2F0E6' : '#F5F5F5',
                        color: p.isAvailable ? '#2E6F40' : '#888888',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      title="Click to toggle availability on customer website"
                    >
                      <span>{p.isAvailable ? '🟢' : '⚪'}</span>
                      <span>{p.isAvailable ? 'Active on Today\'s Menu' : 'Off Today\'s Menu'}</span>
                    </button>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#2E6F40', fontWeight: 700 }}>{p.dietaryInfo || '100% Veg'}</span>
                      <br />
                      <span style={{ color: 'var(--text-muted)' }}>{p.ingredients || 'Belgian Cocoa'}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                        onClick={() => openEditModal(p)}
                      >
                        ✎ Edit Details
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm"
                        style={{ padding: '6px 10px', fontSize: '11px', background: 'rgba(186,27,27,0.1)', color: '#BA1B1B' }}
                        onClick={() => handleDelete(p)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="cart-drawer-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="product-modal admin-product-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="product-modal__close"
              onClick={() => setIsModalOpen(false)}
            >
              ✕
            </button>

            <div className="product-modal__content admin-product-modal__content">
              <span className="section-label">
                {editingProduct ? 'EDIT CONFECTIONERY PRODUCT' : 'CREATE NEW CONFECTIONERY PRODUCT'}
              </span>
              <h2 className="product-modal__title" style={{ fontSize: '1.5rem', marginBottom: '16px' }}>
                {editingProduct ? `Edit: ${editingProduct.name}` : 'New Dessert Master'}
              </h2>

              <form onSubmit={handleSubmit} className="admin-product-form">
                
                {/* 1. Basic Name & Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Pistachio & Lotus Biscoff Salankatia"
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label">Category *</label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                      className="form-input"
                      style={{ background: '#FFFFFF' }}
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Badge Tag (Optional)</label>
                    <input
                      type="text"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      placeholder="e.g. CHEF SPECIAL, BESTSELLER"
                      className="form-input"
                    />
                  </div>
                </div>

                {/* 2. Price & Royalty Points */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                  <div>
                    <label className="form-label">Price in ₹ (INR) *</label>
                    <input
                      type="number"
                      step="1"
                      required
                      min="1"
                      value={formPrice}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder="e.g. 389"
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label">Takeaway / Parcel Extra</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={formTakeawayExtraCost}
                      onChange={(e) => setFormTakeawayExtraCost(e.target.value)}
                      placeholder="e.g. 10"
                      className="form-input"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Added per unit only for pickup/takeaway.</span>
                  </div>

                  <div>
                    <label className="form-label">Royalty Points Earned *</label>
                    <input
                      type="number"
                      step="1"
                      required
                      min="0"
                      value={formPoints}
                      onChange={(e) => setFormPoints(e.target.value)}
                      placeholder="e.g. 30"
                      className="form-input"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Customer earns this with every unit.</span>
                  </div>
                </div>

                {/* 3. Image Selection & Upload */}
                <div style={{ background: '#FAF6F0', padding: '16px', borderRadius: '16px' }}>
                  <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Product Image</label>
                  
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
                    <img
                      src={formImage}
                      alt="Preview"
                      style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', border: '2px solid var(--caramel)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={formImage}
                        onChange={(e) => setFormImage(e.target.value)}
                        placeholder="Image URL (e.g. /images/... or https://...)"
                        className="form-input"
                        style={{ fontSize: '12px', background: '#FFFFFF' }}
                      />
                    </div>
                  </div>

                  {/* File Upload Option */}
                  <div style={{ marginBottom: '12px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>Or upload file from device:</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ fontSize: '12px' }} />
                  </div>

                  {/* Quick Preset Library Picker */}
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cocoa)', display: 'block', marginBottom: '6px' }}>
                    Or Pick from Choco D&apos;or High-Res Library:
                  </span>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {IMAGE_LIBRARY.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => setFormImage(item.url)}
                        style={{
                          cursor: 'pointer',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: formImage === item.url ? '2px solid var(--caramel)' : '1px solid rgba(61,37,30,0.2)',
                          width: '52px',
                          height: '52px',
                          flexShrink: 0,
                        }}
                        title={item.name}
                      >
                        <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Description */}
                <div>
                  <label className="form-label">Description &amp; Taste Profile</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Dual delight combining nutty roasted pistachio and spiced Lotus Biscoff spread over crispy filo layers."
                    rows={2}
                    className="form-input"
                    style={{ borderRadius: '12px', resize: 'none' }}
                  />
                </div>

                {/* 5. Extra Details: Ingredients, Dietary, Serving, Portion */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Dietary Information</label>
                    <input
                      type="text"
                      value={formDietary}
                      onChange={(e) => setFormDietary(e.target.value)}
                      placeholder="e.g. 100% Vegetarian, Eggless"
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label">Key Ingredients</label>
                    <input
                      type="text"
                      value={formIngredients}
                      onChange={(e) => setFormIngredients(e.target.value)}
                      placeholder="e.g. Belgian Cocoa, Pistachios, Butter"
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label">Serving Suggestion / Pairing</label>
                    <input
                      type="text"
                      value={formServing}
                      onChange={(e) => setFormServing(e.target.value)}
                      placeholder="e.g. Best served warm with vanilla gelato"
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label">Portion Size &amp; Prep Time</label>
                    <input
                      type="text"
                      value={formPortion}
                      onChange={(e) => setFormPortion(e.target.value)}
                      placeholder="e.g. Serves 1-2 • 15 mins"
                      className="form-input"
                    />
                  </div>
                </div>

                {/* 6. Availability & Featured Checkboxes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formAvailable}
                      onChange={(e) => setFormAvailable(e.target.checked)}
                    />
                    Include in Today&apos;s Live Menu (Available for ordering)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formFeatured}
                      onChange={(e) => setFormFeatured(e.target.checked)}
                    />
                    Mark as Featured Creation on Home Page
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formBestseller}
                      onChange={(e) => setFormBestseller(e.target.checked)}
                    />
                    Mark as Bestseller
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn--gold btn--full"
                  style={{ padding: '14px', fontSize: '14px' }}
                >
                  {submitting ? 'Saving Product...' : editingProduct ? 'Update Product Details ✓' : 'Create & Publish Product →'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
