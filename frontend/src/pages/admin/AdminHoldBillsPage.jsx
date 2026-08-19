import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../../api/client'
import { formatPrice } from '../../data/content'
import InvoiceModal from '../../components/InvoiceModal'

export default function AdminHoldBillsPage() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [settlingId, setSettlingId] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState({})
  const [splitPayments, setSplitPayments] = useState({})
  const [activeInvoiceNumber, setActiveInvoiceNumber] = useState(null)

  const loadBills = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiRequest('/admin/hold-bills', { isAdmin: true })
      setBills(data.bills || [])
    } catch (err) {
      alert(`Unable to load held bills: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBills()
  }, [loadBills])

  const settleBill = async (bill) => {
    const split = splitPayments[bill.id]
    const paymentMethod = split?.enabled ? 'SPLIT' : (paymentMethods[bill.id] || 'CASH')
    const paymentBreakdown = split?.enabled
      ? [
          { method: 'CASH', amount: Number(split.cash || 0) },
          { method: 'UPI', amount: Number(split.upi || 0) },
          { method: 'CARD', amount: Number(split.card || 0) },
        ].filter((entry) => entry.amount > 0)
      : []
    if (split?.enabled) {
      const splitTotal = paymentBreakdown.reduce((sum, entry) => sum + entry.amount, 0)
      if (Math.abs(splitTotal - bill.total_amount) > 0.01) {
        alert(`Split payment must equal bill total. Balance: ${formatPrice(bill.total_amount - splitTotal)}`)
        return
      }
    }
    try {
      setSettlingId(bill.id)
      const data = await apiRequest(`/admin/orders/${bill.id}/settle-payment`, {
        method: 'PATCH',
        isAdmin: true,
        body: { paymentMethod, paymentBreakdown },
      })
      setActiveInvoiceNumber(data.invoice?.invoice_number || bill.invoice_number)
      await loadBills()
    } catch (err) {
      alert(`Settle failed: ${err.message}`)
    } finally {
      setSettlingId(null)
    }
  }

  const updateSplit = (billId, field, value) => {
    setSplitPayments((prev) => ({
      ...prev,
      [billId]: {
        cash: '',
        upi: '',
        card: '',
        enabled: false,
        ...(prev[billId] || {}),
        [field]: value,
      },
    }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--cocoa-dark)', margin: 0 }}>
            Hold Bills Dashboard
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Unpaid walk-in bills sent to KOT. Settle after kitchen marks the ticket completed.
          </p>
        </div>
        <button type="button" className="btn btn--outline btn--sm" style={{ padding: '8px 14px', fontWeight: 800 }} onClick={loadBills}>
          Refresh
        </button>
      </div>

      <div className="table-responsive admin-scroll-panel admin-scroll-panel--lg" style={{ background: '#FFFFFF', borderRadius: '18px', border: '1px solid rgba(61,37,30,0.1)' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>Loading held bills...</div>
        ) : bills.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No held bills pending payment.
          </div>
        ) : (
          <table className="admin-table" style={{ margin: 0, minWidth: '900px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#FAF6F0', zIndex: 3 }}>
              <tr>
                <th>Bill</th>
                <th>Customer</th>
                <th>Type / Table</th>
                <th>Items</th>
                <th>KOT Status</th>
                <th>Total</th>
                <th>Settle</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => {
                const kotDone = bill.kot?.status === 'COMPLETED'
                return (
                  <tr key={bill.id}>
                    <td>
                      <strong style={{ color: 'var(--cocoa-dark)' }}>{bill.order_number}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {bill.kot?.kot_number || 'KOT pending'}
                      </span>
                    </td>
                    <td>
                      <strong>{bill.customer_name}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{bill.customer_mobile}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800 }}>{bill.order_type}</span>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{bill.table_or_token_no || 'Counter'}</span>
                    </td>
                    <td style={{ maxWidth: '260px' }}>
                      {bill.items.map((item) => (
                        <div key={item.id} style={{ fontSize: '12px' }}>
                          {item.product_name_snapshot} x {item.quantity}
                        </div>
                      ))}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-pill)',
                        background: kotDone ? '#E2F0E6' : '#FDF4D8',
                        color: kotDone ? '#2E6F40' : '#8C6A12',
                      }}>
                        {bill.kot?.status || 'NEW'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 900 }}>{formatPrice(bill.total_amount)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select
                            value={paymentMethods[bill.id] || 'CASH'}
                            disabled={splitPayments[bill.id]?.enabled}
                            onChange={(e) => setPaymentMethods((prev) => ({ ...prev, [bill.id]: e.target.value }))}
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(61,37,30,0.15)', fontSize: '12px', background: '#FFFFFF' }}
                          >
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="CARD">Card</option>
                          </select>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800 }}>
                            <input
                              type="checkbox"
                              checked={Boolean(splitPayments[bill.id]?.enabled)}
                              onChange={(e) => updateSplit(bill.id, 'enabled', e.target.checked)}
                            />
                            Split
                          </label>
                        </div>
                        {splitPayments[bill.id]?.enabled && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 70px)', gap: '6px' }}>
                            {[
                              ['cash', 'Cash'],
                              ['upi', 'UPI'],
                              ['card', 'Card'],
                            ].map(([key, label]) => (
                              <input
                                key={key}
                                type="number"
                                min="0"
                                step="1"
                                value={splitPayments[bill.id]?.[key] || ''}
                                onChange={(e) => updateSplit(bill.id, key, e.target.value)}
                                placeholder={label}
                                style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(61,37,30,0.15)', fontSize: '12px' }}
                              />
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          className={kotDone ? 'btn btn--gold btn--sm' : 'btn btn--outline btn--sm'}
                          disabled={!kotDone || settlingId === bill.id}
                          style={{ padding: '7px 12px', fontSize: '12px', fontWeight: 900 }}
                          onClick={() => settleBill(bill)}
                          title={kotDone ? 'Settle payment and print bill' : 'Complete KOT before billing'}
                        >
                          {settlingId === bill.id ? 'Settling...' : 'Settle & Print'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {activeInvoiceNumber && (
        <InvoiceModal invoiceNumber={activeInvoiceNumber} onClose={() => setActiveInvoiceNumber(null)} />
      )}
    </div>
  )
}
