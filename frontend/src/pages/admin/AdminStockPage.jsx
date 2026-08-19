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
  const [data, setData] = useState({ categories: [], materials: [], categoryMaterials: [], movements: [] })
  const [loading, setLoading] = useState(true)
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false)
  const [materialForm, setMaterialForm] = useState({ name: '', unit: 'pcs', currentStock: '', minStock: '', supplier: '' })
  const [recipeForm, setRecipeForm] = useState({ categoryId: '', materialId: '', quantityPerItem: '' })
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
      setRecipeForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || stock.categories?.[0]?.id || '',
        materialId: prev.materialId || stock.materials?.[0]?.id || '',
      }))
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

  const saveCategoryMaterial = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      await apiRequest('/admin/stock/category-materials', {
        method: 'POST',
        isAdmin: true,
        body: recipeForm,
      })
      setRecipeForm((prev) => ({ ...prev, quantityPerItem: '' }))
      setRecipeDialogOpen(false)
      await loadStock()
    } catch (err) {
      alert(`Category material save failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const deleteCategoryMaterial = async (row) => {
    if (!window.confirm(`Remove ${row.material?.name || 'material'} from ${row.category?.name || 'category'}?`)) return
    try {
      await apiRequest(`/admin/stock/category-materials/${row.id}`, { method: 'DELETE', isAdmin: true })
      await loadStock()
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    }
  }

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
          <button type="button" className="btn btn--outline btn--sm" onClick={() => setRecipeDialogOpen(true)}>
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

      <div style={{ ...stockPanelStyle, height: '300px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--cocoa-dark)' }}>Category Material Rules</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>
              Define how much raw material is used when one item from a category is sold.
            </p>
          </div>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => setRecipeDialogOpen(true)}>
            Map Material
          </button>
        </div>
        <div className="table-responsive admin-scroll-panel" style={{ ...stockScrollStyle, flex: 1, maxHeight: 'none' }}>
          <table className="admin-table" style={{ margin: 0, minWidth: '640px' }}>
            <thead>
              <tr>
                <th>Category</th>
                <th>Material</th>
                <th>Used Per Item</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.categoryMaterials.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.category?.name || row.category_id}</strong></td>
                  <td>{row.material?.name || row.material_id}</td>
                  <td>{row.quantity_per_item} {row.material?.unit || ''}</td>
                  <td><button type="button" className="btn btn--outline btn--sm" onClick={() => deleteCategoryMaterial(row)}>Remove</button></td>
                </tr>
              ))}
              {data.categoryMaterials.length === 0 && (
                <tr><td colSpan={4} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No category material rules yet.</td></tr>
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
          title="Map Material to Category"
          note="Example: Waffles can use 1 packing box and 40 g chocolate sauce per sold item."
          maxWidth="520px"
          onClose={() => setRecipeDialogOpen(false)}
        >
          <form onSubmit={saveCategoryMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <select className="form-input" value={recipeForm.categoryId} disabled={!hasCategories} onChange={(e) => setRecipeForm((p) => ({ ...p, categoryId: e.target.value }))}>
              {!hasCategories && <option value="">No categories found</option>}
              {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              className="form-input"
              value={recipeForm.materialId}
              disabled={!hasMaterials}
              onChange={(e) => setRecipeForm((p) => ({ ...p, materialId: e.target.value }))}
              style={!hasMaterials ? { color: 'var(--text-muted)', borderColor: '#BA1B1B', background: '#FFF7F7' } : undefined}
            >
              {!hasMaterials && <option value="">Add a raw material first</option>}
              {data.materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
            </select>
            {!hasMaterials && (
              <div style={{ background: '#FDE8E8', color: '#BA1B1B', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 800 }}>
                No raw materials added yet. Add one material first, then map it to a category.
              </div>
            )}
            <input className="form-input" type="number" min="0" step="0.001" placeholder="Quantity used per sold item" value={recipeForm.quantityPerItem} onChange={(e) => setRecipeForm((p) => ({ ...p, quantityPerItem: e.target.value }))} required />
            <button type="submit" className="btn btn--gold btn--full" disabled={saving || !hasMaterials || !hasCategories}>
              {saving ? 'Saving...' : 'Save Category Material'}
            </button>
          </form>
        </StockDialog>
      )}
    </div>
  )
}
