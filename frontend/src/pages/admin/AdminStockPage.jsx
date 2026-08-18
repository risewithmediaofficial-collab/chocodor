import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../api/client'

export default function AdminStockPage() {
  const [data, setData] = useState({ categories: [], materials: [], categoryMaterials: [], movements: [] })
  const [loading, setLoading] = useState(true)
  const [materialForm, setMaterialForm] = useState({ name: '', unit: 'pcs', currentStock: '', minStock: '', supplier: '' })
  const [recipeForm, setRecipeForm] = useState({ categoryId: '', materialId: '', quantityPerItem: '' })
  const [adjustForms, setAdjustForms] = useState({})
  const [saving, setSaving] = useState(false)

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

  const createMaterial = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      await apiRequest('/admin/stock/materials', {
        method: 'POST',
        isAdmin: true,
        body: materialForm,
      })
      setMaterialForm({ name: '', unit: 'pcs', currentStock: '', minStock: '', supplier: '' })
      await loadStock()
    } catch (err) {
      alert(`Material save failed: ${err.message}`)
    } finally {
      setSaving(false)
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
            Add raw materials, map them to categories, and auto-deduct stock when KOT/orders are created.
          </p>
        </div>
        <button type="button" className="btn btn--outline btn--sm" onClick={loadStock}>
          Refresh
        </button>
      </div>

      {lowStock.length > 0 && (
        <div style={{ background: '#FDE8E8', color: '#BA1B1B', padding: '12px 16px', borderRadius: '12px', fontWeight: 800, fontSize: '13px' }}>
          Low stock: {lowStock.map((m) => `${m.name} (${m.current_stock} ${m.unit})`).join(', ')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: '16px', alignItems: 'start' }}>
        <form onSubmit={createMaterial} style={{ background: '#FFFFFF', border: '1px solid rgba(61,37,30,0.1)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: 0, color: 'var(--cocoa-dark)' }}>Add Raw Material</h3>
          <input className="form-input" placeholder="Material name eg. Bun, Cream, Chocolate sauce" value={materialForm.name} onChange={(e) => setMaterialForm((p) => ({ ...p, name: e.target.value }))} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input className="form-input" placeholder="Unit eg. pcs, g, ml" value={materialForm.unit} onChange={(e) => setMaterialForm((p) => ({ ...p, unit: e.target.value }))} />
            <input className="form-input" type="number" min="0" step="0.001" placeholder="Opening stock" value={materialForm.currentStock} onChange={(e) => setMaterialForm((p) => ({ ...p, currentStock: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input className="form-input" type="number" min="0" step="0.001" placeholder="Minimum stock" value={materialForm.minStock} onChange={(e) => setMaterialForm((p) => ({ ...p, minStock: e.target.value }))} />
            <input className="form-input" placeholder="Supplier optional" value={materialForm.supplier} onChange={(e) => setMaterialForm((p) => ({ ...p, supplier: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn--gold btn--full" disabled={saving}>Save Material</button>
        </form>

        <div style={{ background: '#FFFFFF', border: '1px solid rgba(61,37,30,0.1)', borderRadius: '16px', padding: '16px' }}>
          <h3 style={{ margin: '0 0 12px', color: 'var(--cocoa-dark)' }}>Current Raw Material Stock</h3>
          <div className="table-responsive">
            <table className="admin-table" style={{ margin: 0, minWidth: '720px' }}>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Stock</th>
                  <th>Min</th>
                  <th>Supplier</th>
                  <th>Stock In / Out</th>
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: '16px', alignItems: 'start' }}>
        <form onSubmit={saveCategoryMaterial} style={{ background: '#FFFFFF', border: '1px solid rgba(61,37,30,0.1)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: 0, color: 'var(--cocoa-dark)' }}>Map Material to Category</h3>
          <select className="form-input" value={recipeForm.categoryId} onChange={(e) => setRecipeForm((p) => ({ ...p, categoryId: e.target.value }))}>
            {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="form-input" value={recipeForm.materialId} onChange={(e) => setRecipeForm((p) => ({ ...p, materialId: e.target.value }))}>
            {data.materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
          </select>
          <input className="form-input" type="number" min="0" step="0.001" placeholder="Quantity used per sold item" value={recipeForm.quantityPerItem} onChange={(e) => setRecipeForm((p) => ({ ...p, quantityPerItem: e.target.value }))} required />
          <button type="submit" className="btn btn--gold btn--full" disabled={saving || data.materials.length === 0}>Save Category Material</button>
        </form>

        <div style={{ background: '#FFFFFF', border: '1px solid rgba(61,37,30,0.1)', borderRadius: '16px', padding: '16px' }}>
          <h3 style={{ margin: '0 0 12px', color: 'var(--cocoa-dark)' }}>Category Material Rules</h3>
          <div className="table-responsive">
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
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid rgba(61,37,30,0.1)', borderRadius: '16px', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--cocoa-dark)' }}>Recent Stock Movements</h3>
        <div className="table-responsive">
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
    </div>
  )
}
