import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { Customer } from '../models/index.js'
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
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanMobile = mobile.trim()

    const existing = await Customer.findOne({
      $or: [{ email: cleanEmail }, { mobile: cleanMobile }],
    })
    if (existing) {
      return res.status(400).json({ error: 'An account with this email or mobile number already exists' })
    }

    const customerId = `cust-${crypto.randomUUID()}`
    const passwordHash = bcrypt.hashSync(password, 10)
    const now = new Date().toISOString()

    const customer = await Customer.create({
      id: customerId,
      name: name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password_hash: passwordHash,
      saved_addresses: [],
      created_at: now,
    })

    // Automatically create Royalty Member account
    const member = await createRoyaltyMember(customerId)

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
router.post('/login', async (req, res) => {
  try {
    const { emailOrMobile, password } = req.body
    if (!emailOrMobile || !password) {
      return res.status(400).json({ error: 'Email/Mobile and Password are required' })
    }

    const clean = emailOrMobile.trim().toLowerCase()
    const cleanMobile = emailOrMobile.trim().replace(/\D/g, '')

    const customer = await Customer.findOne({
      $or: [
        { email: clean },
        { mobile: emailOrMobile.trim() },
        { mobile: cleanMobile },
      ],
    })

    if (!customer) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your details.' })
    }

    let isValidPassword = false
    if (customer.password_hash && bcrypt.compareSync(password, customer.password_hash)) {
      isValidPassword = true
    } else if (
      (!customer.password_hash || customer.password_hash === '') &&
      (password === customer.mobile || password === cleanMobile)
    ) {
      // Auto-set mobile as hashed password for walk-in customer
      const newHash = bcrypt.hashSync(password, 10)
      await Customer.updateOne({ id: customer.id }, { password_hash: newHash })
      isValidPassword = true
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your details.' })
    }

    let member = await getMemberByCustomerId(customer.id)
    if (!member) {
      member = await createRoyaltyMember(customer.id)
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
        savedAddresses: customer.saved_addresses || [],
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
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const customer = await Customer.findOne({ id: req.user.id }).lean()
    if (!customer) return res.status(404).json({ error: 'Customer not found' })

    let member = await getMemberByCustomerId(customer.id)
    if (!member) {
      member = await createRoyaltyMember(customer.id)
    }

    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        savedAddresses: customer.saved_addresses || [],
        createdAt: customer.created_at,
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
router.post('/address', authMiddleware, async (req, res) => {
  try {
    const { address } = req.body
    if (!address) return res.status(400).json({ error: 'Address payload is required' })

    const customer = await Customer.findOne({ id: req.user.id })
    if (!customer) return res.status(404).json({ error: 'Customer not found' })

    const existing = customer.saved_addresses || []
    const updated = [address, ...existing.filter((a) => a.id !== address.id)].slice(0, 5)

    await Customer.updateOne({ id: req.user.id }, { saved_addresses: updated })

    res.json({ success: true, savedAddresses: updated })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Change Password (Customer can change password anytime)
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' })
    }

    const customer = await Customer.findOne({ id: req.user.id })
    if (!customer) return res.status(404).json({ error: 'Customer not found' })

    // Verify current password if customer has an existing password or check against their mobile
    let isCurrentValid = false
    if (customer.password_hash && currentPassword) {
      isCurrentValid = bcrypt.compareSync(currentPassword, customer.password_hash)
    } else if (
      currentPassword &&
      (currentPassword === customer.mobile || currentPassword === customer.mobile.replace(/\D/g, ''))
    ) {
      isCurrentValid = true
    }

    if (!isCurrentValid && customer.password_hash) {
      return res.status(400).json({ error: 'Incorrect current password' })
    }

    const newHash = bcrypt.hashSync(newPassword, 10)
    await Customer.updateOne({ id: req.user.id }, { password_hash: newHash })

    res.json({
      success: true,
      message: 'Password changed successfully! You can now log in with your new password.',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
