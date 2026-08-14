import { useState, useEffect } from 'react'
import { apiRequest } from '../../api/client'

export default function AdminRoyaltyPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [directionFilter, setDirectionFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (directionFilter) params.append('direction', directionFilter)
      if (typeFilter) params.append('type', typeFilter)

      const data = await apiRequest(`/admin/royalty/transactions?${params.toString()}`, { isAdmin: true })
      setTransactions(data.transactions || [])
    } catch (err) {
      console.error('Failed to load transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [directionFilter, typeFilter, search])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cocoa-dark)', margin: 0 }}>
            Royalty Points Ledger &amp; Audit Trail
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Immutable audit log of all point credits, debits, reward redemptions, and manual adjustments.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: '#FFFFFF', padding: '18px 24px', borderRadius: '16px', border: '1px solid rgba(61,37,30,0.1)', marginBottom: '24px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search customer, Royalty ID, reason..."
          style={{ flex: '1 1 240px', padding: '10px 16px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(61,37,30,0.15)', fontSize: '13px', fontFamily: 'inherit' }}
        />

        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(61,37,30,0.15)', fontSize: '13px', fontFamily: 'inherit', background: '#FFFFFF' }}
        >
          <option value="">All Directions</option>
          <option value="CREDIT">CREDIT (+)</option>
          <option value="DEBIT">DEBIT (−)</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(61,37,30,0.15)', fontSize: '13px', fontFamily: 'inherit', background: '#FFFFFF' }}
        >
          <option value="">All Types</option>
          <option value="ORDER_COMPLETION">ORDER_COMPLETION</option>
          <option value="REWARD_REDEMPTION">REWARD_REDEMPTION</option>
          <option value="MANUAL_ADJUSTMENT">MANUAL_ADJUSTMENT</option>
          <option value="REFUND">REFUND</option>
        </select>
      </div>

      {/* Ledger Table */}
      <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading ledger...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No ledger entries found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Customer</th>
                <th>Royalty ID</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                  <td>
                    <strong>{tx.customer_name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.customer_mobile}</div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--caramel)' }}>
                      {tx.royalty_id}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', background: '#FAF0E4', color: 'var(--cocoa-dark)' }}>
                      {tx.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{tx.reason}</td>
                  <td style={{ fontWeight: 800, color: tx.direction === 'CREDIT' ? '#2E6F40' : '#BA1B1B' }}>
                    {tx.direction === 'CREDIT' ? `+${tx.amount}` : `-${tx.amount}`} PTS
                  </td>
                  <td style={{ fontWeight: 800 }}>{tx.balance_after} PTS</td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.created_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
