import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../api/client'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

const MATERIAL_UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'packet', 'box', 'bottle', 'tin', 'tray']

const stockPanelStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(61,37,30,0.1)',
  borderRadius: '16px',
  padding: '16px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const stockScrollStyle = {
  overflow: 'auto',
  borderRadius: '10px',
  border: '1px solid rgba(61,37,30,0.06)',
}

function StockDialog({ title, note, maxWidth = '560px', onClose, children }) {
  return (
    <div
      className="cart-drawer-overlay"
      onClick={onClose}
      style={{ alignItems: 'center', justifyContent: 'center', padding: '18px' }}
    >
      <div
        className="product-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(100%, var(--stock-dialog-width))',
          '--stock-dialog-width': maxWidth,
          maxHeight: 'calc(100vh - 36px)',
          overflowY: 'auto',
          padding: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            alignItems: 'flex-start',
            padding: '22px 22px 14px',
            borderBottom: '1px solid rgba(61,37,30,0.1)',
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: 'var(--cocoa-dark)', fontSize: '1.35rem' }}>{title}</h2>
            {note && <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>{note}</p>}
          </div>
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div style={{ padding: '20px 22px 22px' }}>{children}</div>
      </div>
    </div>
  )
}

export default function AdminStockPage() {
  const [data, setData] = useState({ categories: [], products: [], materials: [], categoryMaterials: [], movements: [] })
  const [loading, setLoading] = useState(true)
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false)
  const [materialForm, setMaterialForm] = useState({ name: '', unit: 'pcs', currentStock: '', minStock: '', supplier: '' })
  
  // Recipe Multi-Select Modal State
  const [recipeTargetMode, setRecipeTargetMode] = useState('CATEGORY') // 'CATEGORY' | 'PRODUCT'
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([])
  const [selectedProductIds, setSelectedProductIds] = useState([])
  const [recipeSearch, setRecipeSearch] = useState('')
  const [recipeProductCategoryFilter, setRecipeProductCategoryFilter] = useState('ALL')
  const [recipeMaterialId, setRecipeMaterialId] = useState('')
  const [recipeQuantityPerItem, setRecipeQuantityPerItem] = useState('')

  // Rules Table Filters
  const [rulesFilterType, setRulesFilterType] = useState('ALL') // 'ALL' | 'CATEGORY' | 'PRODUCT'
  const [rulesSearch, setRulesSearch] = useState('')

  const [adjustForms, setAdjustForms] = useState({})
  const [saving, setSaving] = useState(false)
  const hasMaterials = data.materials.length > 0
  const hasCategories = data.categories.length > 0

  useBodyScrollLock(materialDialogOpen || recipeDialogOpen)

  const loadStock = useCallback(async () => {
    try {
      setLoading(true)
      const stock = await apiRequest('/admin/stock', { isAdmin: true })
      setData(stock)
      if (stock.materials?.[0]?.id) {
        setRecipeMaterialId((prev) => prev || stock.materials[0].id)
      }
    } catch (err) {
      alert(`Stock load failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStock()
  }, [loadStock])

  const lowStock = useMemo(
    () => data.materials.filter((m) => Number(m.current_stock || 0) <= Number(m.min_stock || 0)),
    [data.materials]
  )

  const openCreateMaterialDialog = () => {
    setEditingMaterial(null)
    setMaterialForm({ name: '', unit: 'pcs', currentStock: '', minStock: '', supplier: '' })
    setMaterialDialogOpen(true)
  }

  const openEditMaterialDialog = (material) => {
    setEditingMaterial(material)
    setMaterialForm({
      name: material.name || '',
      unit: material.unit || 'pcs',
      currentStock: material.current_stock ?? '',
      minStock: material.min_stock ?? '',
      supplier: material.supplier || '',
    })
    setMaterialDialogOpen(true)
  }

  const saveMaterial = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      if (editingMaterial) {
        await apiRequest(`/admin/stock/materials/${editingMaterial.id}`, {
          method: 'PATCH',
          isAdmin: true,
          body: {
            name: materialForm.name,
            unit: materialForm.unit,
            minStock: materialForm.minStock,
            supplier: materialForm.supplier,
          },
        })
      } else {
        await apiRequest('/admin/stock/materials', {
          method: 'POST',
          isAdmin: true,
          body: materialForm,
        })
      }
      setMaterialForm({ name: '', unit: 'pcs', currentStock: '', minStock: '', supplier: '' })
      setEditingMaterial(null)
      setMaterialDialogOpen(false)
      await loadStock()
    } catch (err) {
      alert(`Material save failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const deleteMaterial = async (material) => {
    if (!window.confirm(`Delete ${material.name}? This will also remove its category material rules.`)) return
    try {
      await apiRequest(`/admin/stock/materials/${material.id}`, { method: 'DELETE', isAdmin: true })
      await loadStock()
    } catch (err) {
      alert(`Material delete failed: ${err.message}`)
    }
  }

  const adjustStock = async (material, type) => {
    const form = adjustForms[material.id] || {}
    try {
      await apiRequest(`/admin/stock/materials/${material.id}/adjust`, {
        method: 'POST',
        isAdmin: true,
        body: { quantity: form.quantity, type, reason: form.reason },
      })
      setAdjustForms((prev) => ({ ...prev, [material.id]: { quantity: '', reason: '' } }))
      await loadStock()
    } catch (err) {
      alert(`Stock update failed: ${err.message}`)
    }
  }

  const openRecipeDialog = () => {
    setRecipeTargetMode('CATEGORY')
    setSelectedCategoryIds([])
    setSelectedProductIds([])
    setRecipeSearch('')
    setRecipeProductCategoryFilter('ALL')
    setRecipeMaterialId(data.materials?.[0]?.id || '')
    setRecipeQuantityPerItem('')
    setRecipeDialogOpen(true)
  }

  const toggleCategory = (catId) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    )
  }

  const toggleProduct = (prodId) => {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    )
  }

  const filteredCategories = useMemo(() => {
    const q = recipeSearch.trim().toLowerCase()
    if (!q) return data.categories || []
    return (data.categories || []).filter((c) => c.name.toLowerCase().includes(q))
  }, [data.categories, recipeSearch])

  const filteredProducts = useMemo(() => {
    const q = recipeSearch.trim().toLowerCase()
    return (data.products || []).filter((p) => {
      const matchesCat = recipeProductCategoryFilter === 'ALL' || p.categoryId === recipeProductCategoryFilter
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.categoryName && p.categoryName.toLowerCase().includes(q))
      return matchesCat && matchesSearch
    })
  }, [data.products, recipeSearch, recipeProductCategoryFilter])

  const toggleSelectAllCategories = () => {
    const currentIds = filteredCategories.map((c) => c.id)
    const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedCategoryIds.includes(id))
    if (allSelected) {
      setSelectedCategoryIds((prev) => prev.filter((id) => !currentIds.includes(id)))
    } else {
      setSelectedCategoryIds((prev) => Array.from(new Set([...prev, ...currentIds])))
    }
  }

  const toggleSelectAllProducts = () => {
    const currentIds = filteredProducts.map((p) => p.id)
    const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedProductIds.includes(id))
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !currentIds.includes(id)))
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...currentIds])))
    }
  }

  const selectedMaterial = useMemo(
    () => data.materials.find((m) => m.id === recipeMaterialId) || data.materials[0] || null,
    [data.materials, recipeMaterialId]
  )

  const saveCategoryMaterial = async (e) => {
    e.preventDefault()
    const targetCategoryIds = recipeTargetMode === 'CATEGORY' ? selectedCategoryIds : []
    const targetProductIds = recipeTargetMode === 'PRODUCT' ? selectedProductIds : []
    const count = targetCategoryIds.length + targetProductIds.length

    if (count === 0) {
      alert(`Please select at least one ${recipeTargetMode === 'CATEGORY' ? 'category' : 'product'}.`)
      return
    }
    if (!recipeMaterialId) {
      alert('Please select a raw material.')
      return
    }
    const qty = Number(recipeQuantityPerItem)
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity used per item.')
      return
    }

    try {
      setSaving(true)
      const res = await apiRequest('/admin/stock/category-materials', {
        method: 'POST',
        isAdmin: true,
        body: {
          categoryIds: targetCategoryIds,
          productIds: targetProductIds,
          materialId: recipeMaterialId,
          quantityPerItem: qty,
        },
      })
      setRecipeDialogOpen(false)
      await loadStock()
      alert(`✓ Successfully mapped raw material to ${res.count || count} ${recipeTargetMode === 'CATEGORY' ? 'categories' : 'products'}!`)
    } catch (err) {
      alert(`Mapping save failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const deleteCategoryMaterial = async (row) => {
    const targetName = row.category?.name || row.product?.name || (row.category_id ? 'category' : 'product')
    if (!window.confirm(`Remove ${row.material?.name || 'material'} mapping from ${targetName}?`)) return
    try {
      await apiRequest(`/admin/stock/category-materials/${row.id}`, { method: 'DELETE', isAdmin: true })
      await loadStock()
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  const filteredRules = useMemo(() => {
    const q = rulesSearch.trim().toLowerCase()
    return (data.categoryMaterials || []).filter((row) => {
      const isCat = Boolean(row.category_id)
      const isProd = Boolean(row.product_id)
      if (rulesFilterType === 'CATEGORY' && !isCat) return false
      if (rulesFilterType === 'PRODUCT' && !isProd) return false

      if (!q) return true
      const matName = row.material?.name || ''
      const catName = row.category?.name || ''
      const prodName = row.product?.name || ''
      return (
        matName.toLowerCase().includes(q) ||
        catName.toLowerCase().includes(q) ||
        prodName.toLowerCase().includes(q)
      )
    })
  }, [data.categoryMaterials, rulesSearch, rulesFilterType])

  if (loading) return <div style={{ padding: '40px' }}>Loading stock management...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--cocoa-dark)', margin: 0 }}>
            Stock Management
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Track raw materials, map category usage, and auto-deduct stock when KOT/orders are created.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--gold btn--sm" onClick={openCreateMaterialDialog}>
            + Add Raw Material
          </button>
          <button type="button" className="btn btn--outline btn--sm" onClick={openRecipeDialog}>
            + Map Material
          </button>
          <button type="button" className="btn btn--outline btn--sm" onClick={loadStock}>
            Refresh
          </button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div style={{ background: '#FDE8E8', color: '#BA1B1B', padding: '12px 16px', borderRadius: '12px', fontWeight: 800, fontSize: '13px' }}>
          Low stock: {lowStock.map((m) => `${m.name} (${m.current_stock} ${m.unit})`).join(', ')}
        </div>
      )}

      <div style={{ ...stockPanelStyle, height: '330px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--cocoa-dark)' }}>Current Raw Material Stock</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>
              {data.materials.length} material{data.materials.length === 1 ? '' : 's'} added
            </p>
          </div>
          <button type="button" className="btn btn--gold btn--sm" onClick={openCreateMaterialDialog}>
            Add Material
          </button>
        </div>
        <div className="table-responsive admin-scroll-panel" style={{ ...stockScrollStyle, flex: 1, maxHeight: 'none' }}>
          <table className="admin-table" style={{ margin: 0, minWidth: '720px' }}>
            <thead>
              <tr>
                <th>Material</th>
                <th>Stock</th>
                <th>Min</th>
                <th>Supplier</th>
                <th>Stock In / Out</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.materials.map((m) => {
                const form = adjustForms[m.id] || { quantity: '', reason: '' }
                const isLow = Number(m.current_stock || 0) <= Number(m.min_stock || 0)
                return (
                  <tr key={m.id}>
                    <td><strong>{m.name}</strong><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.unit}</div></td>
                    <td style={{ color: isLow ? '#BA1B1B' : '#2E6F40', fontWeight: 900 }}>{m.current_stock} {m.unit}</td>
                    <td>{m.min_stock} {m.unit}</td>
                    <td>{m.supplier || '-'}</td>
                    <td>
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto auto', gap: '6px' }}>
                        <input type="number" min="0" step="0.001" placeholder="Qty" value={form.quantity} onChange={(e) => setAdjustForms((prev) => ({ ...prev, [m.id]: { ...form, quantity: e.target.value } }))} style={{ padding: '6px', borderRadius: '8px', border: '1px solid rgba(61,37,30,0.15)' }} />
                        <input placeholder="Reason" value={form.reason} onChange={(e) => setAdjustForms((prev) => ({ ...prev, [m.id]: { ...form, reason: e.target.value } }))} style={{ padding: '6px', borderRadius: '8px', border: '1px solid rgba(61,37,30,0.15)' }} />
                        <button type="button" className="btn btn--gold btn--sm" onClick={() => adjustStock(m, 'IN')}>In</button>
                        <button type="button" className="btn btn--outline btn--sm" onClick={() => adjustStock(m, 'OUT')}>Out</button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn--outline btn--sm" onClick={() => openEditMaterialDialog(m)}>Edit</button>
                        <button type="button" className="btn btn--sm" style={{ background: 'rgba(186,27,27,0.1)', color: '#BA1B1B' }} onClick={() => deleteMaterial(m)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {data.materials.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No raw materials yet. Click Add Material to create items like Bun, Cream, Chocolate Sauce, Box, or Spoon.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...stockPanelStyle, minHeight: '340px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--cocoa-dark)' }}>Material Usage Rules (Recipe Mapping)</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>
              Define how much raw material is consumed when items from categories or specific products are sold.
            </p>
          </div>
          <button type="button" className="btn btn--outline btn--sm" onClick={openRecipeDialog}>
            + Map Material
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setRulesFilterType('ALL')}
              className={`btn btn--sm ${rulesFilterType === 'ALL' ? 'btn--gold' : 'btn--outline'}`}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              All Rules ({data.categoryMaterials?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setRulesFilterType('CATEGORY')}
              className={`btn btn--sm ${rulesFilterType === 'CATEGORY' ? 'btn--gold' : 'btn--outline'}`}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Category ({data.categoryMaterials?.filter((r) => r.category_id).length || 0})
            </button>
            <button
              type="button"
              onClick={() => setRulesFilterType('PRODUCT')}
              className={`btn btn--sm ${rulesFilterType === 'PRODUCT' ? 'btn--gold' : 'btn--outline'}`}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Product ({data.categoryMaterials?.filter((r) => r.product_id).length || 0})
            </button>
          </div>
          <input
            type="text"
            placeholder="Filter rules by material or item..."
            value={rulesSearch}
            onChange={(e) => setRulesSearch(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(61,37,30,0.15)',
              fontSize: '12px',
              minWidth: '220px',
              background: '#FFFFFF',
            }}
          />
        </div>

        <div className="table-responsive admin-scroll-panel" style={{ ...stockScrollStyle, flex: 1, maxHeight: 'none' }}>
          <table className="admin-table" style={{ margin: 0, minWidth: '640px' }}>
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Scope</th>
                <th>Applies To</th>
                <th>Material</th>
                <th>Used Per Item</th>
                <th style={{ width: '100px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((row) => {
                const isCat = Boolean(row.category_id)
                const targetName = isCat ? (row.category?.name || row.category_id) : (row.product?.name || row.product_id)
                return (
                  <tr key={row.id}>
                    <td>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: isCat ? '#EBF5FF' : '#F3E8FF',
                          color: isCat ? '#1D4ED8' : '#7E22CE',
                        }}
                      >
                        {isCat ? 'Category' : 'Product'}
                      </span>
                    </td>
                    <td><strong>{targetName}</strong></td>
                    <td>{row.material?.name || row.material_id}</td>
                    <td>{row.quantity_per_item} {row.material?.unit || ''}</td>
                    <td>
                      <button type="button" className="btn btn--outline btn--sm" onClick={() => deleteCategoryMaterial(row)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredRules.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                    {data.categoryMaterials?.length === 0
                      ? 'No material rules mapped yet. Click "+ Map Material" to map raw materials.'
                      : 'No rules match the current filter or search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...stockPanelStyle, height: '330px' }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--cocoa-dark)' }}>Recent Stock Movements</h3>
        <div className="table-responsive admin-scroll-panel" style={{ ...stockScrollStyle, flex: 1, maxHeight: 'none' }}>
          <table className="admin-table" style={{ margin: 0, minWidth: '760px' }}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Material</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Balance</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.movements.map((move) => (
                <tr key={move.id}>
                  <td>{new Date(move.created_at).toLocaleString()}</td>
                  <td>{move.material?.name || move.material_id}</td>
                  <td>{move.type}</td>
                  <td style={{ color: Number(move.quantity) < 0 ? '#BA1B1B' : '#2E6F40', fontWeight: 900 }}>{move.quantity}</td>
                  <td>{move.balance_after}</td>
                  <td>{move.reason || '-'}</td>
                </tr>
              ))}
              {data.movements.length === 0 && (
                <tr><td colSpan={6} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No stock movements yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {materialDialogOpen && (
        <StockDialog
          title={editingMaterial ? 'Edit Raw Material' : 'Add Raw Material'}
          note={editingMaterial ? 'Update material name, unit, minimum stock, or supplier.' : 'Create stock items like Bun, Cream, Chocolate Sauce, Packing Box, or Spoon.'}
          onClose={() => {
            setMaterialDialogOpen(false)
            setEditingMaterial(null)
          }}
        >
          <form onSubmit={saveMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input className="form-input" placeholder="Material name eg. Bun, Cream, Chocolate sauce" value={materialForm.name} onChange={(e) => setMaterialForm((p) => ({ ...p, name: e.target.value }))} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <select
                className="form-input"
                value={materialForm.unit}
                onChange={(e) => setMaterialForm((p) => ({ ...p, unit: e.target.value }))}
                style={{ background: '#FFFFFF' }}
              >
                {MATERIAL_UNITS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              <input className="form-input" type="number" min="0" step="0.001" placeholder={editingMaterial ? 'Current stock' : 'Opening stock'} value={materialForm.currentStock} disabled={Boolean(editingMaterial)} onChange={(e) => setMaterialForm((p) => ({ ...p, currentStock: e.target.value }))} />
            </div>
            {editingMaterial && (
              <div style={{ marginTop: '-4px', color: 'var(--text-muted)', fontSize: '12px' }}>
                Use Stock In / Out in the table to change current stock quantity.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input className="form-input" type="number" min="0" step="0.001" placeholder="Minimum stock" value={materialForm.minStock} onChange={(e) => setMaterialForm((p) => ({ ...p, minStock: e.target.value }))} />
              <input className="form-input" placeholder="Supplier optional" value={materialForm.supplier} onChange={(e) => setMaterialForm((p) => ({ ...p, supplier: e.target.value }))} />
            </div>
            <button type="submit" className="btn btn--gold btn--full" disabled={saving}>
              {saving ? 'Saving...' : editingMaterial ? 'Update Material' : 'Save Material'}
            </button>
          </form>
        </StockDialog>
      )}

      {recipeDialogOpen && (
        <StockDialog
          title="Map Raw Material"
          note="Select which categories or products use this raw material, and specify how much is consumed per item sold."
          maxWidth="580px"
          onClose={() => setRecipeDialogOpen(false)}
        >
          <form onSubmit={saveCategoryMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Step 1: Select Raw Material */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cocoa-dark)', display: 'block', marginBottom: '4px' }}>
                1. Select Raw Material
              </label>
              <select
                className="form-input"
                value={recipeMaterialId}
                disabled={!hasMaterials}
                onChange={(e) => setRecipeMaterialId(e.target.value)}
                style={!hasMaterials ? { color: 'var(--text-muted)', borderColor: '#BA1B1B', background: '#FFF7F7' } : { background: '#FFFFFF' }}
              >
                {!hasMaterials && <option value="">Add a raw material first</option>}
                {data.materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit}) — Current Stock: {m.current_stock} {m.unit}
                  </option>
                ))}
              </select>
            </div>

            {!hasMaterials && (
              <div style={{ background: '#FDE8E8', color: '#BA1B1B', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 800 }}>
                No raw materials added yet. Add a raw material first before mapping.
              </div>
            )}

            {/* Step 2: Target Scope Switcher (Categories vs Products) */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cocoa-dark)', display: 'block', marginBottom: '6px' }}>
                2. Applicable To: Categories or Products (Multi-Select)
              </label>
              <div style={{ display: 'flex', gap: '8px', background: '#F5EBE1', padding: '4px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRecipeTargetMode('CATEGORY')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: recipeTargetMode === 'CATEGORY' ? 800 : 600,
                    background: recipeTargetMode === 'CATEGORY' ? 'var(--cocoa-dark, #3D251E)' : 'transparent',
                    color: recipeTargetMode === 'CATEGORY' ? '#FFFFFF' : 'var(--cocoa-dark, #3D251E)',
                    transition: 'all 0.15s',
                  }}
                >
                  📁 Categories ({data.categories?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setRecipeTargetMode('PRODUCT')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: recipeTargetMode === 'PRODUCT' ? 800 : 600,
                    background: recipeTargetMode === 'PRODUCT' ? 'var(--cocoa-dark, #3D251E)' : 'transparent',
                    color: recipeTargetMode === 'PRODUCT' ? '#FFFFFF' : 'var(--cocoa-dark, #3D251E)',
                    transition: 'all 0.15s',
                  }}
                >
                  🧁 Specific Products ({data.products?.length || 0})
                </button>
              </div>
            </div>

            {/* Multi-Select Toolbar & List */}
            <div style={{ border: '1px solid rgba(61,37,30,0.12)', borderRadius: '12px', padding: '10px', background: '#FAFAFA' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder={recipeTargetMode === 'CATEGORY' ? "Search categories (e.g. Waffles, Brownies)..." : "Search products..."}
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(61,37,30,0.15)',
                    background: '#FFFFFF',
                  }}
                />
                {recipeTargetMode === 'PRODUCT' && (
                  <select
                    value={recipeProductCategoryFilter}
                    onChange={(e) => setRecipeProductCategoryFilter(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(61,37,30,0.15)',
                      background: '#FFFFFF',
                      maxWidth: '120px',
                    }}
                  >
                    <option value="ALL">All Categories</option>
                    {data.categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={recipeTargetMode === 'CATEGORY' ? toggleSelectAllCategories : toggleSelectAllProducts}
                  style={{ whiteSpace: 'nowrap', fontSize: '11px', padding: '6px 10px' }}
                >
                  {(recipeTargetMode === 'CATEGORY'
                    ? (filteredCategories.length > 0 && filteredCategories.every((c) => selectedCategoryIds.includes(c.id)))
                    : (filteredProducts.length > 0 && filteredProducts.every((p) => selectedProductIds.includes(p.id))))
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
                {(recipeTargetMode === 'CATEGORY' ? selectedCategoryIds.length : selectedProductIds.length) > 0 && (
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => (recipeTargetMode === 'CATEGORY' ? setSelectedCategoryIds([]) : setSelectedProductIds([]))}
                    style={{ whiteSpace: 'nowrap', fontSize: '11px', padding: '6px 8px', background: 'rgba(186,27,27,0.08)', color: '#BA1B1B' }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Scrollable Checkbox List */}
              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  borderRadius: '8px',
                  border: '1px solid rgba(61,37,30,0.08)',
                  background: '#FFFFFF',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {recipeTargetMode === 'CATEGORY' ? (
                  filteredCategories.map((c) => {
                    const isChecked = selectedCategoryIds.includes(c.id)
                    return (
                      <label
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isChecked ? 'rgba(218, 165, 32, 0.12)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategory(c.id)}
                          style={{ width: '16px', height: '16px', accentColor: '#C99700', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: isChecked ? 700 : 500, fontSize: '13px', color: 'var(--cocoa-dark)', flex: 1 }}>
                          {c.name}
                        </span>
                        {c.color && (
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: c.color,
                              display: 'inline-block',
                            }}
                          />
                        )}
                      </label>
                    )
                  })
                ) : (
                  filteredProducts.map((p) => {
                    const isChecked = selectedProductIds.includes(p.id)
                    return (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isChecked ? 'rgba(218, 165, 32, 0.12)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleProduct(p.id)}
                          style={{ width: '16px', height: '16px', accentColor: '#C99700', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: isChecked ? 700 : 500, fontSize: '13px', color: 'var(--cocoa-dark)', flex: 1 }}>
                          {p.name}
                        </span>
                        {p.categoryName && (
                          <span style={{ fontSize: '11px', background: '#F5EBE1', color: 'var(--cocoa-dark)', padding: '2px 6px', borderRadius: '4px' }}>
                            {p.categoryName}
                          </span>
                        )}
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                          ₹{p.price}
                        </span>
                      </label>
                    )
                  })
                )}
                {((recipeTargetMode === 'CATEGORY' ? filteredCategories.length : filteredProducts.length) === 0) && (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No items found matching "{recipeSearch}".
                  </div>
                )}
              </div>

              {/* Selected Pills Summary */}
              {((recipeTargetMode === 'CATEGORY' ? selectedCategoryIds.length : selectedProductIds.length) > 0) && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cocoa-dark)', marginRight: '4px' }}>
                    ✓ Selected ({(recipeTargetMode === 'CATEGORY' ? selectedCategoryIds.length : selectedProductIds.length)}):
                  </span>
                  {(recipeTargetMode === 'CATEGORY' ? selectedCategoryIds : selectedProductIds).slice(0, 8).map((id) => {
                    const item = recipeTargetMode === 'CATEGORY'
                      ? data.categories.find((c) => c.id === id)
                      : data.products.find((p) => p.id === id)
                    if (!item) return null
                    return (
                      <span
                        key={id}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          background: 'rgba(218, 165, 32, 0.18)',
                          color: 'var(--cocoa-dark)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {item.name}
                        <button
                          type="button"
                          onClick={() => (recipeTargetMode === 'CATEGORY' ? toggleCategory(id) : toggleProduct(id))}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontSize: '12px', lineHeight: 1, color: '#BA1B1B' }}
                        >
                          ×
                        </button>
                      </span>
                    )
                  })}
                  {(recipeTargetMode === 'CATEGORY' ? selectedCategoryIds.length : selectedProductIds.length) > 8 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                      +{(recipeTargetMode === 'CATEGORY' ? selectedCategoryIds.length : selectedProductIds.length) - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Quantity per sold item */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cocoa-dark)', display: 'block', marginBottom: '4px' }}>
                3. Quantity Used Per Sold Item {selectedMaterial?.unit ? `(${selectedMaterial.unit})` : ''}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  className="form-input"
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder={`e.g. 1 ${selectedMaterial?.unit || 'box'}`}
                  value={recipeQuantityPerItem}
                  onChange={(e) => setRecipeQuantityPerItem(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
                {selectedMaterial?.unit && (
                  <span
                    style={{
                      fontWeight: 800,
                      color: 'var(--cocoa-dark)',
                      background: '#F5EBE1',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selectedMaterial.unit}
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                When any item from the selected {recipeTargetMode === 'CATEGORY' ? 'categories' : 'products'} is sold, {recipeQuantityPerItem || 'this quantity'} {selectedMaterial?.unit || ''} will be deducted automatically from stock.
              </p>
            </div>

            {/* Submit Button */}
            {(() => {
              const currentCount = recipeTargetMode === 'CATEGORY' ? selectedCategoryIds.length : selectedProductIds.length
              return (
                <button
                  type="submit"
                  className="btn btn--gold btn--full"
                  disabled={saving || !hasMaterials || currentCount === 0 || !recipeQuantityPerItem}
                  style={{ padding: '10px 16px', fontWeight: 800, fontSize: '14px' }}
                >
                  {saving
                    ? 'Saving Mappings...'
                    : currentCount === 0
                    ? 'Select at least 1 category or product above'
                    : `Save Mapping to ${currentCount} ${recipeTargetMode === 'CATEGORY' ? (currentCount === 1 ? 'Category' : 'Categories') : (currentCount === 1 ? 'Product' : 'Products')}`}
                </button>
              )
            })()}
          </form>
        </StockDialog>
      )}
    </div>
  )
}
