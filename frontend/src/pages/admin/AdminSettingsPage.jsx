import { useState, useEffect } from 'react'
import { apiRequest } from '../../api/client'

export default function AdminSettingsPage() {
  const [delivery, setDelivery] = useState({ standardCharge: 40, freeThreshold: 500, enabled: true })
  const [promotions, setPromotions] = useState({ firstOrderOfferEnabled: true, firstOrderDiscount: 20 })
  const [business, setBusiness] = useState({
    name: "Choco D'or",
    tagline: 'A Little Luxury In Every Bite',
    phone: '+91 98765 43210',
    address: 'Choco D\'or Confectionery Boutique, Krishnagiri, Tamil Nadu',
    gst: '33AAAAA0000A1Z5',
    fssai: '12426000000001',
  })

  const [loading, setLoading] = useState(true)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        const data = await apiRequest('/settings', { isAdmin: true })
        if (data.settings) {
          if (data.settings.delivery) setDelivery(data.settings.delivery)
          if (data.settings.promotions) setPromotions(data.settings.promotions)
          if (data.settings.business) setBusiness(data.settings.business)
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSaveDelivery = async (e) => {
    e.preventDefault()
    setSavedMsg('')
    try {
      await apiRequest('/settings/delivery', {
        method: 'PATCH',
        isAdmin: true,
        body: delivery,
      })
      setSavedMsg('✓ Delivery settings saved successfully!')
    } catch (err) {
      alert(`Save error: ${err.message}`)
    }
  }

  const handleSavePromotions = async (e) => {
    e.preventDefault()
    setSavedMsg('')
    try {
      await apiRequest('/settings/promotions', {
        method: 'PATCH',
        isAdmin: true,
        body: promotions,
      })
      setSavedMsg('✓ Promotion settings saved successfully!')
    } catch (err) {
      alert(`Save error: ${err.message}`)
    }
  }

  const handleSaveBusiness = async (e) => {
    e.preventDefault()
    setSavedMsg('')
    try {
      await apiRequest('/settings/business', {
        method: 'PATCH',
        isAdmin: true,
        body: business,
      })
      setSavedMsg('✓ Business details saved successfully!')
    } catch (err) {
      alert(`Save error: ${err.message}`)
    }
  }

  if (loading) return <div style={{ padding: '40px' }}>Loading store settings...</div>

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cocoa-dark)', margin: 0 }}>
          Store Settings &amp; Business Rules
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
          Configure live delivery calculations, first-order promotions, and official billing invoice details.
        </p>
      </div>

      {savedMsg && (
        <div style={{ background: 'rgba(46,111,64,0.1)', color: '#2E6F40', padding: '12px 18px', borderRadius: '12px', fontWeight: 700, marginBottom: '20px' }}>
          {savedMsg}
        </div>
      )}

      {/* 1. Delivery Charge Rules */}
      <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)', marginBottom: '28px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', margin: '0 0 16px' }}>
          🛵 Delivery Pricing Rules
        </h3>

        <form onSubmit={handleSaveDelivery} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="form-label">Standard Delivery Charge (₹)</label>
              <input
                type="number"
                required
                value={delivery.standardCharge}
                onChange={(e) => setDelivery({ ...delivery, standardCharge: parseFloat(e.target.value) || 0 })}
                className="form-input"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Applied when subtotal is below free threshold.</span>
            </div>

            <div>
              <label className="form-label">Free Delivery Threshold (₹)</label>
              <input
                type="number"
                required
                value={delivery.freeThreshold}
                onChange={(e) => setDelivery({ ...delivery, freeThreshold: parseFloat(e.target.value) || 0 })}
                className="form-input"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Orders at or above this value get FREE delivery (₹0).</span>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={delivery.enabled}
              onChange={(e) => setDelivery({ ...delivery, enabled: e.target.checked })}
            />
            Enable Free Delivery Promotion
          </label>

          <button type="submit" className="btn btn--gold btn--sm" style={{ alignSelf: 'flex-start', padding: '10px 20px' }}>
            Save Delivery Rules →
          </button>
        </form>
      </div>

      {/* 2. First Order Promotion */}
      <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)', marginBottom: '28px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', margin: '0 0 16px' }}>
          🎉 First-Time Customer Offer
        </h3>

        <form onSubmit={handleSavePromotions} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="form-label">First Order Discount (₹)</label>
              <input
                type="number"
                required
                value={promotions.firstOrderDiscount}
                onChange={(e) => setPromotions({ ...promotions, firstOrderDiscount: parseFloat(e.target.value) || 0 })}
                className="form-input"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Deducted server-side on first order (e.g. ₹20).</span>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={promotions.firstOrderOfferEnabled}
              onChange={(e) => setPromotions({ ...promotions, firstOrderOfferEnabled: e.target.checked })}
            />
            Enable ₹20 First-Order Welcome Offer for New Signups
          </label>

          <button type="submit" className="btn btn--gold btn--sm" style={{ alignSelf: 'flex-start', padding: '10px 20px' }}>
            Save Promotion Rules →
          </button>
        </form>
      </div>

      {/* 3. Official Business Details */}
      <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', border: '1px solid rgba(61,37,30,0.1)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cocoa-dark)', margin: '0 0 16px' }}>
          🏪 Official Business &amp; Tax Details (For Invoices)
        </h3>

        <form onSubmit={handleSaveBusiness} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="form-label">Business Name</label>
              <input
                type="text"
                value={business.name}
                onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                value={business.phone}
                onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                className="form-input"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Store Address</label>
              <input
                type="text"
                value={business.address}
                onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                className="form-input"
              />
            </div>
            <div style={{ gridColumn: '1 / -1', background: '#FAF6F0', padding: '14px 18px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(179,123,36,0.2)' }}>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--cocoa-dark)', display: 'block' }}>
                  Enable GST on Invoices &amp; Bills
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Currently turned OFF by default. Turn ON anytime if you wish to show CGST (2.5%), SGST (2.5%), and GSTIN on customer bills.
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={Boolean(business.enableGst)}
                  onChange={(e) => setBusiness({ ...business, enableGst: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ color: business.enableGst ? '#2E6F40' : 'var(--text-muted)' }}>
                  {business.enableGst ? '🟢 GST Active' : '⚪ GST Disabled'}
                </span>
              </label>
            </div>

            <div>
              <label className="form-label">GSTIN (Optional)</label>
              <input
                type="text"
                value={business.gst || ''}
                onChange={(e) => setBusiness({ ...business, gst: e.target.value })}
                className="form-input"
                placeholder="33ADEPA2229C2ZG"
              />
            </div>
            <div>
              <label className="form-label">FSSAI License Number</label>
              <input
                type="text"
                value={business.fssai || ''}
                onChange={(e) => setBusiness({ ...business, fssai: e.target.value })}
                className="form-input"
                placeholder="22418107000384"
              />
            </div>
          </div>

          <button type="submit" className="btn btn--gold btn--sm" style={{ alignSelf: 'flex-start', padding: '10px 20px' }}>
            Save Business Details →
          </button>
        </form>
      </div>
    </div>
  )
}
