import { useState, useEffect } from 'react'
import { apiRequest } from '../api/client'
import { formatPrice } from '../data/content'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { printElement } from '../utils/printHelper'
import logoImg from '../assets/logo.jpg'

export default function InvoiceModal({ orderId, invoiceNumber, onClose, autoPrint = false }) {
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
    printElement('printable-invoice', `Invoice_${invoiceData?.invoice?.invoice_number || 'ChocoDor'}`, printLayout)
  }

  useEffect(() => {
    if (!autoPrint || loading || !invoiceData?.invoice) return
    const timer = setTimeout(() => {
      printElement('printable-invoice', `Invoice_${invoiceData.invoice.invoice_number || 'ChocoDor'}`, printLayout)
    }, 450)
    return () => clearTimeout(timer)
  }, [autoPrint, loading, invoiceData, printLayout])

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
              fontFamily: printLayout === 'thermal'
                ? "'Courier New', Courier, 'Lucida Console', monospace"
                : "Arial, Helvetica, sans-serif",
              color: '#000000',
              fontSize: printLayout === 'thermal' ? '11px' : '12px',
              lineHeight: 1.25,
              background: '#FFFFFF',
              maxWidth: printLayout === 'thermal' ? '280px' : '100%',
              margin: '0 auto',
              padding: printLayout === 'thermal' ? '4px 2px' : '20px',
              fontWeight: printLayout === 'thermal' ? 700 : 'normal',
            }}
          >
            {/* Header Section */}
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
              <img
                src={logoImg}
                alt="Logo"
                style={{
                  width: '40px',
                  height: '40px',
                  margin: '0 auto 4px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  display: 'block',
                  filter: 'contrast(140%) grayscale(100%)',
                }}
              />

              <div style={{ fontWeight: 900, fontSize: '14px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#000' }}>
                {business.name || "Choco D'or"}
              </div>
              <div style={{ fontSize: '9.5px', color: '#000', maxWidth: '260px', margin: '2px auto 0', lineHeight: 1.15 }}>
                {storeAddress}
              </div>
              <div style={{ fontSize: '9.5px', color: '#000', marginTop: '1px' }}>
                Ph: {storePhone}
              </div>
              {Boolean(business.enableGst) && (
                <div style={{ fontSize: '9px', color: '#000' }}>
                  GSTIN: {storeGst}
                </div>
              )}
              <div style={{ fontSize: '9px', color: '#000' }}>
                FSSAI: {storeFssai}
              </div>
              <div style={{ fontWeight: 900, fontSize: '11px', marginTop: '3px', letterSpacing: '0.05em', color: '#000' }}>
                *** TAX INVOICE ***
              </div>
            </div>

            {/* Customer & Bill Identifier Details */}
            <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '3px 0', margin: '4px 0', fontSize: '10.5px', color: '#000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span style={{ textTransform: 'uppercase' }}>{invoice.customer_name || 'WALK-IN GUEST'}</span>
                <span>{invoice.customer_mobile || ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span style={{ fontWeight: 800 }}>Inv: {invoice.invoice_number}</span>
                <span>{totalItemsCount} Qty</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>
                  {new Date(invoice.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}{' '}
                  {new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>Cashier</span>
              </div>
            </div>

            {/* Item Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '3px 0', fontSize: '10.5px', color: '#000' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                  <th style={{ padding: '2px 0', fontWeight: 800, color: '#000' }}>ITEM</th>
                  <th style={{ padding: '2px 0', textAlign: 'center', width: '28px', fontWeight: 800, color: '#000' }}>QTY</th>
                  <th style={{ padding: '2px 0', textAlign: 'right', width: '50px', fontWeight: 800, color: '#000' }}>RATE</th>
                  <th style={{ padding: '2px 0', textAlign: 'right', width: '60px', fontWeight: 800, color: '#000' }}>AMT</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} style={{ verticalAlign: 'top' }}>
                    <td style={{ padding: '2px 0 1px' }}>
                      <div style={{ fontWeight: 700, color: '#000' }}>{item.product_name_snapshot || item.name}</div>
                    </td>
                    <td style={{ padding: '2px 0 1px', textAlign: 'center', fontWeight: 700, color: '#000' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '2px 0 1px', textAlign: 'right', color: '#000' }}>
                      {Number(item.unit_price_snapshot || item.price || 0).toFixed(0)}
                    </td>
                    <td style={{ padding: '2px 0 1px', textAlign: 'right', fontWeight: 800, color: '#000' }}>
                      {Number((item.unit_price_snapshot || item.price || 0) * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Subtotal and Tax Breakdown */}
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '10.5px', color: '#000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                <span>Sub Total</span>
                <span>₹ {Number(taxableSubtotal).toFixed(2)}</span>
              </div>

              {Boolean(business.enableGst) && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px', color: '#000' }}>
                    <span>CGST 2.5%</span>
                    <span>₹ {cgstAmount.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px', color: '#000' }}>
                    <span>SGST 2.5%</span>
                    <span>₹ {sgstAmount.toFixed(2)}</span>
                  </div>
                </>
              )}

              {invoice.delivery_charge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                  <span>Delivery</span>
                  <span>₹ {Number(invoice.delivery_charge).toFixed(2)}</span>
                </div>
              )}

              {invoice.first_order_discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px', color: '#000', fontWeight: 700 }}>
                  <span>Discount</span>
                  <span>−₹ {Number(invoice.first_order_discount).toFixed(2)}</span>
                </div>
              )}

              {invoice.reward_discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px', color: '#000', fontWeight: 700 }}>
                  <span>Reward Disc</span>
                  <span>−₹ {Number(invoice.reward_discount).toFixed(2)}</span>
                </div>
              )}

              {/* Bill Total Rounded (Prominent) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px', paddingTop: '3px', borderTop: '1px solid #000', borderBottom: '1px solid #000', fontSize: '13px', fontWeight: 900, color: '#000' }}>
                <span>TOTAL (ROUNDED)</span>
                <span style={{ fontSize: '15px' }}>₹ {roundedTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Summary */}
            <div style={{ marginTop: '3px', paddingTop: '2px', fontSize: '10.5px', color: '#000' }}>
              {invoice.payment_method === 'SPLIT' && Array.isArray(invoice.payment_breakdown) ? (
                invoice.payment_breakdown.map((part) => (
                  <div key={part.method} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Paid ({part.method}):</span>
                    <span>₹ {Number(part.amount || 0).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Paid ({invoice.payment_method || 'UPI'}):</span>
                  <span>₹ {roundedTotal.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1px' }}>
                <span>Change Due:</span>
                <span>₹ 0.00</span>
              </div>
            </div>

            {/* Royalty and Hospitality Note - Compact 3 Lines */}
            <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed #000', textAlign: 'center', fontSize: '9.5px', color: '#000', lineHeight: 1.25 }}>
              <div style={{ fontWeight: 800, color: '#000' }}>
                👑 +{invoice.royalty_points_earned || 0} Royalty Points Earned!
              </div>
              <div style={{ marginTop: '1px', color: '#000' }}>
                Thank You! Visit Again — Choco D&apos;or
              </div>
              <div style={{ fontSize: '8.5px', color: '#000', marginTop: '2px' }}>
                Helpline: {storePhone}
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
