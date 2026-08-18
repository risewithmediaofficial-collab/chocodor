import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import {
  Admin,
  Customer,
  RoyaltyMember,
  RoyaltyTransaction,
  Category,
  RawMaterial,
  CategoryMaterial,
  StockMovement,
  Product,
  Order,
  OrderItem,
  KOT,
  Invoice,
  StoreSetting,
  Reward,
  RewardRedemption,
  ProductReview,
  OrderStatusHistory,
  QRToken,
} from '../models/index.js'
import { updateOrderStatus, getOrderById, getLiveOrders, settleOrderPayment } from '../services/orderService.js'
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
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() })
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

// Dashboard Stats
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const totalOrders = await Order.countDocuments()
    const todayOrders = await Order.countDocuments({ created_at: { $regex: `^${today}` } })

    const todaySalesAgg = await Order.aggregate([
      { $match: { created_at: { $regex: `^${today}` }, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } },
    ])
    const todaySales = todaySalesAgg.length > 0 ? todaySalesAgg[0].total : 0

    const totalSalesAgg = await Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } },
    ])
    const totalSales = totalSalesAgg.length > 0 ? totalSalesAgg[0].total : 0

    const pendingOrders = await Order.countDocuments({ status: 'NEW' })
    const processingOrders = await Order.countDocuments({
      status: { $in: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'] },
    })
    const completedOrders = await Order.countDocuments({ status: 'COMPLETED' })
    const cancelledOrders = await Order.countDocuments({ status: 'CANCELLED' })

    const totalMembers = await RoyaltyMember.countDocuments()

    const pointsIssuedAgg = await RoyaltyMember.aggregate([
      { $group: { _id: null, sum: { $sum: '$lifetime_points' } } },
    ])
    const pointsIssued = pointsIssuedAgg.length > 0 ? pointsIssuedAgg[0].sum : 0

    const pointsRedeemedAgg = await RoyaltyMember.aggregate([
      { $group: { _id: null, sum: { $sum: '$points_redeemed' } } },
    ])
    const pointsRedeemed = pointsRedeemedAgg.length > 0 ? pointsRedeemedAgg[0].sum : 0

    const activePointsAgg = await RoyaltyMember.aggregate([
      { $group: { _id: null, sum: { $sum: '$current_points' } } },
    ])
    const activePointsPool = activePointsAgg.length > 0 ? activePointsAgg[0].sum : 0

    const recentOrders = await getLiveOrders({ limit: 5 })
    const paidTodayOrders = await Order.find({
      created_at: { $regex: `^${today}` },
      status: { $ne: 'CANCELLED' },
      payment_status: 'PAID',
    }).lean()
    const paymentBreakdown = { CASH: 0, UPI: 0, CARD: 0, SPLIT: 0 }
    for (const order of paidTodayOrders) {
      if (order.payment_method === 'SPLIT' && Array.isArray(order.payment_breakdown)) {
        paymentBreakdown.SPLIT += order.total_amount || 0
        for (const part of order.payment_breakdown) {
          const method = part.method
          if (paymentBreakdown[method] !== undefined) paymentBreakdown[method] += Number(part.amount || 0)
        }
      } else if (paymentBreakdown[order.payment_method] !== undefined) {
        paymentBreakdown[order.payment_method] += order.total_amount || 0
      }
    }

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
      paymentBreakdown,
      recentOrders,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Orders List with polling support
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const { since, status, search, fromDate, toDate, limit = 100 } = req.query
    const orders = await getLiveOrders({ since, status, search, fromDate, toDate, limit: parseInt(limit, 10) })
    res.json({ orders, timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Single Order Detail
router.get('/orders/:id', adminAuth, async (req, res) => {
  try {
    const order = await getOrderById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.json({ order })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update Order Status (Credits points on COMPLETED)
router.patch('/orders/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body
    if (!status) return res.status(400).json({ error: 'Status is required' })

    const updated = await updateOrderStatus(req.params.id, status, req.admin.id)
    res.json({ success: true, order: updated })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Held POS Bills: unpaid walk-in/takeaway/dine-in bills sent to KOT
router.get('/hold-bills', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find({
      order_source: 'OFFLINE',
      payment_status: 'PENDING',
      status: { $ne: 'CANCELLED' },
    })
      .sort({ created_at: -1 })
      .lean()

    const orderIds = orders.map((o) => o.id)
    const allItems = await OrderItem.find({ order_id: { $in: orderIds } }).lean()
    const allKots = await KOT.find({ order_id: { $in: orderIds } }).lean()

    const itemsMap = {}
    for (const item of allItems) {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = []
      itemsMap[item.order_id].push(item)
    }

    const kotMap = {}
    for (const kot of allKots) kotMap[kot.order_id] = kot

    res.json({
      bills: orders.map((order) => ({
        ...order,
        items: itemsMap[order.id] || [],
        kot: kotMap[order.id] || null,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/orders/:id/settle-payment', adminAuth, async (req, res) => {
  try {
    const { paymentMethod = 'CASH', paymentBreakdown = [] } = req.body
    const order = await settleOrderPayment(req.params.id, paymentMethod, req.admin.id, paymentBreakdown)
    res.json({ success: true, order, invoice: order.invoice })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Stock Management: raw materials, category recipes, and movement ledger
router.get('/stock', adminAuth, async (req, res) => {
  try {
    const [categories, materials, categoryMaterials, movements] = await Promise.all([
      Category.find().sort({ sort_order: 1 }).lean(),
      RawMaterial.find({ is_active: 1 }).sort({ name: 1 }).lean(),
      CategoryMaterial.find().lean(),
      StockMovement.find().sort({ created_at: -1 }).limit(80).lean(),
    ])

    const materialMap = {}
    for (const material of materials) materialMap[material.id] = material
    const categoryMap = {}
    for (const category of categories) categoryMap[category.id] = category

    res.json({
      categories,
      materials,
      categoryMaterials: categoryMaterials.map((row) => ({
        ...row,
        material: materialMap[row.material_id] || null,
        category: categoryMap[row.category_id] || null,
      })),
      movements: movements.map((row) => ({
        ...row,
        material: materialMap[row.material_id] || null,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/stock/materials', adminAuth, async (req, res) => {
  try {
    const { name, unit = 'pcs', currentStock = 0, minStock = 0, supplier = '' } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'Material name is required' })

    const now = new Date().toISOString()
    const material = await RawMaterial.create({
      id: `mat_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      name: name.trim(),
      unit: unit.trim() || 'pcs',
      current_stock: Number(currentStock || 0),
      min_stock: Number(minStock || 0),
      supplier: supplier.trim(),
      is_active: 1,
      created_at: now,
      updated_at: now,
    })

    if (Number(currentStock || 0) !== 0) {
      await StockMovement.create({
        id: `stk_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        material_id: material.id,
        type: 'IN',
        quantity: Number(currentStock || 0),
        balance_after: Number(currentStock || 0),
        reason: 'Opening stock',
        created_by: req.admin.id,
        created_at: now,
      })
    }

    res.status(201).json({ success: true, material })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.patch('/stock/materials/:id', adminAuth, async (req, res) => {
  try {
    const update = {}
    if (req.body.name !== undefined) update.name = req.body.name.trim()
    if (req.body.unit !== undefined) update.unit = req.body.unit.trim() || 'pcs'
    if (req.body.minStock !== undefined) update.min_stock = Number(req.body.minStock || 0)
    if (req.body.supplier !== undefined) update.supplier = req.body.supplier.trim()
    if (req.body.isActive !== undefined) update.is_active = req.body.isActive ? 1 : 0
    update.updated_at = new Date().toISOString()

    const material = await RawMaterial.findOneAndUpdate({ id: req.params.id }, update, { returnDocument: 'after' })
    if (!material) return res.status(404).json({ error: 'Material not found' })
    res.json({ success: true, material })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/stock/materials/:id/adjust', adminAuth, async (req, res) => {
  try {
    const { quantity, type = 'IN', reason = '' } = req.body
    const material = await RawMaterial.findOne({ id: req.params.id })
    if (!material) return res.status(404).json({ error: 'Material not found' })

    const qty = Math.abs(Number(quantity || 0))
    if (qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than 0' })

    const movementType = ['IN', 'OUT', 'ADJUSTMENT'].includes(type) ? type : 'IN'
    const signedQty = movementType === 'IN' ? qty : -qty
    const balanceAfter = Number(material.current_stock || 0) + signedQty
    const now = new Date().toISOString()

    await RawMaterial.updateOne({ id: material.id }, { current_stock: balanceAfter, updated_at: now })
    await StockMovement.create({
      id: `stk_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      material_id: material.id,
      type: movementType,
      quantity: signedQty,
      balance_after: balanceAfter,
      reason: reason.trim() || (movementType === 'IN' ? 'Stock added' : 'Stock adjusted'),
      created_by: req.admin.id,
      created_at: now,
    })

    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/stock/category-materials', adminAuth, async (req, res) => {
  try {
    const { categoryId, materialId, quantityPerItem } = req.body
    if (!categoryId || !materialId) return res.status(400).json({ error: 'Category and material are required' })
    const qty = Number(quantityPerItem || 0)
    if (qty <= 0) return res.status(400).json({ error: 'Quantity per item must be greater than 0' })

    const existing = await CategoryMaterial.findOne({ category_id: categoryId, material_id: materialId })
    if (existing) {
      await CategoryMaterial.updateOne({ id: existing.id }, { quantity_per_item: qty })
      return res.json({ success: true, message: 'Category material updated' })
    }

    await CategoryMaterial.create({
      id: `cm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      category_id: categoryId,
      material_id: materialId,
      quantity_per_item: qty,
      created_at: new Date().toISOString(),
    })
    res.status(201).json({ success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.delete('/stock/category-materials/:id', adminAuth, async (req, res) => {
  try {
    const deleted = await CategoryMaterial.deleteOne({ id: req.params.id })
    if (deleted.deletedCount === 0) return res.status(404).json({ error: 'Category material mapping not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Manage Products
router.get('/products', adminAuth, async (req, res) => {
  try {
    const categories = await Category.find().lean()
    const catMap = {}
    for (const c of categories) {
      catMap[c.id] = c.name
    }

    const products = await Product.find().sort({ name: 1 }).lean()

    res.json({
      products: products.map((p) => ({
        id: p.id,
        categoryId: p.category_id,
        category: catMap[p.category_id] || 'Desserts',
        name: p.name,
        price: p.price,
        takeawayExtraCost: p.takeaway_extra_cost || 0,
        royaltyPoints: p.royalty_points,
        description: p.description,
        badge: p.badge,
        image: p.image,
        ingredients: p.ingredients || '',
        dietaryInfo: p.dietary_info || '100% Vegetarian, Eggless',
        servingSuggestion: p.serving_suggestion || '',
        preparationTime: p.preparation_time || '15–20 mins',
        portionSize: p.portion_size || 'Serves 1–2',
        extraImages: p.extra_images || [],
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
router.post('/products', adminAuth, async (req, res) => {
  try {
    const {
      name,
      categoryId,
      price,
      takeawayExtraCost = 0,
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

    await Product.create({
      id,
      category_id: categoryId,
      name: name.trim(),
      price: numPrice,
      takeaway_extra_cost: Math.max(0, parseFloat(takeawayExtraCost) || 0),
      royalty_points: numPoints,
      description: description || '',
      badge: badge || '',
      image: defaultImage,
      ingredients: ingredients || '',
      dietary_info: dietaryInfo || '100% Vegetarian, Eggless',
      serving_suggestion: servingSuggestion || '',
      preparation_time: preparationTime || '15–20 mins',
      portion_size: portionSize || 'Serves 1–2',
      extra_images: extraImages || [],
      is_available: isAvailable !== false ? 1 : 0,
      is_featured: isFeatured ? 1 : 0,
      is_bestseller: isBestseller ? 1 : 0,
      created_at: now,
    })

    res.json({ success: true, message: 'Product created successfully', productId: id })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Update Existing Product
router.patch('/products/:id', adminAuth, async (req, res) => {
  try {
    const existing = await Product.findOne({ id: req.params.id })
    if (!existing) return res.status(404).json({ error: 'Product not found' })

    const updateFields = {}
    if (req.body.name !== undefined) updateFields.name = req.body.name.trim()
    if (req.body.price !== undefined) updateFields.price = parseFloat(req.body.price)
    if (req.body.takeawayExtraCost !== undefined) updateFields.takeaway_extra_cost = Math.max(0, parseFloat(req.body.takeawayExtraCost) || 0)
    if (req.body.royaltyPoints !== undefined) updateFields.royalty_points = parseInt(req.body.royaltyPoints, 10)
    if (req.body.isAvailable !== undefined) updateFields.is_available = req.body.isAvailable ? 1 : 0
    if (req.body.isFeatured !== undefined) updateFields.is_featured = req.body.isFeatured ? 1 : 0
    if (req.body.isBestseller !== undefined) updateFields.is_bestseller = req.body.isBestseller ? 1 : 0
    if (req.body.categoryId) updateFields.category_id = req.body.categoryId
    if (req.body.description !== undefined) updateFields.description = req.body.description
    if (req.body.badge !== undefined) updateFields.badge = req.body.badge
    if (req.body.image !== undefined) updateFields.image = req.body.image
    if (req.body.ingredients !== undefined) updateFields.ingredients = req.body.ingredients
    if (req.body.dietaryInfo !== undefined) updateFields.dietary_info = req.body.dietaryInfo
    if (req.body.servingSuggestion !== undefined) updateFields.serving_suggestion = req.body.servingSuggestion
    if (req.body.preparationTime !== undefined) updateFields.preparation_time = req.body.preparationTime
    if (req.body.portionSize !== undefined) updateFields.portion_size = req.body.portionSize
    if (req.body.extraImages !== undefined) updateFields.extra_images = req.body.extraImages

    await Product.updateOne({ id: req.params.id }, updateFields)

    res.json({ success: true, message: 'Product updated successfully' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Bulk Daily Menu Selection
router.patch('/products-daily-menu', adminAuth, async (req, res) => {
  try {
    const { action, categoryId, productIds, isAvailable } = req.body
    const targetAvailability = isAvailable ? 1 : 0

    if (action === 'SET_ALL') {
      await Product.updateMany({}, { is_available: targetAvailability })
    } else if (action === 'SET_CATEGORY' && categoryId) {
      await Product.updateMany({ category_id: categoryId }, { is_available: targetAvailability })
    } else if (action === 'SET_PRODUCTS' && Array.isArray(productIds)) {
      await Product.updateMany({ id: { $in: productIds } }, { is_available: targetAvailability })
    }

    res.json({ success: true, message: 'Daily menu availability updated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete Product
router.delete('/products/:id', adminAuth, async (req, res) => {
  try {
    const existing = await Product.findOne({ id: req.params.id })
    if (!existing) return res.status(404).json({ error: 'Product not found' })

    await Product.deleteOne({ id: req.params.id })
    res.json({ success: true, message: 'Product deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Manage Customers
router.get('/customers', adminAuth, async (req, res) => {
  try {
    const customers = await Customer.find().sort({ created_at: -1 }).lean()
    const customerIds = customers.map((c) => c.id)

    const members = await RoyaltyMember.find({ customer_id: { $in: customerIds } }).lean()
    const memberMap = {}
    for (const m of members) {
      memberMap[m.customer_id] = m
    }

    const orderAgg = await Order.aggregate([
      { $match: { customer_id: { $in: customerIds } } },
      {
        $group: {
          _id: '$customer_id',
          order_count: { $sum: 1 },
          total_spent: {
            $sum: { $cond: [{ $ne: ['$status', 'CANCELLED'] }, '$total_amount', 0] },
          },
        },
      },
    ])
    const orderMap = {}
    for (const o of orderAgg) {
      orderMap[o._id] = o
    }

    const result = customers.map((c) => {
      const mem = memberMap[c.id] || {}
      const ord = orderMap[c.id] || { order_count: 0, total_spent: 0 }
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        mobile: c.mobile,
        created_at: c.created_at,
        royalty_id: mem.royalty_id || null,
        current_points: mem.current_points || 0,
        lifetime_points: mem.lifetime_points || 0,
        points_redeemed: mem.points_redeemed || 0,
        tier: mem.tier || 'MEMBER',
        order_count: ord.order_count,
        total_spent: ord.total_spent,
      }
    })

    res.json({ customers: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Customer Drilldown
router.get('/customers/:id', adminAuth, async (req, res) => {
  try {
    const customer = await Customer.findOne({ id: req.params.id }).lean()
    if (!customer) return res.status(404).json({ error: 'Customer not found' })

    const member = await RoyaltyMember.findOne({ customer_id: customer.id }).lean()
    const orders = await Order.find({ customer_id: customer.id }).sort({ created_at: -1 }).lean()
    const transactions = await RoyaltyTransaction.find({ customer_id: customer.id }).sort({ created_at: -1 }).lean()

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

// Delete Customer and All Associated Cascade Records (Zero foreign key issues)
router.delete('/customers/:id', adminAuth, async (req, res) => {
  try {
    const customerId = req.params.id
    const customer = await Customer.findOne({
      $or: [{ id: customerId }, { _id: customerId.match(/^[0-9a-fA-F]{24}$/) ? customerId : null }]
    })
    if (!customer) return res.status(404).json({ error: 'Customer not found' })

    const targetId = customer.id

    // 1. Find all orders placed by this customer
    const customerOrders = await Order.find({ customer_id: targetId }).lean()
    const orderIds = customerOrders.map((o) => o.id)
    const orderNumbers = customerOrders.map((o) => o.order_number)

    // 2. Cascade delete order items, KOTs, invoices, and status histories
    if (orderIds.length > 0) {
      await OrderItem.deleteMany({ order_id: { $in: orderIds } })
      await Invoice.deleteMany({ order_id: { $in: orderIds } })
      await OrderStatusHistory.deleteMany({ order_id: { $in: orderIds } })
      await KOT.deleteMany({
        $or: [
          { order_id: { $in: orderIds } },
          { order_number: { $in: orderNumbers } },
        ]
      })
      await Order.deleteMany({ customer_id: targetId })
    }

    // 3. Delete royalty records, tokens, redemptions, and reviews
    await RoyaltyTransaction.deleteMany({ customer_id: targetId })
    await RoyaltyMember.deleteMany({ customer_id: targetId })
    await RewardRedemption.deleteMany({ customer_id: targetId })
    await QRToken.deleteMany({ customer_id: targetId })
    await ProductReview.deleteMany({ customer_id: targetId })

    // 4. Delete customer record
    await Customer.deleteOne({ _id: customer._id })

    res.json({ success: true, message: `✓ Customer "${customer.name}" and all associated orders/royalty records have been deleted.` })
  } catch (err) {
    console.error('Error deleting customer:', err)
    res.status(500).json({ error: err.message })
  }
})

// Delete Order and Cascade Associated Items/KOT
router.delete('/orders/:id', adminAuth, async (req, res) => {
  try {
    const orderId = req.params.id
    const order = await Order.findOne({
      $or: [
        { id: orderId },
        { order_number: orderId },
        { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }
      ]
    })
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const targetId = order.id
    const targetNumber = order.order_number

    await OrderItem.deleteMany({ order_id: targetId })
    await Invoice.deleteMany({ $or: [{ order_id: targetId }, { order_number: targetNumber }] })
    await OrderStatusHistory.deleteMany({ order_id: targetId })
    await KOT.deleteMany({ $or: [{ order_id: targetId }, { order_number: targetNumber }] })
    await Order.deleteOne({ _id: order._id })

    res.json({ success: true, message: `✓ Order "${targetNumber}" deleted successfully.` })
  } catch (err) {
    console.error('Error deleting order:', err)
    res.status(500).json({ error: err.message })
  }
})

// Delete / Dismiss KOT Ticket
router.delete('/kot/:id', adminAuth, async (req, res) => {
  try {
    const kotId = req.params.id
    const kot = await KOT.findOne({
      $or: [
        { id: kotId },
        { kot_number: kotId },
        { _id: kotId.match(/^[0-9a-fA-F]{24}$/) ? kotId : null }
      ]
    })
    if (!kot) return res.status(404).json({ error: 'KOT not found' })

    await KOT.deleteOne({ _id: kot._id })
    res.json({ success: true, message: `✓ KOT "${kot.kot_number}" removed from kitchen queue.` })
  } catch (err) {
    console.error('Error deleting KOT:', err)
    res.status(500).json({ error: err.message })
  }
})

// Delete Royalty Transaction from Ledger
router.delete('/royalty/transactions/:id', adminAuth, async (req, res) => {
  try {
    const txId = req.params.id
    const tx = await RoyaltyTransaction.findOne({
      $or: [{ id: txId }, { _id: txId.match(/^[0-9a-fA-F]{24}$/) ? txId : null }]
    })
    if (!tx) return res.status(404).json({ error: 'Transaction not found' })

    await RoyaltyTransaction.deleteOne({ _id: tx._id })
    res.json({ success: true, message: '✓ Transaction record deleted from audit ledger.' })
  } catch (err) {
    console.error('Error deleting royalty transaction:', err)
    res.status(500).json({ error: err.message })
  }
})

// Delete Reward Template
router.delete('/rewards/:id', adminAuth, async (req, res) => {
  try {
    const rewardId = req.params.id
    const reward = await Reward.findOne({
      $or: [{ id: rewardId }, { _id: rewardId.match(/^[0-9a-fA-F]{24}$/) ? rewardId : null }]
    })
    if (!reward) return res.status(404).json({ error: 'Reward not found' })

    await RewardRedemption.deleteMany({ reward_id: reward.id })
    await Reward.deleteOne({ _id: reward._id })
    res.json({ success: true, message: `✓ Reward "${reward.name}" deleted.` })
  } catch (err) {
    console.error('Error deleting reward:', err)
    res.status(500).json({ error: err.message })
  }
})

// Delete Reward Redemption Coupon
router.delete('/rewards/redemptions/:id', adminAuth, async (req, res) => {
  try {
    const redemptionId = req.params.id
    const red = await RewardRedemption.findOne({
      $or: [{ id: redemptionId }, { redemption_code: redemptionId }, { _id: redemptionId.match(/^[0-9a-fA-F]{24}$/) ? redemptionId : null }]
    })
    if (!red) return res.status(404).json({ error: 'Redemption coupon not found' })

    await RewardRedemption.deleteOne({ _id: red._id })
    res.json({ success: true, message: `✓ Redemption coupon "${red.redemption_code}" deleted.` })
  } catch (err) {
    console.error('Error deleting redemption coupon:', err)
    res.status(500).json({ error: err.message })
  }
})

// Manual Royalty Points Adjustment
router.post('/customers/:id/adjust-points', adminAuth, async (req, res) => {
  try {
    const { amount, direction, reason } = req.body
    const result = await manualPointAdjustment(req.params.id, amount, direction, reason, req.admin.id)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Royalty Ledger Audit View
router.get('/royalty/transactions', adminAuth, async (req, res) => {
  try {
    const { type, direction, search, limit = 100 } = req.query
    const filter = {}

    if (type) filter.type = type
    if (direction) filter.direction = direction

    const transactions = await RoyaltyTransaction.find(filter)
      .sort({ created_at: -1 })
      .limit(parseInt(limit, 10))
      .lean()

    const customerIds = [...new Set(transactions.map((t) => t.customer_id))]
    const memberIds = [...new Set(transactions.map((t) => t.member_id))]

    const customers = await Customer.find({ id: { $in: customerIds } }).lean()
    const members = await RoyaltyMember.find({ id: { $in: memberIds } }).lean()

    const custMap = {}
    for (const c of customers) custMap[c.id] = c
    const memMap = {}
    for (const m of members) memMap[m.id] = m

    let populated = transactions.map((t) => {
      const c = custMap[t.customer_id] || {}
      const m = memMap[t.member_id] || {}
      return {
        ...t,
        customer_name: c.name || 'Customer',
        customer_mobile: c.mobile || '',
        royalty_id: m.royalty_id || '',
      }
    })

    if (search) {
      const s = search.toLowerCase()
      populated = populated.filter(
        (t) =>
          t.customer_name.toLowerCase().includes(s) ||
          t.customer_mobile.includes(s) ||
          t.royalty_id.toLowerCase().includes(s) ||
          t.reason.toLowerCase().includes(s)
      )
    }

    res.json({ transactions: populated })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Rewards CRUD
router.get('/rewards', adminAuth, async (req, res) => {
  try {
    const rewards = await Reward.find().sort({ points_required: 1 }).lean()
    const redemptions = await RewardRedemption.find().sort({ created_at: -1 }).limit(100).lean()

    const rewardIds = redemptions.map((r) => r.reward_id)
    const customerIds = redemptions.map((r) => r.customer_id)

    const rewardDocs = await Reward.find({ id: { $in: rewardIds } }).lean()
    const custDocs = await Customer.find({ id: { $in: customerIds } }).lean()

    const rewMap = {}
    for (const r of rewardDocs) rewMap[r.id] = r.name
    const custMap = {}
    for (const c of custDocs) custMap[c.id] = c

    const populatedRedemptions = redemptions.map((r) => ({
      ...r,
      reward_name: rewMap[r.reward_id] || 'Reward',
      customer_name: custMap[r.customer_id]?.name || 'Customer',
      customer_mobile: custMap[r.customer_id]?.mobile || '',
    }))

    res.json({ rewards, redemptions: populatedRedemptions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/rewards', adminAuth, async (req, res) => {
  try {
    const { name, description, pointsRequired, discountType = 'FIXED', discountValue, minOrderValue = 0, validityDays = 30 } = req.body
    if (!name || !pointsRequired || !discountValue) {
      return res.status(400).json({ error: 'Name, points required and discount value are required' })
    }

    const id = `rew-${crypto.randomUUID()}`
    const now = new Date().toISOString()

    await Reward.create({
      id,
      name,
      description: description || '',
      points_required: parseInt(pointsRequired, 10),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      min_order_value: parseFloat(minOrderValue),
      is_active: 1,
      validity_days: parseInt(validityDays, 10),
      created_at: now,
    })

    res.json({ success: true, message: 'Reward created' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.patch('/rewards/:id', adminAuth, async (req, res) => {
  try {
    const { name, description, pointsRequired, discountValue, minOrderValue, isActive, validityDays } = req.body
    const existing = await Reward.findOne({ id: req.params.id })
    if (!existing) return res.status(404).json({ error: 'Reward not found' })

    const updateFields = {}
    if (name !== undefined) updateFields.name = name
    if (description !== undefined) updateFields.description = description
    if (pointsRequired !== undefined) updateFields.points_required = parseInt(pointsRequired, 10)
    if (discountValue !== undefined) updateFields.discount_value = parseFloat(discountValue)
    if (minOrderValue !== undefined) updateFields.min_order_value = parseFloat(minOrderValue)
    if (isActive !== undefined) updateFields.is_active = isActive ? 1 : 0
    if (validityDays !== undefined) updateFields.validity_days = parseInt(validityDays, 10)

    await Reward.updateOne({ id: req.params.id }, updateFields)

    res.json({ success: true, message: 'Reward updated' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ==========================================
// Product & Daily Menu Management Endpoints
// ==========================================

// Get All Products for Admin Management
router.get('/products', adminAuth, async (req, res) => {
  try {
    const categories = await Category.find().sort({ sort_order: 1 }).lean()
    const products = await Product.find().sort({ created_at: 1 }).lean()

    const catMap = {}
    for (const c of categories) {
      catMap[c.id] = { name: c.name, slug: c.slug }
    }

    const formattedProducts = products.map((p) => {
      const cInfo = catMap[p.category_id] || { name: 'Desserts', slug: 'desserts' }
      return {
        id: p.id,
        categoryId: p.category_id,
        categorySlug: cInfo.slug,
        category: cInfo.name,
        name: p.name,
        price: p.price,
        takeawayExtraCost: p.takeaway_extra_cost || 0,
        royaltyPoints: p.royalty_points,
        description: p.description || '',
        badge: p.badge || '',
        image: p.image || '/images/products/Tiramisu.jpg',
        ingredients: p.ingredients || 'Belgian Cocoa, Fresh Cream, Pure Butter, Cane Sugar, Roasted Nuts',
        dietaryInfo: p.dietary_info || '100% Vegetarian, Eggless',
        servingSuggestion: p.serving_suggestion || 'Best served warm.',
        preparationTime: p.preparation_time || '15–20 mins',
        portionSize: p.portion_size || 'Serves 1–2',
        isFeatured: Boolean(p.is_featured),
        isBestseller: Boolean(p.is_bestseller),
        isAvailable: Boolean(p.is_available),
        createdAt: p.created_at,
      }
    })

    res.json({
      products: formattedProducts,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        color: c.color,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create New Product
router.post('/products', adminAuth, async (req, res) => {
  try {
    const {
      name,
      categoryId,
      price,
      takeawayExtraCost = 0,
      royaltyPoints,
      description = '',
      badge = '',
      image = '/images/products/Tiramisu.jpg',
      ingredients = '',
      dietaryInfo = '100% Vegetarian, Eggless',
      servingSuggestion = '',
      preparationTime = '15–20 mins',
      portionSize = 'Serves 1–2',
      isAvailable = true,
      isFeatured = false,
      isBestseller = false,
    } = req.body

    if (!name || !categoryId || price === undefined) {
      return res.status(400).json({ error: 'Name, category, and price are required' })
    }

    const id = `p-${Date.now()}`
    const now = new Date().toISOString()

    const product = await Product.create({
      id,
      category_id: categoryId,
      name: name.trim(),
      price: parseFloat(price),
      takeaway_extra_cost: Math.max(0, parseFloat(takeawayExtraCost) || 0),
      royalty_points: parseInt(royaltyPoints || Math.round(parseFloat(price) * 0.08), 10),
      description: description.trim(),
      badge: badge.trim(),
      image,
      ingredients: ingredients.trim(),
      dietary_info: dietaryInfo.trim(),
      serving_suggestion: servingSuggestion.trim(),
      preparation_time: preparationTime.trim(),
      portion_size: portionSize.trim(),
      is_available: isAvailable ? 1 : 0,
      is_featured: isFeatured ? 1 : 0,
      is_bestseller: isBestseller ? 1 : 0,
      created_at: now,
    })

    res.status(201).json({ success: true, product })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update Existing Product
router.patch('/products/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const updateData = {}

    if (req.body.name !== undefined) updateData.name = req.body.name.trim()
    if (req.body.categoryId !== undefined) updateData.category_id = req.body.categoryId
    if (req.body.price !== undefined) updateData.price = parseFloat(req.body.price)
    if (req.body.takeawayExtraCost !== undefined) updateData.takeaway_extra_cost = Math.max(0, parseFloat(req.body.takeawayExtraCost) || 0)
    if (req.body.royaltyPoints !== undefined) updateData.royalty_points = parseInt(req.body.royaltyPoints, 10)
    if (req.body.description !== undefined) updateData.description = req.body.description.trim()
    if (req.body.badge !== undefined) updateData.badge = req.body.badge.trim()
    if (req.body.image !== undefined) updateData.image = req.body.image
    if (req.body.ingredients !== undefined) updateData.ingredients = req.body.ingredients.trim()
    if (req.body.dietaryInfo !== undefined) updateData.dietary_info = req.body.dietaryInfo.trim()
    if (req.body.servingSuggestion !== undefined) updateData.serving_suggestion = req.body.servingSuggestion.trim()
    if (req.body.preparationTime !== undefined) updateData.preparation_time = req.body.preparationTime.trim()
    if (req.body.portionSize !== undefined) updateData.portion_size = req.body.portionSize.trim()
    if (req.body.isAvailable !== undefined) updateData.is_available = req.body.isAvailable ? 1 : 0
    if (req.body.isFeatured !== undefined) updateData.is_featured = req.body.isFeatured ? 1 : 0
    if (req.body.isBestseller !== undefined) updateData.is_bestseller = req.body.isBestseller ? 1 : 0

    const updated = await Product.findOneAndUpdate({ id }, updateData, { returnDocument: 'after' })
    if (!updated) return res.status(404).json({ error: 'Product not found' })

    res.json({ success: true, product: updated })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete Product
router.delete('/products/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await Product.deleteOne({ id })
    if (deleted.deletedCount === 0) return res.status(404).json({ error: 'Product not found' })

    res.json({ success: true, message: 'Product deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Bulk Daily Menu Toggle (Select all / Clear all / Category toggle)
router.patch('/products-daily-menu', adminAuth, async (req, res) => {
  try {
    const { action, categoryId, isAvailable = true } = req.body

    const statusVal = isAvailable ? 1 : 0
    const filter = {}

    if (action === 'SELECT_ALL') {
      await Product.updateMany({}, { is_available: 1 })
    } else if (action === 'CLEAR_ALL') {
      await Product.updateMany({}, { is_available: 0 })
    } else if (action === 'CATEGORY' && categoryId) {
      await Product.updateMany({ category_id: categoryId }, { is_available: statusVal })
    }

    res.json({ success: true, message: 'Daily menu updated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
