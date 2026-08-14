import express from 'express'
import crypto from 'node:crypto'
import { db } from '../db.js'
import { createOrder, updateOrderStatus, getOrderById } from '../services/orderService.js'
import { generateCustomerQR } from '../services/qrService.js'

const router = express.Router()

// Fast Offline Customer Lookup by Mobile / Name / Royalty ID
router.get('/customers/search', (req, res) => {
  try {
    const { q = '' } = req.query
    const term = q.trim().toLowerCase()

    if (!term || term.length < 2) {
      return res.json({ customers: [] })
    }

    const customers = db.prepare(`
      SELECT c.id, c.name, c.email, c.mobile, m.royalty_id, m.current_points, m.tier
      FROM customers c
      LEFT JOIN royalty_members m ON c.id = m.customer_id
      WHERE LOWER(c.name) LIKE ? OR c.mobile LIKE ? OR LOWER(m.royalty_id) LIKE ?
      LIMIT 10
    `).all(`%${term}%`, `%${term}%`, `%${term}%`)

    res.json({ customers })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Fast POS Customer Creation & Instant QR Pass Generation
router.post('/customers', (req, res) => {
  try {
    const { name, mobile, email = '', address = '' } = req.body

    if (!name || !name.trim()) return res.status(400).json({ error: 'Customer name is required' })
    if (!mobile || !mobile.trim()) return res.status(400).json({ error: 'Mobile number is required' })

    const cleanMobile = mobile.replace(/\D/g, '')
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' })
    }

    // Check if customer already exists with this mobile
    let existing = db.prepare('SELECT id, name, mobile, email FROM customers WHERE mobile = ?').get(cleanMobile)
    if (existing) {
      const member = db.prepare('SELECT royalty_id, current_points, tier FROM royalty_members WHERE customer_id = ?').get(existing.id)
      return res.status(200).json({
        success: true,
        isExisting: true,
        customer: {
          id: existing.id,
          name: existing.name,
          mobile: existing.mobile,
          email: existing.email,
          royalty_id: member?.royalty_id || 'CDR-000001',
          current_points: member?.current_points || 0,
          tier: member?.tier || 'GOLD MEMBER',
        },
      })
    }

    const customerId = `cust_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
    const memberId = `mem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
    const now = new Date().toISOString()

    // Generate sequential Royalty ID
    const countRow = db.prepare('SELECT COUNT(*) as count FROM royalty_members').get()
    const nextNum = (countRow ? countRow.count : 0) + 1
    const royaltyId = `CDR-${String(nextNum).padStart(6, '0')}`

    const savedAddresses = address ? JSON.stringify([{ street: address.trim(), isDefault: true }]) : '[]'

    // Insert customer
    db.prepare(`
      INSERT INTO customers (id, name, email, mobile, password_hash, saved_addresses, created_at)
      VALUES (?, ?, ?, ?, '', ?, ?)
    `).run(customerId, name.trim(), email ? email.trim() : `${cleanMobile}@chocodor.in`, cleanMobile, savedAddresses, now)

    // Insert Royalty Member
    db.prepare(`
      INSERT INTO royalty_members (id, customer_id, royalty_id, current_points, lifetime_points, points_redeemed, tier, created_at)
      VALUES (?, ?, ?, 0, 0, 0, 'GOLD MEMBER', ?)
    `).run(memberId, customerId, royaltyId, now)

    res.status(201).json({
      success: true,
      customer: {
        id: customerId,
        name: name.trim(),
        mobile: cleanMobile,
        email: email ? email.trim() : `${cleanMobile}@chocodor.in`,
        royalty_id: royaltyId,
        current_points: 0,
        lifetime_points: 0,
        tier: 'GOLD MEMBER',
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Fast POS Order Creation, Instant Auto-Account & QR Pass Generation
 */
router.post('/orders', async (req, res) => {
  try {
    const {
      customerId: incomingCustomerId,
      customerName = 'Walk-in Guest',
      customerMobile = '9999999999',
      orderType = 'DINE_IN', // 'DINE_IN' | 'PICKUP' | 'DELIVERY'
      items,
      appliedRewardCode = null,
      applyFirstOrderOffer = false,
      paymentMethod = 'CASH', // 'CASH' | 'UPI' | 'CARD' | 'RAZORPAY'
      posStaffId = 'COUNTER-1',
      tableOrTokenNo = '',
      notes = '',
      autoComplete = false,
    } = req.body

    const cleanMobile = String(customerMobile).replace(/\D/g, '')
    let finalCustomerId = incomingCustomerId

    // Auto-detect or auto-create customer account for real mobile numbers
    if (cleanMobile.length === 10 && cleanMobile !== '9999999999') {
      let existingCust = db.prepare('SELECT id, name, mobile FROM customers WHERE mobile = ?').get(cleanMobile)
      if (!existingCust) {
        // Auto-create customer account immediately!
        finalCustomerId = `cust_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
        const memberId = `mem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
        const now = new Date().toISOString()

        const countRow = db.prepare('SELECT COUNT(*) as count FROM royalty_members').get()
        const nextNum = (countRow ? countRow.count : 0) + 1
        const royaltyId = `CDR-${String(nextNum).padStart(6, '0')}`

        db.prepare(`
          INSERT INTO customers (id, name, email, mobile, password_hash, saved_addresses, created_at)
          VALUES (?, ?, ?, ?, '', '[]', ?)
        `).run(finalCustomerId, customerName.trim(), `${cleanMobile}@chocodor.in`, cleanMobile, now)

        db.prepare(`
          INSERT INTO royalty_members (id, customer_id, royalty_id, current_points, lifetime_points, points_redeemed, tier, created_at)
          VALUES (?, ?, ?, 0, 0, 0, 'GOLD MEMBER', ?)
        `).run(memberId, finalCustomerId, royaltyId, now)
      } else {
        finalCustomerId = existingCust.id
      }
    }

    const order = createOrder({
      customerId: finalCustomerId || null,
      customerName: customerName.trim(),
      customerMobile: cleanMobile.length === 10 ? cleanMobile : customerMobile.trim(),
      orderSource: 'OFFLINE',
      orderType,
      items,
      appliedRewardCode,
      applyFirstOrderOffer,
      paymentMethod,
      posStaffId,
      tableOrTokenNo,
      notes,
    })

    // If payment is counter cash/upi/card:
    let finalOrder = order
    if (autoComplete) {
      finalOrder = updateOrderStatus(order.id, 'COMPLETED', 'POS_STAFF', 'Completed at Billing Counter')
    } else {
      db.prepare("UPDATE orders SET payment_status = 'PAID' WHERE id = ?").run(order.id)
      db.prepare("UPDATE invoices SET payment_status = 'PAID' WHERE order_id = ?").run(order.id)
      finalOrder = getOrderById(order.id)
    }

    // Generate or fetch QR Token for this customer if identified
    let qrDetails = null
    if (finalCustomerId) {
      try {
        qrDetails = await generateCustomerQR(finalCustomerId)
      } catch (e) {
        console.error('QR generation error in POS order:', e)
      }
    }

    res.status(201).json({
      success: true,
      order: finalOrder,
      invoice: finalOrder.invoice,
      kot: finalOrder.kot,
      qr: qrDetails,
      customer: finalCustomerId
        ? db.prepare('SELECT c.id, c.name, c.mobile, m.royalty_id, m.current_points FROM customers c JOIN royalty_members m ON c.id = m.customer_id WHERE c.id = ?').get(finalCustomerId)
        : null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
