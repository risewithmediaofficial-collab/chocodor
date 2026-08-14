import { db } from '../db.js'
import crypto from 'node:crypto'

export function getMemberByCustomerId(customerId) {
  return db.prepare('SELECT * FROM royalty_members WHERE customer_id = ?').get(customerId)
}

export function getMemberById(memberId) {
  return db.prepare('SELECT * FROM royalty_members WHERE id = ?').get(memberId)
}

export function createRoyaltyMember(customerId) {
  // Generate sequence-based or random unique readable Royalty ID
  const count = db.prepare('SELECT COUNT(*) as count FROM royalty_members').get().count + 1
  const royaltyId = `CDR-${String(count).padStart(6, '0')}`
  const memberId = `mem-${crypto.randomUUID()}`
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO royalty_members (id, customer_id, royalty_id, current_points, lifetime_points, points_redeemed, tier, created_at)
    VALUES (?, ?, ?, 0, 0, 0, 'MEMBER', ?)
  `).run(memberId, customerId, royaltyId, now)

  return getMemberById(memberId)
}

/**
 * Idempotently credit points when an order reaches COMPLETED.
 */
export function creditOrderPoints(orderIdOrObj, adminId = 'SYSTEM') {
  const orderId = typeof orderIdOrObj === 'object' ? orderIdOrObj.orderId : orderIdOrObj
  const assignedAdmin = (typeof orderIdOrObj === 'object' && orderIdOrObj.adminId) ? orderIdOrObj.adminId : adminId

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  if (!order) throw new Error('Order not found')

  // Prevent duplicate crediting
  if (order.points_credited === 1) {
    return { success: false, message: 'Points already credited for this order' }
  }

  if (order.total_royalty_points <= 0) {
    db.prepare('UPDATE orders SET points_credited = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), orderId)
    return { success: true, pointsCredited: 0 }
  }

  // Find or create royalty member for customer
  if (!order.customer_id) {
    // Guest order: mark credited without member assignment
    db.prepare('UPDATE orders SET points_credited = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), orderId)
    return { success: true, pointsCredited: 0, message: 'Guest order - no account connected' }
  }

  let member = getMemberByCustomerId(order.customer_id)
  if (!member) {
    member = createRoyaltyMember(order.customer_id)
  }

  const pointsToAdd = order.total_royalty_points
  const newBalance = member.current_points + pointsToAdd
  const newLifetime = member.lifetime_points + pointsToAdd
  const now = new Date().toISOString()
  const txId = `tx-${crypto.randomUUID()}`

  // Atomic transaction
  db.exec('BEGIN TRANSACTION')
  try {
    // 1. Insert ledger transaction
    db.prepare(`
      INSERT INTO royalty_transactions (id, member_id, customer_id, type, amount, direction, order_id, reason, balance_after, created_by, created_at)
      VALUES (?, ?, ?, 'ORDER_COMPLETION', ?, 'CREDIT', ?, ?, ?, ?, ?)
    `).run(txId, member.id, order.customer_id, pointsToAdd, order.id, `Order Completion #${order.order_number}`, newBalance, adminId, now)

    // 2. Update member balance
    db.prepare(`
      UPDATE royalty_members 
      SET current_points = ?, lifetime_points = ?
      WHERE id = ?
    `).run(newBalance, newLifetime, member.id)

    // 3. Mark order as points credited
    db.prepare(`
      UPDATE orders 
      SET points_credited = 1, updated_at = ?
      WHERE id = ?
    `).run(now, order.id)

    db.exec('COMMIT')
    return { success: true, pointsCredited: pointsToAdd, newBalance }
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

/**
 * Reverse points if a completed order is cancelled / refunded.
 */
export function reverseOrderPoints(orderId, reason = 'Order Cancellation / Refund', adminId = 'SYSTEM') {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  if (!order || order.points_credited !== 1 || !order.customer_id) {
    return { success: false, message: 'No points to reverse' }
  }

  const member = getMemberByCustomerId(order.customer_id)
  if (!member) return { success: false, message: 'Member not found' }

  const pointsToDeduct = order.total_royalty_points
  const newBalance = Math.max(0, member.current_points - pointsToDeduct)
  const now = new Date().toISOString()
  const txId = `tx-${crypto.randomUUID()}`

  db.exec('BEGIN TRANSACTION')
  try {
    db.prepare(`
      INSERT INTO royalty_transactions (id, member_id, customer_id, type, amount, direction, order_id, reason, balance_after, created_by, created_at)
      VALUES (?, ?, ?, 'REFUND', ?, 'DEBIT', ?, ?, ?, ?, ?)
    `).run(txId, member.id, order.customer_id, pointsToDeduct, order.id, `${reason} #${order.order_number}`, newBalance, adminId, now)

    db.prepare(`
      UPDATE royalty_members 
      SET current_points = ?
      WHERE id = ?
    `).run(newBalance, member.id)

    db.prepare(`
      UPDATE orders 
      SET points_credited = 0, updated_at = ?
      WHERE id = ?
    `).run(now, order.id)

    db.exec('COMMIT')
    return { success: true, pointsDeducted: pointsToDeduct, newBalance }
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

/**
 * Redeem a reward using points. Generates a unique single-use code.
 */
export function redeemReward(customerId, rewardId) {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId)
  if (!customer) throw new Error('Customer not found')

  let member = getMemberByCustomerId(customerId)
  if (!member) {
    member = createRoyaltyMember(customerId)
  }

  const reward = db.prepare('SELECT * FROM rewards WHERE id = ? AND is_active = 1').get(rewardId)
  if (!reward) throw new Error('Reward not found or inactive')

  if (member.current_points < reward.points_required) {
    throw new Error(`Insufficient Royalty Points. You have ${member.current_points} points, but ${reward.points_required} are required.`)
  }

  const newBalance = member.current_points - reward.points_required
  const newRedeemed = member.points_redeemed + reward.points_required
  const now = new Date()
  const expiresAt = new Date(now.getTime() + (reward.validity_days || 30) * 24 * 60 * 60 * 1000).toISOString()
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase()
  const redemptionCode = `CDR-${reward.discount_value}-${randomSuffix}`
  const redemptionId = `red-${crypto.randomUUID()}`
  const txId = `tx-${crypto.randomUUID()}`

  db.exec('BEGIN TRANSACTION')
  try {
    // 1. Debit transaction in ledger
    db.prepare(`
      INSERT INTO royalty_transactions (id, member_id, customer_id, type, amount, direction, reward_id, reason, balance_after, created_by, created_at)
      VALUES (?, ?, ?, 'REWARD_REDEMPTION', ?, 'DEBIT', ?, ?, ?, 'CUSTOMER', ?)
    `).run(txId, member.id, customerId, reward.points_required, reward.id, `Redeemed: ${reward.name} (${redemptionCode})`, newBalance, now.toISOString())

    // 2. Update member points
    db.prepare(`
      UPDATE royalty_members 
      SET current_points = ?, points_redeemed = ?
      WHERE id = ?
    `).run(newBalance, newRedeemed, member.id)

    // 3. Create single-use redemption code
    db.prepare(`
      INSERT INTO reward_redemptions (id, reward_id, member_id, customer_id, redemption_code, discount_value, min_order_value, points_spent, is_used, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(redemptionId, reward.id, member.id, customerId, redemptionCode, reward.discount_value, reward.min_order_value, reward.points_required, expiresAt, now.toISOString())

    db.exec('COMMIT')

    return {
      success: true,
      redemptionCode,
      discountValue: reward.discount_value,
      minOrderValue: reward.min_order_value,
      newBalance,
      expiresAt,
    }
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

/**
 * Manual point adjustment by Admin with mandatory reason.
 */
export function manualPointAdjustment(customerId, amount, direction, reason, adminId = 'ADMIN') {
  if (!reason || reason.trim().length < 3) {
    throw new Error('A valid reason is required for manual point adjustments')
  }
  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than zero')
  }

  let member = getMemberByCustomerId(customerId)
  if (!member) {
    member = createRoyaltyMember(customerId)
  }

  const numericAmount = parseInt(amount, 10)
  let newBalance = member.current_points
  let newLifetime = member.lifetime_points

  if (direction === 'CREDIT') {
    newBalance += numericAmount
    newLifetime += numericAmount
  } else if (direction === 'DEBIT') {
    newBalance = Math.max(0, newBalance - numericAmount)
  } else {
    throw new Error('Invalid direction. Must be CREDIT or DEBIT')
  }

  const now = new Date().toISOString()
  const txId = `tx-${crypto.randomUUID()}`

  db.exec('BEGIN TRANSACTION')
  try {
    db.prepare(`
      INSERT INTO royalty_transactions (id, member_id, customer_id, type, amount, direction, reason, balance_after, created_by, created_at)
      VALUES (?, ?, ?, 'MANUAL_ADJUSTMENT', ?, ?, ?, ?, ?, ?)
    `).run(txId, member.id, customerId, numericAmount, direction, `Manual Adjustment: ${reason}`, newBalance, adminId, now)

    db.prepare(`
      UPDATE royalty_members 
      SET current_points = ?, lifetime_points = ?
      WHERE id = ?
    `).run(newBalance, newLifetime, member.id)

    db.exec('COMMIT')
    return { success: true, newBalance }
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

/**
 * Fetch customer ledger history.
 */
export function getCustomerTransactions(customerId) {
  return db.prepare(`
    SELECT * FROM royalty_transactions 
    WHERE customer_id = ? 
    ORDER BY created_at DESC
  `).all(customerId)
}
