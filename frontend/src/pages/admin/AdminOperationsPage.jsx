import { useEffect, useState } from 'react'
import { apiRequest } from '../../api/client'
import { formatPrice } from '../../data/content'

const today = () => new Date().toISOString().slice(0, 10)

export default function AdminOperationsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tableForm, setTableForm] = useState({ name: '', capacity: 2, notes: '' })
  const [expenseForm, setExpenseForm] = useState({ date: today(), category: '', amount: '', paidBy: 'CASH', notes: '' })
  const [purchaseForm, setPurchaseForm] = useState({ materialId: '', vendor: '', invoiceNo: '', quantity: '', unitCost: '' })
  const [wastageForm, setWastageForm] = useState({ materialId: '', quantity: '', reason: '' })
  const [shiftForm, setShiftForm] = useState({ staffName: '', openingCash: '' })
  const [closeShiftForm, setCloseShiftForm] = useState({ shiftId: '', cashSales: '', upiSales: '', cardSales: '', expenses: '', closingCash: '' })
  const [feedbackForm, setFeedbackForm] = useState({ customerName: '', mobile: '', rating: 5, feedback: '' })
  const materials = data?.materials || []
  const openShifts = (data?.shifts || []).filter((shift) => shift.status === 'OPEN')

  const load = async () => {
    try {
      setLoading(true)
      const res = await apiRequest('/admin/operations', { isAdmin: true })
      setData(res)
      const firstMaterial = res.materials?.[0]?.id || ''
      setPurchaseForm((prev) => ({ ...prev, materialId: prev.materialId || firstMaterial }))
      setWastageForm((prev) => ({ ...prev, materialId: prev.materialId || firstMaterial }))
      setCloseShiftForm((prev) => ({ ...prev, shiftId: prev.shiftId || res.shifts?.find((s) => s.status === 'OPEN')?.id || '' }))
    } catch (err) {
      alert(`Operations load failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (endpoint, body, reset) => {
    try {
      await apiRequest(endpoint, { method: 'POST', isAdmin: true, body })
      if (reset) reset()
      await load()
    } catch (err) {
      alert(err.message)
    }
  }

  const patch = async (endpoint, body) => {
    try {
      await apiRequest(endpoint, { method: 'PATCH', isAdmin: true, body })
      await load()
    } catch (err) {
      alert(err.message)
    }
  }

  const removeTable = async (table) => {
    if (!window.confirm(`Delete ${table.name}?`)) return
    try {
      await apiRequest(`/admin/operations/tables/${table.id}`, { method: 'DELETE', isAdmin: true })
      await load()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div style={{ padding: '40px' }}>Loading operations...</div>

  const profit = data?.profit || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--cocoa-dark)', margin: 0 }}>
          Operations Control
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          Tables, purchases, wastage, expenses, shift handover, feedback, and daily profit.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
        {[
          ['Today Revenue', formatPrice(profit.revenue || 0), '#2E6F40'],
          ['Purchases', formatPrice(profit.purchases || 0), 'var(--cocoa-dark)'],
          ['Expenses', formatPrice(profit.expenses || 0), '#BA1B1B'],
          ['Estimated Profit', formatPrice(profit.estimatedProfit || 0), profit.estimatedProfit >= 0 ? '#2E6F40' : '#BA1B1B'],
          ['Units Sold', profit.unitsSold || 0, 'var(--caramel)'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: '#FFFFFF', border: '1px solid rgba(61,37,30,0.1)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color, fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      <section style={{ background: '#FFFFFF', border: '1px solid rgba(61,37,30,0.1)', borderRadius: '16px', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--cocoa-dark)' }}>Table Management</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit('/admin/operations/tables', tableForm, () => setTableForm({ name: '', capacity: 2, notes: '' }))
          }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr auto', gap: '8px', marginBottom: '14px' }}
        >
          <input className="form-input" placeholder="Table name eg. Table 1" value={tableForm.name} onChange={(e) => setTableForm((p) => ({ ...p, name: e.target.value }))} required />
          <input className="form-input" type="number" min="1" placeholder="Seats" value={tableForm.capacity} onChange={(e) => setTableForm((p) => ({ ...p, capacity: e.target.value }))} />
          <input className="form-input" placeholder="Notes optional" value={tableForm.notes} onChange={(e) => setTableForm((p) => ({ ...p, notes: e.target.value }))} />
          <button className="btn btn--gold btn--sm" type="submit">Add Table</button>
        </form>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
          {(data.tables || []).map((table) => (
            <div key={table.id} style={{ border: '1px solid rgba(61,37,30,0.1)', borderRadius: '12px', padding: '12px', background: table.status === 'EMPTY' ? '#FFFFFF' : '#FAF0E4' }}>
              <strong>{table.name}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{table.capacity} seats</div>
              <select className="form-input" value={table.status} onChange={(e) => patch(`/admin/operations/tables/${table.id}`, { status: e.target.value })} style={{ marginTop: '8px', padding: '7px 10px', background: '#FFFFFF' }}>
                <option value="EMPTY">Empty</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="BILL_PENDING">Bill Pending</option>
                <option value="RESERVED">Reserved</option>
              </select>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button type="button" className="btn btn--outline btn--sm" onClick={() => patch(`/admin/operations/tables/${table.id}`, { status: 'EMPTY', activeOrderId: '' })}>Clear</button>
                <button type="button" className="btn btn--sm" style={{ background: 'rgba(186,27,27,0.1)', color: '#BA1B1B' }} onClick={() => removeTable(table)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <Panel title="Purchase Entry">
          <form onSubmit={(e) => { e.preventDefault(); submit('/admin/operations/purchases', purchaseForm, () => setPurchaseForm((p) => ({ ...p, vendor: '', invoiceNo: '', quantity: '', unitCost: '' }))) }} style={{ display: 'grid', gap: '8px' }}>
            <select className="form-input" value={purchaseForm.materialId} onChange={(e) => setPurchaseForm((p) => ({ ...p, materialId: e.target.value }))}>{materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select>
            <input className="form-input" placeholder="Vendor" value={purchaseForm.vendor} onChange={(e) => setPurchaseForm((p) => ({ ...p, vendor: e.target.value }))} />
            <input className="form-input" placeholder="Invoice no" value={purchaseForm.invoiceNo} onChange={(e) => setPurchaseForm((p) => ({ ...p, invoiceNo: e.target.value }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input className="form-input" type="number" min="0" step="0.001" placeholder="Qty" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm((p) => ({ ...p, quantity: e.target.value }))} required />
              <input className="form-input" type="number" min="0" step="0.01" placeholder="Unit cost" value={purchaseForm.unitCost} onChange={(e) => setPurchaseForm((p) => ({ ...p, unitCost: e.target.value }))} />
            </div>
            <button className="btn btn--gold btn--full" type="submit">Save Purchase & Increase Stock</button>
          </form>
        </Panel>

        <Panel title="Wastage Entry">
          <form onSubmit={(e) => { e.preventDefault(); submit('/admin/operations/wastage', wastageForm, () => setWastageForm((p) => ({ ...p, quantity: '', reason: '' }))) }} style={{ display: 'grid', gap: '8px' }}>
            <select className="form-input" value={wastageForm.materialId} onChange={(e) => setWastageForm((p) => ({ ...p, materialId: e.target.value }))}>{materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select>
            <input className="form-input" type="number" min="0" step="0.001" placeholder="Wasted quantity" value={wastageForm.quantity} onChange={(e) => setWastageForm((p) => ({ ...p, quantity: e.target.value }))} required />
            <input className="form-input" placeholder="Reason eg. expired, damaged" value={wastageForm.reason} onChange={(e) => setWastageForm((p) => ({ ...p, reason: e.target.value }))} />
            <button className="btn btn--gold btn--full" type="submit">Save Wastage & Reduce Stock</button>
          </form>
        </Panel>

        <Panel title="Expense Tracking">
          <form onSubmit={(e) => { e.preventDefault(); submit('/admin/operations/expenses', expenseForm, () => setExpenseForm({ date: today(), category: '', amount: '', paidBy: 'CASH', notes: '' })) }} style={{ display: 'grid', gap: '8px' }}>
            <input className="form-input" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))} />
            <input className="form-input" placeholder="Category eg. salary, rent, petrol" value={expenseForm.category} onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="Amount" value={expenseForm.amount} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))} required />
              <select className="form-input" value={expenseForm.paidBy} onChange={(e) => setExpenseForm((p) => ({ ...p, paidBy: e.target.value }))}><option>CASH</option><option>UPI</option><option>CARD</option></select>
            </div>
            <input className="form-input" placeholder="Notes" value={expenseForm.notes} onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))} />
            <button className="btn btn--gold btn--full" type="submit">Save Expense</button>
          </form>
        </Panel>

        <Panel title="Cashier Shift Handover">
          <form onSubmit={(e) => { e.preventDefault(); submit('/admin/operations/shifts', shiftForm, () => setShiftForm({ staffName: '', openingCash: '' })) }} style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
            <input className="form-input" placeholder="Staff name" value={shiftForm.staffName} onChange={(e) => setShiftForm((p) => ({ ...p, staffName: e.target.value }))} required />
            <input className="form-input" type="number" min="0" placeholder="Opening cash" value={shiftForm.openingCash} onChange={(e) => setShiftForm((p) => ({ ...p, openingCash: e.target.value }))} />
            <button className="btn btn--outline btn--full" type="submit">Open Shift</button>
          </form>
          <form onSubmit={(e) => { e.preventDefault(); patch(`/admin/operations/shifts/${closeShiftForm.shiftId}/close`, closeShiftForm) }} style={{ display: 'grid', gap: '8px' }}>
            <select className="form-input" value={closeShiftForm.shiftId} onChange={(e) => setCloseShiftForm((p) => ({ ...p, shiftId: e.target.value }))}>{openShifts.map((s) => <option key={s.id} value={s.id}>{s.staff_name}</option>)}</select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {['cashSales', 'upiSales', 'cardSales', 'expenses', 'closingCash'].map((key) => (
                <input key={key} className="form-input" type="number" min="0" placeholder={key.replace(/[A-Z]/g, ' $&')} value={closeShiftForm[key]} onChange={(e) => setCloseShiftForm((p) => ({ ...p, [key]: e.target.value }))} />
              ))}
            </div>
            <button className="btn btn--gold btn--full" type="submit" disabled={!closeShiftForm.shiftId}>Close Shift</button>
          </form>
        </Panel>

        <Panel title="Customer Feedback">
          <form onSubmit={(e) => { e.preventDefault(); submit('/admin/operations/feedback', feedbackForm, () => setFeedbackForm({ customerName: '', mobile: '', rating: 5, feedback: '' })) }} style={{ display: 'grid', gap: '8px' }}>
            <input className="form-input" placeholder="Customer name" value={feedbackForm.customerName} onChange={(e) => setFeedbackForm((p) => ({ ...p, customerName: e.target.value }))} />
            <input className="form-input" placeholder="Mobile optional" value={feedbackForm.mobile} onChange={(e) => setFeedbackForm((p) => ({ ...p, mobile: e.target.value }))} />
            <select className="form-input" value={feedbackForm.rating} onChange={(e) => setFeedbackForm((p) => ({ ...p, rating: e.target.value }))}>{[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} stars</option>)}</select>
            <textarea className="form-input" rows={2} placeholder="Feedback" value={feedbackForm.feedback} onChange={(e) => setFeedbackForm((p) => ({ ...p, feedback: e.target.value }))} />
            <button className="btn btn--gold btn--full" type="submit">Save Feedback</button>
          </form>
        </Panel>
      </div>

      <section style={{ background: '#FFFFFF', border: '1px solid rgba(61,37,30,0.1)', borderRadius: '16px', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--cocoa-dark)' }}>Recent Operations Logs</h3>
        <div className="table-responsive">
          <table className="admin-table" style={{ margin: 0, minWidth: '760px' }}>
            <thead><tr><th>Type</th><th>Details</th><th>Amount/Qty</th><th>Time</th></tr></thead>
            <tbody>
              {[...(data.purchases || []).map((p) => ({ type: 'Purchase', details: `${p.material?.name || p.material_id} from ${p.vendor || '-'}`, amount: `${p.quantity} ${p.material?.unit || ''} / ${formatPrice(p.total_cost || 0)}`, time: p.purchased_at })),
                ...(data.wastage || []).map((w) => ({ type: 'Wastage', details: `${w.material?.name || w.material_id}: ${w.reason || '-'}`, amount: `${w.quantity} ${w.material?.unit || ''}`, time: w.wasted_at })),
                ...(data.expenses || []).map((e) => ({ type: 'Expense', details: `${e.category} (${e.paid_by})`, amount: formatPrice(e.amount || 0), time: e.created_at })),
                ...(data.feedback || []).map((f) => ({ type: 'Feedback', details: `${f.customer_name}: ${f.feedback || '-'}`, amount: `${f.rating} stars`, time: f.created_at })),
              ].slice(0, 30).map((row, idx) => (
                <tr key={`${row.type}-${idx}`}><td>{row.type}</td><td>{row.details}</td><td>{row.amount}</td><td>{new Date(row.time).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <section style={{ background: '#FFFFFF', border: '1px solid rgba(61,37,30,0.1)', borderRadius: '16px', padding: '16px' }}>
      <h3 style={{ margin: '0 0 12px', color: 'var(--cocoa-dark)' }}>{title}</h3>
      {children}
    </section>
  )
}
