import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { db } from '../db.js'
import { updateOrderStatus, getOrderById, getLiveOrders } from '../services/orderService.js'
import { manualPointAdjustment } from '../services/royaltyService.js'
import { JWT_SECRET } from './auth.js'

const router = express.Router()

export function adminAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required' })
  }

  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin role required' })
    }
    req.admin = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin session' })
  }
}

// Admin Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email.trim().toLowerCase())
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid administrator credentials' })
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role, isAdmin: true },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Dashboard Stats (Real database values)
router.get('/dashboard', adminAuth, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count
    const todayOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at LIKE ?').get(`${today}%`).count
    const todaySales = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as sum FROM orders WHERE created_at LIKE ? AND status != 'CANCELLED'").get(`${today}%`).sum
    const totalSales = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as sum FROM orders WHERE status != 'CANCELLED'").get().sum

    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'NEW'").get().count
    const processingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP')").get().count
    const completedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'COMPLETED'").get().count
    const cancelledOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'CANCELLED'").get().count

    const totalMembers = db.prepare('SELECT COUNT(*) as count FROM royalty_members').get().count
    const pointsIssued = db.prepare('SELECT COALESCE(SUM(lifetime_points), 0) as sum FROM royalty_members').get().sum
    const pointsRedeemed = db.prepare('SELECT COALESCE(SUM(points_redeemed), 0) as sum FROM royalty_members').get().sum
    const activePointsPool = db.prepare('SELECT COALESCE(SUM(current_points), 0) as sum FROM royalty_members').get().sum

    const recentOrders = getLiveOrders({ limit: 5 })

    res.json({
      todayOrders,
      todaySales,
      totalOrders,
      totalSales,
      pendingOrders,
      processingOrders,
      completedOrders,
      cancelledOrders,
      totalMembers,
      pointsIssued,
      pointsRedeemed,
      activePointsPool,
      recentOrders,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Orders List with 30s polling support (since parameter)
router.get('/orders', adminAuth, (req, res) => {
  try {
    const { since, status, search, fromDate, toDate, limit = 100 } = req.query
    const orders = getLiveOrders({ since, status, search, fromDate, toDate, limit: parseInt(limit, 10) })
    res.json({ orders, timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Single Order Detail
router.get('/orders/:id', adminAuth, (req, res) => {
  try {
    const order = getOrderById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.json({ order })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update Order Status (Credits points on COMPLETED)
router.patch('/orders/:id/status', adminAuth, (req, res) => {
  try {
    const { status } = req.body
    if (!status) return res.status(400).json({ error: 'Status is required' })

    const updated = updateOrderStatus(req.params.id, status, req.admin.id)
    res.json({ success: true, order: updated })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Manage Products (View, Create, Edit, Delete)
router.get('/products', adminAuth, (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ORDER BY c.sort_order ASC, p.name ASC
    `).all()

    res.json({
      products: products.map((p) => ({
        id: p.id,
        categoryId: p.category_id,
        category: p.category_name,
        name: p.name,
        price: p.price,
        royaltyPoints: p.royalty_points,
        description: p.description,
        badge: p.badge,
        image: p.image,
        ingredients: p.ingredients || '',
        dietaryInfo: p.dietary_info || '100% Vegetarian, Eggless',
        servingSuggestion: p.serving_suggestion || '',
        preparationTime: p.preparation_time || '15–20 mins',
        portionSize: p.portion_size || 'Serves 1–2',
        extraImages: p.extra_images ? JSON.parse(p.extra_images || '[]') : [],
        isAvailable: p.is_available === 1,
        isFeatured: p.is_featured === 1,
        isBestseller: p.is_bestseller === 1,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create New Product
router.post('/products', adminAuth, (req, res) => {
  try {
    const {
      name,
      categoryId,
      price,
      royaltyPoints,
      description,
      badge,
      image,
      ingredients,
      dietaryInfo,
      servingSuggestion,
      preparationTime,
      portionSize,
      extraImages,
      isAvailable,
      isFeatured,
      isBestseller,
    } = req.body

    if (!name || !name.trim()) return res.status(400).json({ error: 'Product name is required' })
    if (!categoryId) return res.status(400).json({ error: 'Category is required' })
    if (price === undefined || isNaN(parseFloat(price))) return res.status(400).json({ error: 'Valid price is required' })

    const id = `p_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
    const numPrice = parseFloat(price)
    const numPoints = royaltyPoints !== undefined ? parseInt(royaltyPoints, 10) : Math.round(numPrice * 0.1)
    const defaultImage = image && image.trim() ? image.trim() : '/images/hero_chocolate.jpg'
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO products (
        id, category_id, name, price, royalty_points, description, badge, image,
        ingredients, dietary_info, serving_suggestion, preparation_time, portion_size, extra_images,
        is_available, is_featured, is_bestseller, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      id,
      categoryId,
      name.trim(),
      numPrice,
      numPoints,
      description || '',
      badge || '',
      defaultImage,
      ingredients || '',
      dietaryInfo || '100% Vegetarian, Eggless',
      servingSuggestion || '',
      preparationTime || '15–20 mins',
      portionSize || 'Serves 1–2',
      JSON.stringify(extraImages || []),
      isAvailable !== false ? 1 : 0,
      isFeatured ? 1 : 0,
      isBestseller ? 1 : 0,
      now
    )

    res.json({ success: true, message: 'Product created successfully', productId: id })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Update Existing Product
router.patch('/products/:id', adminAuth, (req, res) => {
  try {
    const {
      name,
      price,
      royaltyPoints,
      isAvailable,
      isFeatured,
      isBestseller,
      categoryId,
      description,
      badge,
      image,
      ingredients,
      dietaryInfo,
      servingSuggestion,
      preparationTime,
      portionSize,
      extraImages,
    } = req.body

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Product not found' })

    const updatedPrice = price !== undefined ? parseFloat(price) : existing.price
    const updatedPoints = royaltyPoints !== undefined ? parseInt(royaltyPoints, 10) : existing.royalty_points
    const updatedAvailable = isAvailable !== undefined ? (isAvailable ? 1 : 0) : existing.is_available
    const updatedFeatured = isFeatured !== undefined ? (isFeatured ? 1 : 0) : existing.is_featured
    const updatedBestseller = isBestseller !== undefined ? (isBestseller ? 1 : 0) : existing.is_bestseller
    const updatedName = name !== undefined ? name.trim() : existing.name
    const updatedCat = categoryId || existing.category_id
    const updatedDesc = description !== undefined ? description : existing.description
    const updatedBadge = badge !== undefined ? badge : existing.badge
    const updatedImage = image !== undefined ? image : existing.image
    const updatedIngredients = ingredients !== undefined ? ingredients : existing.ingredients
    const updatedDietary = dietaryInfo !== undefined ? dietaryInfo : existing.dietary_info
    const updatedServing = servingSuggestion !== undefined ? servingSuggestion : existing.serving_suggestion
    const updatedPrep = preparationTime !== undefined ? preparationTime : existing.preparation_time
    const updatedPortion = portionSize !== undefined ? portionSize : existing.portion_size
    const updatedExtraImages = extraImages !== undefined ? JSON.stringify(extraImages) : existing.extra_images

    db.prepare(`
      UPDATE products 
      SET name = ?, price = ?, royalty_points = ?, is_available = ?, is_featured = ?, is_bestseller = ?,
          category_id = ?, description = ?, badge = ?, image = ?,
          ingredients = ?, dietary_info = ?, serving_suggestion = ?, preparation_time = ?, portion_size = ?, extra_images = ?
      WHERE id = ?
    `).run(
      updatedName,
      updatedPrice,
      updatedPoints,
      updatedAvailable,
      updatedFeatured,
      updatedBestseller,
      updatedCat,
      updatedDesc,
      updatedBadge,
      updatedImage,
      updatedIngredients,
      updatedDietary,
      updatedServing,
      updatedPrep,
      updatedPortion,
      updatedExtraImages,
      req.params.id
    )

    res.json({ success: true, message: 'Product updated successfully' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Bulk Daily Menu Selection (Enable/Disable for Today)
router.patch('/products-daily-menu', adminAuth, (req, res) => {
  try {
    const { action, categoryId, productIds, isAvailable } = req.body

    const targetAvailability = isAvailable ? 1 : 0

    if (action === 'SET_ALL') {
      db.prepare('UPDATE products SET is_available = ?').run(targetAvailability)
    } else if (action === 'SET_CATEGORY' && categoryId) {
      db.prepare('UPDATE products SET is_available = ? WHERE category_id = ?').run(targetAvailability, categoryId)
    } else if (action === 'SET_PRODUCTS' && Array.isArray(productIds)) {
      const stmt = db.prepare('UPDATE products SET is_available = ? WHERE id = ?')
      for (const id of productIds) {
        stmt.run(targetAvailability, id)
      }
    }

    res.json({ success: true, message: "Daily menu availability updated" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete Product
router.delete('/products/:id', adminAuth, (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Product not found' })

    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id)
    res.json({ success: true, message: 'Product deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Manage Customers
router.get('/customers', adminAuth, (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT 
        c.id, c.name, c.email, c.mobile, c.created_at,
        r.royalty_id, r.current_points, r.lifetime_points, r.points_redeemed, r.tier,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(CASE WHEN o.status != 'CANCELLED' THEN o.total_amount ELSE 0 END), 0) as total_spent
      FROM customers c
      LEFT JOIN royalty_members r ON c.id = r.customer_id
      LEFT JOIN orders o ON c.id = o.customer_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all()

    res.json({ customers })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Customer Drilldown
router.get('/customers/:id', adminAuth, (req, res) => {
  try {
    const customer = db.prepare('SELECT id, name, email, mobile, created_at FROM customers WHERE id = ?').get(req.params.id)
    if (!customer) return res.status(404).json({ error: 'Customer not found' })

    const member = db.prepare('SELECT * FROM royalty_members WHERE customer_id = ?').get(customer.id)
    const orders = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC').all(customer.id)
    const transactions = db.prepare('SELECT * FROM royalty_transactions WHERE customer_id = ? ORDER BY created_at DESC').all(customer.id)

    res.json({
      customer,
      royalty: member,
      orders,
      transactions,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete Customer and Associated Records
router.delete('/customers/:id', adminAuth, (req, res) => {
  try {
    const customerId = req.params.id
    const customer = db.prepare('SELECT id, name FROM customers WHERE id = ?').get(customerId)
    if (!customer) return res.status(404).json({ error: 'Customer not found' })

    // Clean up customer associations
    db.prepare('DELETE FROM qr_tokens WHERE customer_id = ?').run(customerId)
    db.prepare('DELETE FROM royalty_transactions WHERE customer_id = ?').run(customerId)
    db.prepare('DELETE FROM royalty_members WHERE customer_id = ?').run(customerId)
    db.prepare('DELETE FROM customers WHERE id = ?').run(customerId)

    res.json({ success: true, message: `Customer ${customer.name} deleted successfully.` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Manual Royalty Points Adjustment
router.post('/customers/:id/adjust-points', adminAuth, (req, res) => {
  try {
    const { amount, direction, reason } = req.body
    const result = manualPointAdjustment(req.params.id, amount, direction, reason, req.admin.id)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Royalty Ledger Audit View
router.get('/royalty/transactions', adminAuth, (req, res) => {
  try {
    const { type, direction, search, limit = 100 } = req.query
    let query = `
      SELECT t.*, c.name as customer_name, c.mobile as customer_mobile, r.royalty_id
      FROM royalty_transactions t
      JOIN customers c ON t.customer_id = c.id
      JOIN royalty_members r ON t.member_id = r.id
      WHERE 1=1
    `
    const params = []

    if (type) {
      query += ' AND t.type = ?'
      params.push(type)
    }

    if (direction) {
      query += ' AND t.direction = ?'
      params.push(direction)
    }

    if (search) {
      query += ' AND (c.name LIKE ? OR c.mobile LIKE ? OR r.royalty_id LIKE ? OR t.reason LIKE ?)'
      const term = `%${search}%`
      params.push(term, term, term, term)
    }

    query += ' ORDER BY t.created_at DESC LIMIT ?'
    params.push(parseInt(limit, 10))

    const transactions = db.prepare(query).all(...params)
    res.json({ transactions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Rewards CRUD
router.get('/rewards', adminAuth, (req, res) => {
  try {
    const rewards = db.prepare('SELECT * FROM rewards ORDER BY points_required ASC').all()
    const redemptions = db.prepare(`
      SELECT red.*, rew.name as reward_name, c.name as customer_name, c.mobile as customer_mobile
      FROM reward_redemptions red
      JOIN rewards rew ON red.reward_id = rew.id
      JOIN customers c ON red.customer_id = c.id
      ORDER BY red.created_at DESC
      LIMIT 100
    `).all()

    res.json({ rewards, redemptions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/rewards', adminAuth, (req, res) => {
  try {
    const { name, description, pointsRequired, discountType = 'FIXED', discountValue, minOrderValue = 0, validityDays = 30 } = req.body
    if (!name || !pointsRequired || !discountValue) {
      return res.status(400).json({ error: 'Name, points required and discount value are required' })
    }

    const id = `rew-${crypto.randomUUID()}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO rewards (id, name, description, points_required, discount_type, discount_value, min_order_value, is_active, validity_days, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, name, description || '', parseInt(pointsRequired, 10), discountType, parseFloat(discountValue), parseFloat(minOrderValue), parseInt(validityDays, 10), now)

    res.json({ success: true, message: 'Reward created' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.patch('/rewards/:id', adminAuth, (req, res) => {
  try {
    const { name, description, pointsRequired, discountValue, minOrderValue, isActive, validityDays } = req.body
    const existing = db.prepare('SELECT * FROM rewards WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Reward not found' })

    db.prepare(`
      UPDATE rewards 
      SET name = ?, description = ?, points_required = ?, discount_value = ?, min_order_value = ?, is_active = ?, validity_days = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      description !== undefined ? description : existing.description,
      pointsRequired !== undefined ? parseInt(pointsRequired, 10) : existing.points_required,
      discountValue !== undefined ? parseFloat(discountValue) : existing.discount_value,
      minOrderValue !== undefined ? parseFloat(minOrderValue) : existing.min_order_value,
      isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
      validityDays !== undefined ? parseInt(validityDays, 10) : existing.validity_days,
      req.params.id
    )

    res.json({ success: true, message: 'Reward updated' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
