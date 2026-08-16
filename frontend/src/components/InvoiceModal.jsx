import { useState, useEffect } from 'react'
import { apiRequest } from '../api/client'
import { formatPrice } from '../data/content'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { printElement } from '../utils/printHelper'
import logoImg from '../assets/logo.jpg'

export default function InvoiceModal({ orderId, invoiceNumber, onClose }) {
  useBodyScrollLock(true)
  const [invoiceData, setInvoiceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [printLayout, setPrintLayout] = useState('thermal') // 'thermal' | 'a4'

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    async function loadInvoice() {
      try {
        setLoading(true)
        const id = invoiceNumber || orderId
        const data = await apiRequest(`/orders/invoice/${id}`)
        setInvoiceData(data)
      } catch (err) {
        console.error('Failed to load invoice:', err)
      } finally {
        setLoading(false)
      }
    }
    loadInvoice()
  }, [orderId, invoiceNumber])

  const handlePrint = () => {
    printElement('printable-invoice', `Invoice_${invoiceData?.invoice?.invoice_number || 'ChocoDor'}`)
  }

  if (loading) {
    return (
      <div className="cart-drawer-overlay" onClick={onClose}>
        <div className="product-modal" style={{ maxWidth: '440px', padding: '40px', textAlign: 'center', background: '#FFFFFF', borderRadius: '20px' }}>
          Loading bill details...
        </div>
      </div>
    )
  }

  if (!invoiceData || !invoiceData.invoice) {
    return (
      <div className="cart-drawer-overlay" onClick={onClose}>
        <div className="product-modal" style={{ maxWidth: '440px', padding: '40px', textAlign: 'center', background: '#FFFFFF', borderRadius: '20px' }}>
          Invoice not found.
          <button type="button" className="btn btn--outline btn--sm" style={{ marginTop: '16px' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    )
  }

  const { invoice, business = {} } = invoiceData

  // Calculations for CGST & SGST (5% total = 2.5% CGST + 2.5% SGST)
  const taxableSubtotal = invoice.subtotal || invoice.total_amount
  const cgstAmount = Number(((taxableSubtotal * 0.025)).toFixed(2))
  const sgstAmount = Number(((taxableSubtotal * 0.025)).toFixed(2))
  const totalWithTax = invoice.total_amount
  const roundedTotal = Math.round(totalWithTax)
  const totalItemsCount = invoice.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0

  const storeAddress =
    business.address ||
    'Royakottai flyover, near SBI Bank, Londenpet, Krishnagiri, Bayanapalli, Tamil Nadu 635001'
  const storePhone = business.phone || '+91 94880 54036'
  const storeGst = business.gst || '33ADEPA2229C2ZG'
  const storeFssai = business.fssai || '22418107000384'

  return (
    <div className="cart-drawer-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div
        className="product-modal"
        style={{
          maxWidth: printLayout === 'thermal' ? '500px' : '760px',
          width: '100%',
          padding: '0',
          background: '#FFFFFF',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── TOP CONTROL BAR (Always Visible & Unclipped) ─── */}
        <div
          className="no-print"
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(61,37,30,0.1)',
            background: '#FAF6F0',
            flexShrink: 0,
          }}
        >
          {/* Header Row: Title + Dedicated Big Close Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🧾</span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--cocoa-dark)' }}>
                Tax Invoice Preview ({invoice.invoice_number})
              </strong>
            </div>

            <button
              type="button"
              className="btn btn--sm"
              style={{
                background: 'rgba(186,27,27,0.1)',
                color: '#BA1B1B',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 800,
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onClick={onClose}
              title="Close (Esc)"
            >
              ✕ Close
            </button>
          </div>

          {/* Action Row: Layout Mode & Print Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn btn--sm ${printLayout === 'thermal' ? 'btn--gold' : 'btn--outline'}`}
                style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 800 }}
                onClick={() => setPrintLayout('thermal')}
              >
                🧾 Thermal 80mm
              </button>
              <button
                type="button"
                className={`btn btn--sm ${printLayout === 'a4' ? 'btn--gold' : 'btn--outline'}`}
                style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 800 }}
                onClick={() => setPrintLayout('a4')}
              >
                📄 A4 Format
              </button>
            </div>

            <button
              type="button"
              className="btn btn--gold btn--sm"
              style={{ padding: '7px 18px', fontSize: '12px', fontWeight: 900 }}
              onClick={handlePrint}
            >
              🖨️ Print Bill
            </button>
          </div>
        </div>

        {/* ─── SCROLLABLE PRINTABLE RECEIPT CONTENT ─── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: printLayout === 'thermal' ? '20px 24px' : '36px' }}>
          <div
            id="printable-invoice"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace, sans-serif',
              color: '#000000',
              fontSize: '12px',
              lineHeight: 1.4,
              background: '#FFFFFF',
              maxWidth: printLayout === 'thermal' ? '380px' : '100%',
              margin: '0 auto',
            }}
          >
            {/* Header Section */}
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <img
                src={logoImg}
                alt="Logo"
                style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 6px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              <div style={{ fontWeight: 900, fontSize: '15px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#000' }}>
                {business.name || "Choco D'or"}
              </div>
              <div style={{ fontSize: '10px', color: '#333', maxWidth: '280px', margin: '2px auto 0' }}>
                {storeAddress}
              </div>
              <div style={{ fontSize: '10px', color: '#333', marginTop: '2px' }}>
                Phone No-{storePhone}
              </div>
              {Boolean(business.enableGst) && (
                <div style={{ fontSize: '10px', color: '#333' }}>
                  GSTIN: {storeGst}
                </div>
              )}
              <div style={{ fontSize: '10px', color: '#333' }}>
                FSSAI Reg no: {storeFssai}
              </div>
              <div style={{ fontWeight: 800, fontSize: '12px', marginTop: '4px', letterSpacing: '0.05em' }}>
                Invoice
              </div>
            </div>

            {/* Customer & Bill Identifier Details */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>
                {invoice.customer_name || 'WALK-IN GUEST'}
              </div>
              {invoice.customer_mobile && (
                <div style={{ fontSize: '11px', color: '#444' }}>
                  {invoice.customer_mobile}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '5px 0', margin: '6px 0', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Invoice {invoice.invoice_number}</span>
                <span>{totalItemsCount} items ({totalItemsCount} Qty)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>
                  {new Date(invoice.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}{' '}
                  {new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>Manager</span>
              </div>
            </div>

            {/* Item Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0 10px', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                  <th style={{ padding: '4px 0', fontWeight: 800 }}>Name</th>
                  <th style={{ padding: '4px 0', textAlign: 'center', width: '30px', fontWeight: 800 }}>Qty</th>
                  <th style={{ padding: '4px 0', textAlign: 'right', width: '55px', fontWeight: 800 }}>Rate</th>
                  <th style={{ padding: '4px 0', textAlign: 'right', width: '65px', fontWeight: 800 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} style={{ verticalAlign: 'top' }}>
                    <td style={{ padding: '5px 0 3px' }}>
                      <div style={{ fontWeight: 700 }}>{item.product_name_snapshot || item.name}</div>
                      {Boolean(business.enableGst) && (
                        <div style={{ fontSize: '9px', color: '#555' }}>
                          HSN-21050000, CGST 2.5%, SGST 2.5%
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '5px 0 3px', textAlign: 'center' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '5px 0 3px', textAlign: 'right' }}>
                      ₹ {Number(item.unit_price_snapshot || item.price || 0).toFixed(0)}
                    </td>
                    <td style={{ padding: '5px 0 3px', textAlign: 'right', fontWeight: 700 }}>
                      ₹ {Number((item.unit_price_snapshot || item.price || 0) * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Subtotal and Tax Breakdown */}
            <div style={{ borderTop: '1px solid #000', paddingTop: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Sub Total</span>
                <span>₹ {Number(taxableSubtotal).toFixed(2)}</span>
              </div>

              {Boolean(business.enableGst) && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#444' }}>
                    <span>CGST 2.5% on ₹ {Number(taxableSubtotal).toFixed(2)}</span>
                    <span>₹ {cgstAmount.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#444' }}>
                    <span>SGST 2.5% on ₹ {Number(taxableSubtotal).toFixed(2)}</span>
                    <span>₹ {sgstAmount.toFixed(2)}</span>
                  </div>
                </>
              )}

              {invoice.delivery_charge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>Delivery Charge</span>
                  <span>₹ {Number(invoice.delivery_charge).toFixed(2)}</span>
                </div>
              )}

              {invoice.first_order_discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#2E6F40', fontWeight: 700 }}>
                  <span>First Order Discount</span>
                  <span>−₹ {Number(invoice.first_order_discount).toFixed(2)}</span>
                </div>
              )}

              {invoice.reward_discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#2E6F40', fontWeight: 700 }}>
                  <span>Royalty Reward Discount</span>
                  <span>−₹ {Number(invoice.reward_discount).toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #999', fontSize: '11px' }}>
                <span>Bill Total</span>
                <span>₹ {Number(totalWithTax).toFixed(2)}</span>
              </div>

              {/* Bill Total Rounded (Prominent) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #000', fontSize: '14px', fontWeight: 900 }}>
                <span>Bill Total (rounded)</span>
                <span style={{ fontSize: '16px' }}>₹ {roundedTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Summary */}
            <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '1px solid #000', fontSize: '11px' }}>
              <div style={{ fontWeight: 800, marginBottom: '2px' }}>Payment Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{invoice.payment_method || 'UPI'}</span>
                <span>₹ {roundedTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>Balance</span>
                <span>₹ 0.00</span>
              </div>
            </div>

            {/* Royalty and Hospitality Note */}
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #777', textAlign: 'center', fontSize: '10px', color: '#444', lineHeight: 1.35 }}>
              <p style={{ margin: '0 0 6px', color: '#000', fontWeight: 600 }}>
                Serving Sweet Indulgence in Every Bite at Choco D&apos;or. Enjoy 100% Pure Couverture Chocolate.
              </p>

              <p style={{ margin: '0 0 6px', color: '#000', fontWeight: 700 }}>
                👑 Earned +{invoice.royalty_points_earned || 0} Royalty Points on this order!
                <br />
                Your Next Dessert Could Be FREE! Join Our Rewards Program.
              </p>

              <p style={{ margin: '0 0 4px', color: '#555' }}>
                For product complaints or suggestions call {storePhone}
                <br />
                or email us at contact@chocodor.com
              </p>

              <div style={{ fontSize: '9px', color: '#888', marginTop: '6px' }}>
                Powered by <strong>Choco D&apos;or POS System</strong>
              </div>
            </div>
          </div>

          {/* Secondary Bottom Close Button for extra convenience */}
          <div className="no-print" style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              style={{ padding: '8px 24px', fontSize: '12px' }}
              onClick={onClose}
            >
              ✕ Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
