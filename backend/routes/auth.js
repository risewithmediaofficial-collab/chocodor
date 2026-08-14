import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { db } from '../db.js'
import { createRoyaltyMember, getMemberByCustomerId } from '../services/royaltyService.js'

const router = express.Router()
export const JWT_SECRET = process.env.JWT_SECRET || 'chocodor-super-secret-token-key-2026'

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }
}

// Register
router.post('/register', (req, res) => {
  try {
    const { name, email, mobile, password } = req.body

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanMobile = mobile.trim()

    const existing = db.prepare('SELECT id FROM customers WHERE email = ? OR mobile = ?').get(cleanEmail, cleanMobile)
    if (existing) {
      return res.status(400).json({ error: 'An account with this email or mobile number already exists' })
    }

    const customerId = `cust-${crypto.randomUUID()}`
    const passwordHash = bcrypt.hashSync(password, 10)
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO customers (id, name, email, mobile, password_hash, saved_addresses, created_at)
      VALUES (?, ?, ?, ?, ?, '[]', ?)
    `).run(customerId, name.trim(), cleanEmail, cleanMobile, passwordHash, now)

    // Automatically create Royalty Member account
    const member = createRoyaltyMember(customerId)

    const token = jwt.sign({ id: customerId, email: cleanEmail, name: name.trim() }, JWT_SECRET, { expiresIn: '30d' })

    res.json({
      success: true,
      token,
      customer: {
        id: customerId,
        name: name.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        savedAddresses: [],
      },
      royalty: {
        royaltyId: member.royalty_id,
        currentPoints: member.current_points,
        lifetimePoints: member.lifetime_points,
        pointsRedeemed: member.points_redeemed,
        tier: member.tier,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Login
router.post('/login', (req, res) => {
  try {
    const { emailOrMobile, password } = req.body
    if (!emailOrMobile || !password) {
      return res.status(400).json({ error: 'Email/Mobile and Password are required' })
    }

    const clean = emailOrMobile.trim().toLowerCase()
    const customer = db.prepare('SELECT * FROM customers WHERE email = ? OR mobile = ?').get(clean, emailOrMobile.trim())

    if (!customer || !bcrypt.compareSync(password, customer.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your details.' })
    }

    let member = getMemberByCustomerId(customer.id)
    if (!member) {
      member = createRoyaltyMember(customer.id)
    }

    const token = jwt.sign({ id: customer.id, email: customer.email, name: customer.name }, JWT_SECRET, { expiresIn: '30d' })

    res.json({
      success: true,
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        savedAddresses: JSON.parse(customer.saved_addresses || '[]'),
      },
      royalty: {
        royaltyId: member.royalty_id,
        currentPoints: member.current_points,
        lifetimePoints: member.lifetime_points,
        pointsRedeemed: member.points_redeemed,
        tier: member.tier,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get Profile & Royalty Card
router.get('/me', authMiddleware, (req, res) => {
  try {
    const customer = db.prepare('SELECT id, name, email, mobile, saved_addresses, created_at FROM customers WHERE id = ?').get(req.user.id)
    if (!customer) return res.status(404).json({ error: 'Customer not found' })

    let member = getMemberByCustomerId(customer.id)
    if (!member) {
      member = createRoyaltyMember(customer.id)
    }

    res.json({
      customer: {
        ...customer,
        savedAddresses: JSON.parse(customer.saved_addresses || '[]'),
      },
      royalty: {
        royaltyId: member.royalty_id,
        currentPoints: member.current_points,
        lifetimePoints: member.lifetime_points,
        pointsRedeemed: member.points_redeemed,
        tier: member.tier,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Save address
router.post('/address', authMiddleware, (req, res) => {
  try {
    const { address } = req.body
    if (!address) return res.status(400).json({ error: 'Address payload is required' })

    const customer = db.prepare('SELECT saved_addresses FROM customers WHERE id = ?').get(req.user.id)
    const existing = JSON.parse(customer.saved_addresses || '[]')
    const updated = [address, ...existing.filter((a) => a.id !== address.id)].slice(0, 5)

    db.prepare('UPDATE customers SET saved_addresses = ? WHERE id = ?').run(JSON.stringify(updated), req.user.id)

    res.json({ success: true, savedAddresses: updated })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
