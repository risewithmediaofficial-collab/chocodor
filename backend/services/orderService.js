import crypto from 'node:crypto'
import { db } from '../db.js'
import { creditOrderPoints, reverseOrderPoints } from './royaltyService.js'

/**
 * Helper to fetch store settings from database
 */
export function getStoreSettings(key) {
  const row = db.prepare('SELECT value FROM store_settings WHERE key = ?').get(key)
  if (!row) return null
  try {
    return JSON.parse(row.value)
  } catch {
    return row.value
  }
}

/**
 * Generates formatted sequence numbers (e.g. CD-2026-000001, INV-2026-000001, KOT-2026-000001)
 */
function getNextSequenceNumber(prefix, tableName, column) {
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get()
  const nextNum = (countRow ? countRow.count : 0) + 1
  const year = new Date().getFullYear()
  const padded = String(nextNum).padStart(6, '0')
  return `${prefix}-${year}-${padded}`
}

/**
 * Checks whether customer is eligible for the first-order discount (₹20 OFF).
 * Verified server-side: checks both previous completed/placed orders and promotions_log.
 */
export function checkFirstOrderEligibility(customerId, customerMobile) {
  const promoSettings = getStoreSettings('promotions') || { firstOrderOfferEnabled: true, firstOrderDiscount: 20 }
  if (!promoSettings.firstOrderOfferEnabled) return { eligible: false, discount: 0 }

  if (!customerId && !customerMobile) return { eligible: false, discount: 0 }

  // Check past orders by customer ID or mobile
  let pastOrderCount = 0
  if (customerId) {
    pastOrderCount += db.prepare("SELECT COUNT(*) as c FROM orders WHERE customer_id = ? AND status != 'CANCELLED'").get(customerId).c
  }
  if (customerMobile) {
    pastOrderCount += db.prepare("SELECT COUNT(*) as c FROM orders WHERE customer_mobile = ? AND status != 'CANCELLED'").get(customerMobile).c
  }

  // Also check promotions log
  let promoLogCount = 0
  if (customerId) {
    promoLogCount += db.prepare("SELECT COUNT(*) as c FROM promotions_log WHERE customer_id = ? AND promo_code = 'FIRST_ORDER_20'").get(customerId).c
  }

  const eligible = pastOrderCount === 0 && promoLogCount === 0
  return {
    eligible,
    discount: eligible ? (promoSettings.firstOrderDiscount || 20) : 0,
  }
}

/**
 * Calculates deterministic server-side quotation for items, delivery, and discounts.
 */
export function calculateOrderQuote({
  items,
  orderType = 'DELIVERY',
  customerId = null,
  customerMobile = null,
  appliedRewardCode = null,
  applyFirstOrderOffer = false,
}) {
  if (!items || items.length === 0) {
    throw new Error('Order items list cannot be empty')
  }

  const productStmt = db.prepare(`
    SELECT id, name, price, royalty_points, is_available
    FROM products WHERE id = ?
  `)

  let subtotal = 0
  let totalRoyaltyPoints = 0
  const evaluatedItems = []

  for (const item of items) {
    const product = productStmt.get(item.productId || item.id)
    if (!product) throw new Error(`Product not found: ${item.productId || item.id}`)
    if (!product.is_available) throw new Error(`Product is currently unavailable: ${product.name}`)

    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1)
    const itemSubtotal = product.price * quantity
    const itemPoints = product.royalty_points * quantity

    subtotal += itemSubtotal
    totalRoyaltyPoints += itemPoints

    evaluatedItems.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      royaltyPointsPerUnit: product.royalty_points,
      quantity,
      subtotal: itemSubtotal,
      totalPoints: itemPoints,
    })
  }

  // Delivery rules from store_settings
  const deliverySettings = getStoreSettings('delivery') || { standardCharge: 40, freeThreshold: 500, enabled: true }
  let deliveryFee = 0
  if (orderType === 'DELIVERY') {
    if (deliverySettings.enabled) {
      const threshold = deliverySettings.freeThreshold !== undefined ? deliverySettings.freeThreshold : 500
      const standardCharge = deliverySettings.standardCharge !== undefined ? deliverySettings.standardCharge : 40
      // If subtotal >= threshold, free delivery (₹0). Exactly ₹500 qualifies.
      deliveryFee = subtotal >= threshold ? 0 : standardCharge
    }
  }

  // First-order discount evaluation
  let firstOrderDiscount = 0
  const firstOrderCheck = checkFirstOrderEligibility(customerId, customerMobile)
  if (applyFirstOrderOffer && firstOrderCheck.eligible) {
    firstOrderDiscount = firstOrderCheck.discount
  }

  // Reward coupon discount evaluation
  let rewardDiscount = 0
  let rewardData = null
  if (appliedRewardCode) {
    const redemption = db.prepare(`
      SELECT r.*, rew.name as reward_name
      FROM reward_redemptions r
      JOIN rewards rew ON r.reward_id = rew.id
      WHERE r.redemption_code = ? AND r.is_used = 0
    `).get(appliedRewardCode)

    if (!redemption) {
      throw new Error('Invalid or already used reward code')
    }

    if (new Date(redemption.expires_at) < new Date()) {
      throw new Error('Reward coupon has expired')
    }

    if (subtotal < redemption.min_order_value) {
      throw new Error(`Minimum order value of ₹${redemption.min_order_value} required for this reward`)
    }

    rewardDiscount = redemption.discount_value
    rewardData = redemption
  }

  // Grand Total calculation
  const discountedSubtotal = Math.max(0, subtotal - firstOrderDiscount - rewardDiscount)
  const grandTotal = discountedSubtotal + deliveryFee

  return {
    items: evaluatedItems,
    subtotal,
    deliveryFee,
    firstOrderDiscount,
    rewardDiscount,
    rewardData,
    grandTotal,
    totalRoyaltyPoints,
    firstOrderEligible: firstOrderCheck.eligible,
  }
}

/**
 * Creates an order in the database, generates invoice and KOT records, and captures immutable snapshots.
 */
export function createOrder({
  customerId = null,
  customerName,
  customerMobile,
  customerEmail = '',
  orderSource = 'ONLINE', // 'ONLINE' | 'OFFLINE'
  orderType = 'DELIVERY', // 'DELIVERY' | 'PICKUP' | 'DINE_IN'
  deliveryAddress = null,
  pickupTime = 'As soon as possible',
  items,
  appliedRewardCode = null,
  applyFirstOrderOffer = false,
  paymentMethod = 'COD', // 'COD' | 'RAZORPAY' | 'CASH' | 'UPI' | 'CARD'
  posStaffId = null,
  tableOrTokenNo = null,
  notes = '',
}) {
  if (!customerName || !customerName.trim()) throw new Error('Customer name is required')
  if (!customerMobile || customerMobile.trim().length < 10) throw new Error('Valid 10-digit mobile number is required')

  const quote = calculateOrderQuote({
    items,
    orderType,
    customerId,
    customerMobile,
    appliedRewardCode,
    applyFirstOrderOffer,
  })

  const orderId = `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  const orderNumber = getNextSequenceNumber('CD', 'orders', 'order_number')
  const invoiceNumber = getNextSequenceNumber('INV', 'invoices', 'invoice_number')
  const kotNumber = getNextSequenceNumber('KOT', 'kots', 'kot_number')
  const now = new Date().toISOString()

  let initialStatus = 'NEW'
  let paymentStatus = 'PENDING'

  if (orderSource === 'OFFLINE') {
    // POS orders with CASH / UPI / CARD paid at billing counter are marked PAID immediately
    if (['CASH', 'UPI', 'CARD'].includes(paymentMethod)) {
      paymentStatus = 'PAID'
      initialStatus = 'CONFIRMED'
    } else {
      paymentStatus = 'PENDING'
    }
  } else {
    // Online orders
    if (paymentMethod === 'COD') {
      paymentStatus = 'COD_PENDING'
      initialStatus = 'NEW'
    } else if (paymentMethod === 'RAZORPAY') {
      paymentStatus = 'PENDING'
      initialStatus = 'NEW'
    }
  }

  const deliveryAddressStr = deliveryAddress ? JSON.stringify(deliveryAddress) : null

  // 1. Insert Order
  db.prepare(`
    INSERT INTO orders (
      id, order_number, order_source, invoice_number, kot_number, customer_id, customer_name, customer_mobile, customer_email,
      order_type, delivery_address, pickup_time, subtotal, delivery_fee, first_order_discount, reward_discount,
      applied_reward_code, total_amount, total_royalty_points, points_credited,
      status, payment_status, payment_method, pos_staff_id, table_or_token_no, notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, 0,
      ?, ?, ?, ?, ?, ?, ?, ?
    )
  `).run(
    orderId,
    orderNumber,
    orderSource,
    invoiceNumber,
    kotNumber,
    customerId,
    customerName.trim(),
    customerMobile.trim(),
    customerEmail ? customerEmail.trim() : '',
    orderType,
    deliveryAddressStr,
    pickupTime,
    quote.subtotal,
    quote.deliveryFee,
    quote.firstOrderDiscount,
    quote.rewardDiscount,
    appliedRewardCode || null,
    quote.grandTotal,
    quote.totalRoyaltyPoints,
    initialStatus,
    paymentStatus,
    paymentMethod,
    posStaffId || null,
    tableOrTokenNo || null,
    notes || '',
    now,
    now
  )

  // 2. Insert Order Item Snapshots
  const itemInsert = db.prepare(`
    INSERT INTO order_items (
      id, order_id, product_id, product_name_snapshot,
      unit_price_snapshot, royalty_points_snapshot,
      quantity, subtotal, total_points
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const item of quote.items) {
    const itemId = `item_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
    itemInsert.run(
      itemId,
      orderId,
      item.productId,
      item.name,
      item.unitPrice,
      item.royaltyPointsPerUnit,
      item.quantity,
      item.subtotal,
      item.totalPoints
    )
  }

  // 3. Insert KOT
  db.prepare(`
    INSERT INTO kots (
      id, kot_number, order_id, order_number, order_source, customer_name, customer_mobile,
      order_type, items, special_instructions, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?)
  `).run(
    `kot_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    kotNumber,
    orderId,
    orderNumber,
    orderSource,
    customerName.trim(),
    customerMobile.trim(),
    orderType,
    JSON.stringify(quote.items),
    notes || '',
    now,
    now
  )

  // 4. Insert Invoice
  db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, order_id, order_number, customer_name, customer_mobile, customer_address,
      subtotal, first_order_discount, reward_discount, delivery_charge, total_amount,
      payment_method, payment_status, royalty_points_earned, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `inv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    invoiceNumber,
    orderId,
    orderNumber,
    customerName.trim(),
    customerMobile.trim(),
    deliveryAddressStr,
    quote.subtotal,
    quote.firstOrderDiscount,
    quote.rewardDiscount,
    quote.deliveryFee,
    quote.grandTotal,
    paymentMethod,
    paymentStatus,
    quote.totalRoyaltyPoints,
    now
  )

  // 5. Insert Status History
  db.prepare(`
    INSERT INTO order_status_history (id, order_id, status, changed_by, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(`osh_${Date.now()}`, orderId, initialStatus, orderSource === 'OFFLINE' ? 'POS_STAFF' : 'CUSTOMER', 'Order created', now)

  // 6. Record Promotions Log if first-order offer used
  if (quote.firstOrderDiscount > 0 && customerId) {
    db.prepare(`
      INSERT INTO promotions_log (id, promo_code, customer_id, order_id, discount_amount, created_at)
      VALUES (?, 'FIRST_ORDER_20', ?, ?, ?, ?)
    `).run(`prm_${Date.now()}`, customerId, orderId, quote.firstOrderDiscount, now)
  }

  // 7. Mark reward coupon as used
  if (quote.rewardData) {
    db.prepare(`
      UPDATE reward_redemptions
      SET is_used = 1, used_order_id = ?
      WHERE id = ?
    `).run(orderId, quote.rewardData.id)
  }

  // If POS order is completed immediately upon cash payment:
  if (orderSource === 'OFFLINE' && paymentStatus === 'PAID') {
    // Check if auto-complete is active or keep in CONFIRMED/PREPARING
  }

  return getOrderById(orderId)
}

/**
 * Updates order status and keeps KOT, invoice, history, and points ledger strictly synchronized.
 */
export function updateOrderStatus(orderId, newStatus, changedBy = 'ADMIN', notes = '') {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  if (!order) throw new Error('Order not found')

  const validStatuses = [
    'NEW',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
  ]

  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid order status: ${newStatus}`)
  }

  const now = new Date().toISOString()
  let paymentStatusUpdate = order.payment_status

  // When order is delivered / completed for COD orders, mark as COD_CONFIRMED / PAID
  if (['DELIVERED', 'COMPLETED'].includes(newStatus)) {
    if (order.payment_status === 'COD_PENDING') {
      paymentStatusUpdate = 'COD_CONFIRMED'
    }
  }

  db.prepare(`
    UPDATE orders
    SET status = ?, payment_status = ?, updated_at = ?
    WHERE id = ?
  `).run(newStatus, paymentStatusUpdate, now, orderId)

  // Update Invoice payment status
  db.prepare(`
    UPDATE invoices
    SET payment_status = ?
    WHERE order_id = ?
  `).run(paymentStatusUpdate, orderId)

  // Synchronize KOT status
  if (['PREPARING', 'READY', 'COMPLETED'].includes(newStatus)) {
    db.prepare('UPDATE kots SET status = ?, updated_at = ? WHERE order_id = ?').run(newStatus, now, orderId)
  } else if (newStatus === 'CONFIRMED') {
    db.prepare("UPDATE kots SET status = 'NEW', updated_at = ? WHERE order_id = ?").run(now, orderId)
  }

  // Log status history
  db.prepare(`
    INSERT INTO order_status_history (id, order_id, status, changed_by, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(`osh_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`, orderId, newStatus, changedBy, notes, now)

  // Point crediting trigger on COMPLETED
  if (newStatus === 'COMPLETED') {
    if (order.points_credited === 0 && order.customer_id) {
      creditOrderPoints(order.id, changedBy)
    }
  }

  // Point reversal on CANCELLED if previously credited
  if (newStatus === 'CANCELLED' && order.points_credited === 1 && order.customer_id) {
    reverseOrderPoints(order.id, `Order ${order.order_number} Cancelled`, changedBy)
  }

  return getOrderById(orderId)
}

/**
 * Updates Razorpay payment status after server verification.
 */
export function updateRazorpayPaymentSuccess(orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE orders
    SET payment_status = 'PAID', status = 'CONFIRMED',
        razorpay_order_id = ?, razorpay_payment_id = ?, razorpay_signature = ?, updated_at = ?
    WHERE id = ?
  `).run(razorpayOrderId, razorpayPaymentId, razorpaySignature, now, orderId)

  db.prepare("UPDATE invoices SET payment_status = 'PAID' WHERE order_id = ?").run(orderId)

  // Log status history
  db.prepare(`
    INSERT INTO order_status_history (id, order_id, status, changed_by, notes, created_at)
    VALUES (?, ?, 'CONFIRMED', 'RAZORPAY_VERIFICATION', 'Payment verified via Razorpay', ?)
  `).run(`osh_${Date.now()}`, orderId, now)

  return getOrderById(orderId)
}

/**
 * Marks payment as FAILED on Razorpay signature mismatch or client failure callback.
 */
export function markPaymentFailed(orderId, failureReason = 'Payment failed or declined') {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE orders
    SET payment_status = 'FAILED', updated_at = ?
    WHERE id = ?
  `).run(now, orderId)

  db.prepare("UPDATE invoices SET payment_status = 'FAILED' WHERE order_id = ?").run(orderId)

  db.prepare(`
    INSERT INTO order_status_history (id, order_id, status, changed_by, notes, created_at)
    VALUES (?, ?, 'PAYMENT_FAILED', 'PAYMENT_GATEWAY', ?, ?)
  `).run(`osh_${Date.now()}`, orderId, failureReason, now)

  return getOrderById(orderId)
}

/**
 * Retrieves full order details with snapshots and items.
 */
export function getOrderById(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  if (!order) return null

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId)
  const history = db.prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC').all(orderId)
  const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId)
  const kot = db.prepare('SELECT * FROM kots WHERE order_id = ?').get(orderId)

  return {
    ...order,
    delivery_address: order.delivery_address ? JSON.parse(order.delivery_address) : null,
    items,
    history,
    invoice,
    kot,
  }
}

/**
 * Retrieves order by readable order number (e.g. CD-2026-000001).
 */
export function getOrderByNumber(orderNumber) {
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber)
  if (!order) return null
  return getOrderById(order.id)
}

/**
 * Live orders polling query supporting `since` timestamp, status filtering, and source filtering (ONLINE/OFFLINE).
 */
export function getLiveOrders({ since, status, source, search, fromDate, toDate, limit = 50, offset = 0 } = {}) {
  let query = 'SELECT * FROM orders WHERE 1=1'
  const params = []

  if (since) {
    query += ' AND updated_at > ?'
    params.push(since)
  }

  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }

  if (source) {
    query += ' AND order_source = ?'
    params.push(source)
  }

  if (fromDate) {
    query += ' AND created_at >= ?'
    params.push(`${fromDate}T00:00:00.000Z`)
  }

  if (toDate) {
    query += ' AND created_at <= ?'
    params.push(`${toDate}T23:59:59.999Z`)
  }

  if (search) {
    query += ' AND (order_number LIKE ? OR customer_name LIKE ? OR customer_mobile LIKE ? OR invoice_number LIKE ?)'
    const term = `%${search}%`
    params.push(term, term, term, term)
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const rows = db.prepare(query).all(...params)

  const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?')
  return rows.map((ord) => ({
    ...ord,
    delivery_address: ord.delivery_address ? JSON.parse(ord.delivery_address) : null,
    items: itemStmt.all(ord.id),
  }))
}
