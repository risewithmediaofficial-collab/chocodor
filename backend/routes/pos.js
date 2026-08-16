import express from 'express'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Customer, RoyaltyMember, Order, Invoice } from '../models/index.js'
import { createOrder, updateOrderStatus, getOrderById } from '../services/orderService.js'
import { generateCustomerQR } from '../services/qrService.js'

const router = express.Router()

// Fast Offline Customer Lookup by Mobile / Name / Royalty ID
router.get('/customers/search', async (req, res) => {
  try {
    const { q = '' } = req.query
    const term = q.trim().toLowerCase()

    if (!term || term.length < 2) {
      return res.json({ customers: [] })
    }

    const regex = new RegExp(term, 'i')

    // Find matching members
    const matchingMembers = await RoyaltyMember.find({ royalty_id: regex }).lean()
    const memberCustIds = matchingMembers.map((m) => m.customer_id)

    const customers = await Customer.find({
      $or: [{ name: regex }, { mobile: regex }, { id: { $in: memberCustIds } }],
    })
      .limit(10)
      .lean()

    const custIds = customers.map((c) => c.id)
    const members = await RoyaltyMember.find({ customer_id: { $in: custIds } }).lean()
    const memberMap = {}
    for (const m of members) memberMap[m.customer_id] = m

    const result = customers.map((c) => {
      const m = memberMap[c.id] || {}
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        mobile: c.mobile,
        royalty_id: m.royalty_id || '',
        current_points: m.current_points || 0,
        tier: m.tier || 'MEMBER',
      }
    })

    res.json({ customers: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Fast POS Customer Creation & Instant QR Pass Generation
router.post('/customers', async (req, res) => {
  try {
    const { name, mobile, email = '', address = '' } = req.body

    if (!name || !name.trim()) return res.status(400).json({ error: 'Customer name is required' })
    if (!mobile || !mobile.trim()) return res.status(400).json({ error: 'Mobile number is required' })

    const cleanMobile = mobile.replace(/\D/g, '')
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' })
    }

    // Check if customer already exists with this mobile
    let existing = await Customer.findOne({ mobile: cleanMobile }).lean()
    if (existing) {
      const member = await RoyaltyMember.findOne({ customer_id: existing.id }).lean()
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

    const count = (await RoyaltyMember.countDocuments()) + 1
    const royaltyId = `CDR-${String(count).padStart(6, '0')}`

    const savedAddresses = address ? [{ street: address.trim(), isDefault: true }] : []

    const passwordHash = bcrypt.hashSync(cleanMobile, 10)

    await Customer.create({
      id: customerId,
      name: name.trim(),
      email: email ? email.trim() : `${cleanMobile}@chocodor.in`,
      mobile: cleanMobile,
      password_hash: passwordHash,
      saved_addresses: savedAddresses,
      created_at: now,
    })

    await RoyaltyMember.create({
      id: memberId,
      customer_id: customerId,
      royalty_id: royaltyId,
      current_points: 0,
      lifetime_points: 0,
      points_redeemed: 0,
      tier: 'GOLD MEMBER',
      created_at: now,
    })

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
      orderType = 'DINE_IN',
      items,
      appliedRewardCode = null,
      applyFirstOrderOffer = false,
      paymentMethod = 'CASH',
      posStaffId = 'COUNTER-1',
      tableOrTokenNo = '',
      notes = '',
      autoComplete = false,
    } = req.body

    const cleanMobile = String(customerMobile).replace(/\D/g, '')
    let finalCustomerId = incomingCustomerId

    // Auto-detect or auto-create customer account for real mobile numbers
    if (cleanMobile.length === 10 && cleanMobile !== '9999999999') {
      let existingCust = await Customer.findOne({ mobile: cleanMobile }).lean()
      if (!existingCust) {
        finalCustomerId = `cust_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
        const memberId = `mem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
        const now = new Date().toISOString()

        const count = (await RoyaltyMember.countDocuments()) + 1
        const royaltyId = `CDR-${String(count).padStart(6, '0')}`
        const passwordHash = bcrypt.hashSync(cleanMobile, 10)

        await Customer.create({
          id: finalCustomerId,
          name: customerName.trim(),
          email: `${cleanMobile}@chocodor.in`,
          mobile: cleanMobile,
          password_hash: passwordHash,
          saved_addresses: [],
          created_at: now,
        })

        await RoyaltyMember.create({
          id: memberId,
          customer_id: finalCustomerId,
          royalty_id: royaltyId,
          current_points: 0,
          lifetime_points: 0,
          points_redeemed: 0,
          tier: 'GOLD MEMBER',
          created_at: now,
        })
      } else {
        finalCustomerId = existingCust.id
      }
    }

    const order = await createOrder({
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

    let finalOrder = order
    if (autoComplete) {
      finalOrder = await updateOrderStatus(order.id, 'COMPLETED', 'POS_STAFF', 'Completed at Billing Counter')
    } else {
      await Order.updateOne({ id: order.id }, { payment_status: 'PAID' })
      await Invoice.updateOne({ order_id: order.id }, { payment_status: 'PAID' })
      finalOrder = await getOrderById(order.id)
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

    let customerDetails = null
    if (finalCustomerId) {
      const c = await Customer.findOne({ id: finalCustomerId }).lean()
      const m = await RoyaltyMember.findOne({ customer_id: finalCustomerId }).lean()
      customerDetails = {
        id: c?.id,
        name: c?.name,
        mobile: c?.mobile,
        royalty_id: m?.royalty_id || '',
        current_points: m?.current_points || 0,
      }
    }

    res.status(201).json({
      success: true,
      order: finalOrder,
      invoice: finalOrder.invoice,
      kot: finalOrder.kot,
      qr: qrDetails,
      customer: customerDetails,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
