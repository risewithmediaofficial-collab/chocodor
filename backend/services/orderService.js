import crypto from 'node:crypto'
import {
  Order,
  OrderItem,
  KOT,
  Invoice,
  StoreSetting,
  Product,
  CategoryMaterial,
  RawMaterial,
  StockMovement,
  Reward,
  RewardRedemption,
  OrderStatusHistory,
  PromotionLog,
} from '../models/index.js'
import { creditOrderPoints, reverseOrderPoints } from './royaltyService.js'

/**
 * Helper to fetch store settings from MongoDB
 */
export async function getStoreSettings(key) {
  const row = await StoreSetting.findOne({ key }).lean()
  if (!row) return null
  return row.value
}

/**
 * Generates formatted sequence numbers (e.g. CD-2026-000001, INV-2026-000001, KOT-2026-000001)
 */
async function getNextSequenceNumber(prefix, Model) {
  const count = (await Model.countDocuments()) + 1
  const year = new Date().getFullYear()
  const padded = String(count).padStart(6, '0')
  return `${prefix}-${year}-${padded}`
}

function normalizePaymentBreakdown(paymentMethod, paymentBreakdown = [], totalAmount = 0) {
  if (paymentMethod !== 'SPLIT') return []

  const allowedMethods = ['CASH', 'UPI', 'CARD']
  const normalized = []
  for (const entry of paymentBreakdown || []) {
    const method = String(entry.method || '').toUpperCase()
    const amount = Number(entry.amount || 0)
    if (allowedMethods.includes(method) && amount > 0) {
      normalized.push({ method, amount: Number(amount.toFixed(2)) })
    }
  }

  if (normalized.length < 2) {
    throw new Error('Split payment requires at least two payment methods with amount.')
  }

  const splitTotal = Number(normalized.reduce((sum, entry) => sum + entry.amount, 0).toFixed(2))
  const expectedTotal = Number(Number(totalAmount || 0).toFixed(2))
  if (Math.abs(splitTotal - expectedTotal) > 0.01) {
    throw new Error(`Split payment total must equal bill total. Split: ₹${splitTotal}, Bill: ₹${expectedTotal}`)
  }

  return normalized
}

async function deductCategoryStockForOrder(orderId, orderNumber, evaluatedItems) {
  const consumptionByMaterial = new Map()

  for (const item of evaluatedItems) {
    if (!item.categoryId) continue
    const recipes = await CategoryMaterial.find({ category_id: item.categoryId }).lean()
    for (const recipe of recipes) {
      const consumeQty = Number(recipe.quantity_per_item || 0) * item.quantity
      if (consumeQty <= 0) continue
      consumptionByMaterial.set(
        recipe.material_id,
        (consumptionByMaterial.get(recipe.material_id) || 0) + consumeQty
      )
    }
  }

  const now = new Date().toISOString()
  for (const [materialId, quantity] of consumptionByMaterial.entries()) {
    const material = await RawMaterial.findOne({ id: materialId })
    if (!material) continue

    const balanceAfter = Number(material.current_stock || 0) - quantity
    await RawMaterial.updateOne(
      { id: materialId },
      { current_stock: balanceAfter, updated_at: now }
    )

    await StockMovement.create({
      id: `stk_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      material_id: materialId,
      type: 'ORDER_CONSUMPTION',
      quantity: -Number(quantity.toFixed(3)),
      balance_after: Number(balanceAfter.toFixed(3)),
      reason: `Auto deducted for order ${orderNumber}`,
      order_id: orderId,
      order_number: orderNumber,
      created_by: 'SYSTEM',
      created_at: now,
    })
  }
}

async function reverseCategoryStockForOrder(order) {
  const items = await OrderItem.find({ order_id: order.id }).lean()
  const evaluatedItems = []

  for (const item of items) {
    const product = await Product.findOne({ id: item.product_id }).lean()
    if (!product?.category_id) continue
    evaluatedItems.push({
      categoryId: product.category_id,
      quantity: item.quantity,
    })
  }

  const reversalByMaterial = new Map()
  for (const item of evaluatedItems) {
    const recipes = await CategoryMaterial.find({ category_id: item.categoryId }).lean()
    for (const recipe of recipes) {
      const qty = Number(recipe.quantity_per_item || 0) * item.quantity
      if (qty <= 0) continue
      reversalByMaterial.set(recipe.material_id, (reversalByMaterial.get(recipe.material_id) || 0) + qty)
    }
  }

  const now = new Date().toISOString()
  for (const [materialId, quantity] of reversalByMaterial.entries()) {
    const material = await RawMaterial.findOne({ id: materialId })
    if (!material) continue
    const balanceAfter = Number(material.current_stock || 0) + quantity

    await RawMaterial.updateOne({ id: materialId }, { current_stock: balanceAfter, updated_at: now })
    await StockMovement.create({
      id: `stk_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      material_id: materialId,
      type: 'ADJUSTMENT',
      quantity: Number(quantity.toFixed(3)),
      balance_after: Number(balanceAfter.toFixed(3)),
      reason: `Stock reversed for cancelled order ${order.order_number}`,
      order_id: order.id,
      order_number: order.order_number,
      created_by: 'SYSTEM',
      created_at: now,
    })
  }

  await Order.updateOne({ id: order.id }, { stock_reversed: 1, updated_at: now })
}

/**
 * Checks whether customer is eligible for the first-order discount (₹20 OFF).
 * Verified server-side: checks both previous completed/placed orders and promotions_log.
 */
export async function checkFirstOrderEligibility(customerId, customerMobile) {
  const promoSettings = (await getStoreSettings('promotions')) || { firstOrderOfferEnabled: true, firstOrderDiscount: 20 }
  if (!promoSettings.firstOrderOfferEnabled) return { eligible: false, discount: 0 }

  if (!customerId && !customerMobile) return { eligible: false, discount: 0 }

  let pastOrderCount = 0
  if (customerId) {
    pastOrderCount += await Order.countDocuments({ customer_id: customerId, status: { $ne: 'CANCELLED' } })
  }
  if (customerMobile) {
    pastOrderCount += await Order.countDocuments({ customer_mobile: customerMobile, status: { $ne: 'CANCELLED' } })
  }

  let promoLogCount = 0
  if (customerId) {
    promoLogCount += await PromotionLog.countDocuments({ customer_id: customerId, promo_code: 'FIRST_ORDER_20' })
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
export async function calculateOrderQuote({
  items,
  orderType = 'DELIVERY',
  customerId = null,
  customerMobile = null,
  appliedRewardCode = null,
  applyFirstOrderOffer = false,
  strictRewardValidation = false,
}) {
  if (!items || items.length === 0) {
    throw new Error('Order items list cannot be empty')
  }

  let subtotal = 0
  let takeawayExtraTotal = 0
  let totalRoyaltyPoints = 0
  const evaluatedItems = []

  for (const item of items) {
    const pId = item.productId || item.id
    const product = await Product.findOne({ id: pId }).lean()
    if (!product) throw new Error(`Product not found: ${pId}`)
    if (!product.is_available) throw new Error(`Product is currently unavailable: ${product.name}`)

    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1)
    const baseUnitPrice = product.price || 0
    const takeawayExtra = orderType === 'PICKUP' ? Math.max(0, Number(product.takeaway_extra_cost || 0)) : 0
    const effectiveUnitPrice = baseUnitPrice + takeawayExtra
    const itemSubtotal = effectiveUnitPrice * quantity
    const itemTakeawayExtraTotal = takeawayExtra * quantity
    const itemPoints = (product.royalty_points || 0) * quantity

    subtotal += itemSubtotal
    takeawayExtraTotal += itemTakeawayExtraTotal
    totalRoyaltyPoints += itemPoints

    evaluatedItems.push({
      productId: product.id,
      categoryId: product.category_id,
      name: product.name,
      unitPrice: effectiveUnitPrice,
      baseUnitPrice,
      takeawayExtra,
      royaltyPointsPerUnit: product.royalty_points || 0,
      quantity,
      subtotal: itemSubtotal,
      takeawayExtraTotal: itemTakeawayExtraTotal,
      totalPoints: itemPoints,
    })
  }

  // Delivery rules from store_settings
  const deliverySettings = (await getStoreSettings('delivery')) || { standardCharge: 40, freeThreshold: 500, enabled: true }
  let deliveryFee = 0
  if (orderType === 'DELIVERY') {
    if (deliverySettings.enabled) {
      const threshold = deliverySettings.freeThreshold !== undefined ? deliverySettings.freeThreshold : 500
      const standardCharge = deliverySettings.standardCharge !== undefined ? deliverySettings.standardCharge : 40
      deliveryFee = subtotal >= threshold ? 0 : standardCharge
    }
  }

  // First-order discount evaluation
  let firstOrderDiscount = 0
  const firstOrderCheck = await checkFirstOrderEligibility(customerId, customerMobile)
  if (applyFirstOrderOffer && firstOrderCheck.eligible) {
    firstOrderDiscount = firstOrderCheck.discount || 20
  }

  // Reward coupon discount evaluation
  let rewardDiscount = 0
  let rewardData = null
  let rewardError = null

  if (appliedRewardCode) {
    const cleanCode = appliedRewardCode.trim().toUpperCase()
    const redemption = await RewardRedemption.findOne({
      redemption_code: cleanCode,
      is_used: 0,
    }).lean()

    if (!redemption) {
      rewardError = 'Invalid or already used reward coupon code'
    } else if (new Date(redemption.expires_at) < new Date()) {
      rewardError = 'This reward coupon has expired'
    } else if (subtotal < (redemption.min_order_value || 0)) {
      rewardError = `Minimum order value of ₹${redemption.min_order_value} required for this coupon`
    } else {
      rewardDiscount = redemption.discount_value || 0
      rewardData = redemption
    }

    if (strictRewardValidation && rewardError) {
      throw new Error(rewardError)
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - firstOrderDiscount - rewardDiscount)
  const grandTotal = discountedSubtotal + deliveryFee

  return {
    items: evaluatedItems,
    subtotal,
    takeawayExtraTotal,
    deliveryFee,
    firstOrderDiscount,
    rewardDiscount,
    rewardData,
    rewardError,
    grandTotal,
    totalRoyaltyPoints,
    firstOrderEligible: firstOrderCheck.eligible,
    eligibleForFreeDelivery: deliveryFee === 0 && orderType === 'DELIVERY',
  }
}

/**
 * Creates an order in MongoDB, generates invoice and KOT records, and captures immutable snapshots.
 */
export async function createOrder({
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
  paymentBreakdown = [],
  deferPayment = false,
  posStaffId = null,
  tableOrTokenNo = null,
  notes = '',
}) {
  if (!customerName || !customerName.trim()) throw new Error('Customer name is required')
  if (!customerMobile || customerMobile.trim().length < 10) throw new Error('Valid 10-digit mobile number is required')

  const quote = await calculateOrderQuote({
    items,
    orderType,
    customerId,
    customerMobile,
    appliedRewardCode,
    applyFirstOrderOffer,
    strictRewardValidation: true,
  })

  const orderId = `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  const orderNumber = await getNextSequenceNumber('CD', Order)
  const invoiceNumber = await getNextSequenceNumber('INV', Invoice)
  const kotNumber = await getNextSequenceNumber('KOT', KOT)
  const now = new Date().toISOString()

  let initialStatus = 'NEW'
  let paymentStatus = 'PENDING'
  const normalizedPaymentBreakdown = normalizePaymentBreakdown(paymentMethod, paymentBreakdown, quote.grandTotal)

  if (orderSource === 'OFFLINE' && deferPayment) {
    paymentStatus = 'PENDING'
    initialStatus = 'NEW'
  } else if (orderSource === 'OFFLINE') {
    if (['CASH', 'UPI', 'CARD', 'SPLIT'].includes(paymentMethod)) {
      paymentStatus = 'PAID'
      initialStatus = 'CONFIRMED'
    } else {
      paymentStatus = 'PENDING'
    }
  } else {
    if (paymentMethod === 'COD') {
      paymentStatus = 'COD_PENDING'
      initialStatus = 'NEW'
    } else if (paymentMethod === 'RAZORPAY') {
      paymentStatus = 'PENDING'
      initialStatus = 'NEW'
    }
  }

  // 1. Insert Order
  await Order.create({
    id: orderId,
    order_number: orderNumber,
    order_source: orderSource,
    invoice_number: invoiceNumber,
    kot_number: kotNumber,
    customer_id: customerId,
    customer_name: customerName.trim(),
    customer_mobile: customerMobile.trim(),
    customer_email: customerEmail ? customerEmail.trim() : '',
    order_type: orderType,
    delivery_address: deliveryAddress,
    pickup_time: pickupTime,
    subtotal: quote.subtotal,
    takeaway_extra_total: quote.takeawayExtraTotal,
    delivery_fee: quote.deliveryFee,
    first_order_discount: quote.firstOrderDiscount,
    reward_discount: quote.rewardDiscount,
    applied_reward_code: appliedRewardCode || null,
    total_amount: quote.grandTotal,
    total_royalty_points: quote.totalRoyaltyPoints,
    points_credited: 0,
    stock_deducted: 0,
    stock_reversed: 0,
    status: initialStatus,
    payment_status: paymentStatus,
    payment_method: paymentMethod,
    payment_breakdown: normalizedPaymentBreakdown,
    pos_staff_id: posStaffId || null,
    table_or_token_no: tableOrTokenNo || null,
    notes: notes || '',
    created_at: now,
    updated_at: now,
  })

  // 2. Insert Order Item Snapshots
  const itemDocs = quote.items.map((item) => ({
    id: `item_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    order_id: orderId,
    product_id: item.productId,
    product_name_snapshot: item.name,
    unit_price_snapshot: item.unitPrice,
    base_unit_price_snapshot: item.baseUnitPrice,
    takeaway_extra_snapshot: item.takeawayExtra,
    royalty_points_snapshot: item.royaltyPointsPerUnit,
    quantity: item.quantity,
    subtotal: item.subtotal,
    total_points: item.totalPoints,
  }))
  await OrderItem.insertMany(itemDocs)

  // 3. Insert KOT
  await KOT.create({
    id: `kot_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    kot_number: kotNumber,
    order_id: orderId,
    order_number: orderNumber,
    order_source: orderSource,
    customer_name: customerName.trim(),
    customer_mobile: customerMobile.trim(),
    order_type: orderType,
    items: quote.items,
    special_instructions: notes || '',
    status: 'NEW',
    created_at: now,
    updated_at: now,
  })

  await deductCategoryStockForOrder(orderId, orderNumber, quote.items)
  await Order.updateOne({ id: orderId }, { stock_deducted: 1, updated_at: now })

  // 4. Insert Invoice
  await Invoice.create({
    id: `inv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    invoice_number: invoiceNumber,
    order_id: orderId,
    order_number: orderNumber,
    customer_name: customerName.trim(),
    customer_mobile: customerMobile.trim(),
    customer_address: deliveryAddress,
    subtotal: quote.subtotal,
    takeaway_extra_total: quote.takeawayExtraTotal,
    first_order_discount: quote.firstOrderDiscount,
    reward_discount: quote.rewardDiscount,
    delivery_charge: quote.deliveryFee,
    total_amount: quote.grandTotal,
    payment_method: paymentMethod,
    payment_breakdown: normalizedPaymentBreakdown,
    payment_status: paymentStatus,
    royalty_points_earned: quote.totalRoyaltyPoints,
    created_at: now,
  })

  // 5. Insert Status History
  await OrderStatusHistory.create({
    id: `osh_${Date.now()}`,
    order_id: orderId,
    status: initialStatus,
    changed_by: orderSource === 'OFFLINE' ? 'POS_STAFF' : 'CUSTOMER',
    notes: 'Order created',
    created_at: now,
  })

  // 6. Record Promotions Log if first-order offer used
  if (quote.firstOrderDiscount > 0 && customerId) {
    await PromotionLog.create({
      id: `prm_${Date.now()}`,
      promo_code: 'FIRST_ORDER_20',
      customer_id: customerId,
      order_id: orderId,
      discount_amount: quote.firstOrderDiscount,
      created_at: now,
    })
  }

  // 7. Mark reward coupon as used
  if (quote.rewardData) {
    await RewardRedemption.updateOne(
      { id: quote.rewardData.id },
      { is_used: 1, used_order_id: orderId }
    )
  }

  return await getOrderById(orderId)
}

/**
 * Updates order status and keeps KOT, invoice, history, and points ledger strictly synchronized.
 */
export async function updateOrderStatus(orderId, newStatus, changedBy = 'ADMIN', notes = '') {
  const order = await Order.findOne({ id: orderId })
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

  if (['DELIVERED', 'COMPLETED'].includes(newStatus)) {
    if (order.payment_status === 'COD_PENDING') {
      paymentStatusUpdate = 'COD_CONFIRMED'
    }
  }

  await Order.updateOne(
    { id: orderId },
    { status: newStatus, payment_status: paymentStatusUpdate, updated_at: now }
  )

  // Update Invoice payment status
  await Invoice.updateOne({ order_id: orderId }, { payment_status: paymentStatusUpdate })

  // Synchronize KOT status
  if (['PREPARING', 'READY', 'COMPLETED'].includes(newStatus)) {
    await KOT.updateOne({ order_id: orderId }, { status: newStatus, updated_at: now })
  } else if (newStatus === 'CONFIRMED') {
    await KOT.updateOne({ order_id: orderId }, { status: 'NEW', updated_at: now })
  }

  // Log status history
  await OrderStatusHistory.create({
    id: `osh_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    order_id: orderId,
    status: newStatus,
    changed_by: changedBy,
    notes: notes,
    created_at: now,
  })

  // Point crediting trigger on COMPLETED
  if (newStatus === 'COMPLETED') {
    const canCreditPoints = ['PAID', 'COD_CONFIRMED'].includes(paymentStatusUpdate)
    if (canCreditPoints && order.points_credited === 0 && order.customer_id) {
      await creditOrderPoints(order.id, changedBy)
    }
  }

  // Point reversal on CANCELLED if previously credited
  if (newStatus === 'CANCELLED' && order.points_credited === 1 && order.customer_id) {
    await reverseOrderPoints(order.id, `Order ${order.order_number} Cancelled`, changedBy)
  }

  const canReverseStock = ['NEW', 'CONFIRMED'].includes(order.status)
  if (newStatus === 'CANCELLED' && canReverseStock && order.stock_deducted === 1 && order.stock_reversed !== 1) {
    await reverseCategoryStockForOrder(order)
  }

  return await getOrderById(orderId)
}

/**
 * Settles payment for an already-created POS order, usually after a held KOT is completed.
 */
export async function settleOrderPayment(orderId, paymentMethod = 'CASH', changedBy = 'POS_STAFF', paymentBreakdown = []) {
  const order = await Order.findOne({ id: orderId })
  if (!order) throw new Error('Order not found')

  const cleanPaymentMethod = ['CASH', 'UPI', 'CARD', 'SPLIT'].includes(paymentMethod) ? paymentMethod : 'CASH'
  const normalizedPaymentBreakdown = normalizePaymentBreakdown(cleanPaymentMethod, paymentBreakdown, order.total_amount)
  const now = new Date().toISOString()

  await Order.updateOne(
    { id: orderId },
    {
      payment_method: cleanPaymentMethod,
      payment_breakdown: normalizedPaymentBreakdown,
      payment_status: 'PAID',
      status: 'COMPLETED',
      updated_at: now,
    }
  )

  await Invoice.updateOne(
    { order_id: orderId },
    {
      payment_method: cleanPaymentMethod,
      payment_breakdown: normalizedPaymentBreakdown,
      payment_status: 'PAID',
    }
  )

  await KOT.updateOne({ order_id: orderId }, { status: 'COMPLETED', updated_at: now })

  await OrderStatusHistory.create({
    id: `osh_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    order_id: orderId,
    status: 'COMPLETED',
    changed_by: changedBy,
    notes: `Held bill settled by ${cleanPaymentMethod}`,
    created_at: now,
  })

  if (order.points_credited === 0 && order.customer_id) {
    await creditOrderPoints(order.id, changedBy)
  }

  return await getOrderById(orderId)
}

/**
 * Updates Razorpay payment status after server verification.
 */
export async function updateRazorpayPaymentSuccess(orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const now = new Date().toISOString()
  await Order.updateOne(
    { id: orderId },
    {
      payment_status: 'PAID',
      status: 'CONFIRMED',
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      updated_at: now,
    }
  )

  await Invoice.updateOne({ order_id: orderId }, { payment_status: 'PAID' })

  await OrderStatusHistory.create({
    id: `osh_${Date.now()}`,
    order_id: orderId,
    status: 'CONFIRMED',
    changed_by: 'RAZORPAY_VERIFICATION',
    notes: 'Payment verified via Razorpay',
    created_at: now,
  })

  return await getOrderById(orderId)
}

/**
 * Marks payment as FAILED on Razorpay signature mismatch or client failure callback.
 */
export async function markPaymentFailed(orderId, failureReason = 'Payment failed or declined') {
  const now = new Date().toISOString()
  await Order.updateOne({ id: orderId }, { payment_status: 'FAILED', updated_at: now })
  await Invoice.updateOne({ order_id: orderId }, { payment_status: 'FAILED' })

  await OrderStatusHistory.create({
    id: `osh_${Date.now()}`,
    order_id: orderId,
    status: 'PAYMENT_FAILED',
    changed_by: 'PAYMENT_GATEWAY',
    notes: failureReason,
    created_at: now,
  })

  return await getOrderById(orderId)
}

/**
 * Retrieves full order details with snapshots and items.
 */
export async function getOrderById(orderId) {
  const order = await Order.findOne({ id: orderId }).lean()
  if (!order) return null

  const items = await OrderItem.find({ order_id: orderId }).lean()
  const history = await OrderStatusHistory.find({ order_id: orderId }).sort({ created_at: 1 }).lean()
  const invoice = await Invoice.findOne({ order_id: orderId }).lean()
  const kot = await KOT.findOne({ order_id: orderId }).lean()

  return {
    ...order,
    items,
    history,
    invoice,
    kot,
  }
}

/**
 * Retrieves order by readable order number (e.g. CD-2026-000001).
 */
export async function getOrderByNumber(orderNumber) {
  const order = await Order.findOne({ order_number: orderNumber }).lean()
  if (!order) return null
  return await getOrderById(order.id)
}

/**
 * Live orders polling query supporting `since` timestamp, status filtering, and source filtering.
 */
export async function getLiveOrders({ since, status, source, search, fromDate, toDate, limit = 50, offset = 0 } = {}) {
  const filter = {}

  if (since) {
    filter.updated_at = { $gt: since }
  }

  if (status) {
    filter.status = status
  }

  if (source) {
    filter.order_source = source
  }

  if (fromDate || toDate) {
    filter.created_at = {}
    if (fromDate) filter.created_at.$gte = `${fromDate}T00:00:00.000Z`
    if (toDate) filter.created_at.$lte = `${toDate}T23:59:59.999Z`
  }

  if (search) {
    const regex = new RegExp(search, 'i')
    filter.$or = [
      { order_number: regex },
      { customer_name: regex },
      { customer_mobile: regex },
      { invoice_number: regex },
    ]
  }

  const orders = await Order.find(filter)
    .sort({ created_at: -1 })
    .skip(offset)
    .limit(limit)
    .lean()

  // Attach items to each order
  const orderIds = orders.map((o) => o.id)
  const allItems = await OrderItem.find({ order_id: { $in: orderIds } }).lean()
  const itemsMap = {}
  for (const item of allItems) {
    if (!itemsMap[item.order_id]) itemsMap[item.order_id] = []
    itemsMap[item.order_id].push(item)
  }

  return orders.map((ord) => ({
    ...ord,
    items: itemsMap[ord.id] || [],
  }))
}
