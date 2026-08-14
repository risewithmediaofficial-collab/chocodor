import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../api/client'
import { formatPrice } from '../data/content'
import { useMouseTilt } from '../hooks/useMouseTilt'
import RoyaltyPreview from '../components/home/RoyaltyPreview'
import RoyaltySteps from '../components/home/RoyaltySteps'

export default function RoyaltyPage() {
  const { customer, royalty, openLogin, openRegister, refreshProfile } = useAuth()
  const { ref: cardRef, handleMove, handleLeave } = useMouseTilt(8)

  const [cardData, setCardData] = useState(null)
  const [rewardsData, setRewardsData] = useState({ rewards: [], myRedemptions: [] })
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => {
    if (!customer) return

    async function loadData() {
      setLoading(true)
      try {
        const [cardRes, rewardsRes, txRes] = await Promise.all([
          apiRequest('/royalty/card').catch(() => ({ member: null })),
          apiRequest('/royalty/rewards').catch(() => ({ rewards: [], myRedemptions: [] })),
          apiRequest('/royalty/transactions').catch(() => ({ transactions: [] })),
        ])
        setCardData(cardRes.member)
        setRewardsData(rewardsRes)
        setTransactions(txRes.transactions || [])
      } catch (err) {
        console.error('Failed to load royalty data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [customer])

  const handleRedeem = async (rewardId) => {
    setActionMsg('')
    try {
      const res = await apiRequest('/royalty/redeem', {
        method: 'POST',
        body: { rewardId },
      })
      setActionMsg(`🎉 Reward redeemed! Your single-use coupon is ${res.redemptionCode}`)
      refreshProfile()
      const [rewardsRes, txRes, cardRes] = await Promise.all([
        apiRequest('/royalty/rewards'),
        apiRequest('/royalty/transactions'),
        apiRequest('/royalty/card'),
      ])
      setRewardsData(rewardsRes)
      setTransactions(txRes.transactions || [])
      setCardData(cardRes.member)
    } catch (err) {
      setActionMsg(`⚠️ ${err.message}`)
    }
  }

  return (
    <main className="page page--royalty">
      <div className="container">
        <header className="page-header page-header--center">
          <span className="section-label section-label--eyebrow">EXCLUSIVE MEMBER CLUB</span>
          <h1 className="page-title">CHOCO D&apos;OR ROYALTY</h1>
          <p className="page-desc">
            More than chocolate. More to enjoy. Collect points on every dessert, unlock sweet discount vouchers, and enjoy priority tasting experiences.
          </p>
        </header>

        {actionMsg && (
          <div style={{ maxWidth: '640px', margin: '0 auto 24px', padding: '14px 20px', borderRadius: '12px', background: '#FAF0E4', border: '1px solid rgba(179,123,36,0.3)', fontWeight: 700, fontSize: '14px', color: 'var(--cocoa-dark)', textAlign: 'center' }}>
            {actionMsg}
          </div>
        )}

        {/* If logged in: Show Member Digital Card & QR */}
        {customer ? (
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div
              className="royalty-preview__card-wrap"
              onMouseMove={handleMove}
              onMouseLeave={handleLeave}
              style={{ margin: '0 auto 36px' }}
            >
              <div ref={cardRef} className="royalty-card">
                <div className="royalty-card__shine" aria-hidden="true" />
                <div className="royalty-card__front">
                  <div className="royalty-card__top">
                    <div>
                      <span className="royalty-card__brand">CHOCO D&apos;OR</span>
                      <span className="royalty-card__tag">ROYALTY CARD</span>
                    </div>
                    <div className="royalty-card__chip">
                      <div className="royalty-card__chip-lines" />
                    </div>
                  </div>

                  <div className="royalty-card__middle">
                    <span className="royalty-card__number">{cardData?.royaltyId || royalty?.royaltyId}</span>
                    <div className="royalty-card__tier-badge">
                      <span>👑 {royalty?.tier || 'GOLD MEMBER'}</span>
                    </div>
                  </div>

                  <div className="royalty-card__bottom">
                    <div>
                      <span className="royalty-card__label">MEMBER NAME</span>
                      <span className="royalty-card__holder">{customer.name.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="royalty-card__label">POINTS BALANCE</span>
                      <span className="royalty-card__pts">{cardData?.currentPoints || royalty?.currentPoints || 0} PTS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Pass */}
            {cardData?.qrCode && (
              <div style={{ background: '#FFFFFF', maxWidth: '340px', margin: '0 auto 40px', padding: '24px', borderRadius: '24px', border: '1px solid rgba(61,37,30,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--cocoa-dark)', margin: '0 0 12px' }}>
                  Member In-Store Pass
                </h4>
                <img src={cardData.qrCode} alt="Royalty Member QR Code" style={{ width: '160px', height: '160px', margin: '0 auto', display: 'block' }} />
                <span style={{ display: 'block', fontFamily: 'monospace', fontWeight: 800, marginTop: '8px', color: 'var(--cocoa-dark)' }}>
                  {cardData.royaltyId}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: '60px' }}>
            <RoyaltyPreview />
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button type="button" className="btn btn--gold" onClick={openRegister}>
                Join Royalty Club (Free) →
              </button>
            </div>
          </div>
        )}

        <RoyaltySteps />

        {/* Rewards Section */}
        <div style={{ marginTop: '80px' }}>
          <header className="page-header page-header--center">
            <span className="section-label">REWARDS PROGRAMME</span>
            <h2 className="section-title">Redeem Your Points</h2>
            <p className="page-desc">
              Convert your earned Royalty points into instant discount vouchers for your orders.
            </p>
          </header>

          <div className="signatures__grid" style={{ marginBottom: '60px' }}>
            {rewardsData.rewards?.map((r) => (
              <div key={r.id} className="signature-card" style={{ background: '#FFFFFF' }}>
                <div className="signature-card__tag-wrap">
                  <span className="signature-card__tag">👑 {r.pointsRequired} Points</span>
                </div>
                <div style={{ padding: '28px' }}>
                  <h3 className="signature-card__name" style={{ fontSize: '1.4rem' }}>{r.name}</h3>
                  <p className="signature-card__desc">{r.description}</p>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '14px 0' }}>
                    Min. Order Value: {formatPrice(r.minOrderValue)}
                  </div>
                  {customer ? (
                    <button
                      type="button"
                      disabled={!r.canRedeem}
                      className="btn btn--gold btn--full"
                      onClick={() => handleRedeem(r.id)}
                    >
                      {r.canRedeem ? `Redeem for ${r.pointsRequired} Pts` : `Need ${r.pointsRequired - (royalty?.currentPoints || 0)} More Pts`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--gold btn--full"
                      onClick={openLogin}
                    >
                      Sign In to Redeem
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ledger Table if logged in */}
        {customer && transactions.length > 0 && (
          <div style={{ marginTop: '60px' }}>
            <header className="page-header">
              <span className="section-label">TRANSACTION AUDIT</span>
              <h2 className="section-title">Your Points History</h2>
            </header>

            <div style={{ background: '#FFFFFF', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(61,37,30,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FAF6F0', borderBottom: '1px solid rgba(61,37,30,0.08)' }}>
                    <th style={{ padding: '14px 18px' }}>Date</th>
                    <th style={{ padding: '14px 18px' }}>Reason / Reference</th>
                    <th style={{ padding: '14px 18px' }}>Type</th>
                    <th style={{ padding: '14px 18px' }}>Amount</th>
                    <th style={{ padding: '14px 18px' }}>Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid rgba(61,37,30,0.06)' }}>
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--cocoa-dark)' }}>
                        {tx.reason}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', background: '#FAF0E4', color: 'var(--cocoa-dark)' }}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: tx.direction === 'CREDIT' ? '#2E6F40' : '#BA1B1B' }}>
                        {tx.direction === 'CREDIT' ? `+${tx.amount}` : `-${tx.amount}`} PTS
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--cocoa-dark)' }}>
                        {tx.balance_after} PTS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
