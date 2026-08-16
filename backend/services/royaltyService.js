import crypto from 'node:crypto'
import {
  Customer,
  RoyaltyMember,
  RoyaltyTransaction,
  Order,
  Reward,
  RewardRedemption,
} from '../models/index.js'

export async function getMemberByCustomerId(customerId) {
  return await RoyaltyMember.findOne({ customer_id: customerId }).lean()
}

export async function getMemberById(memberId) {
  return await RoyaltyMember.findOne({ id: memberId }).lean()
}

export async function createRoyaltyMember(customerId) {
  // Generate sequence-based unique readable Royalty ID
  const count = (await RoyaltyMember.countDocuments()) + 1
  const royaltyId = `CDR-${String(count).padStart(6, '0')}`
  const memberId = `mem-${crypto.randomUUID()}`
  const now = new Date().toISOString()

  await RoyaltyMember.create({
    id: memberId,
    customer_id: customerId,
    royalty_id: royaltyId,
    current_points: 0,
    lifetime_points: 0,
    points_redeemed: 0,
    tier: 'MEMBER',
    created_at: now,
  })

  return await getMemberById(memberId)
}

/**
 * Idempotently credit points when an order reaches COMPLETED.
 */
export async function creditOrderPoints(orderIdOrObj, adminId = 'SYSTEM') {
  const orderId = typeof orderIdOrObj === 'object' ? orderIdOrObj.orderId : orderIdOrObj
  const assignedAdmin = (typeof orderIdOrObj === 'object' && orderIdOrObj.adminId) ? orderIdOrObj.adminId : adminId

  const order = await Order.findOne({ id: orderId })
  if (!order) throw new Error('Order not found')

  // Prevent duplicate crediting
  if (order.points_credited === 1) {
    return { success: false, message: 'Points already credited for this order' }
  }

  if (order.total_royalty_points <= 0) {
    await Order.updateOne({ id: orderId }, { points_credited: 1, updated_at: new Date().toISOString() })
    return { success: true, pointsCredited: 0 }
  }

  // Find or create royalty member for customer
  if (!order.customer_id) {
    // Guest order: mark credited without member assignment
    await Order.updateOne({ id: orderId }, { points_credited: 1, updated_at: new Date().toISOString() })
    return { success: true, pointsCredited: 0, message: 'Guest order - no account connected' }
  }

  let member = await getMemberByCustomerId(order.customer_id)
  if (!member) {
    member = await createRoyaltyMember(order.customer_id)
  }

  const pointsToAdd = order.total_royalty_points
  const newBalance = member.current_points + pointsToAdd
  const newLifetime = member.lifetime_points + pointsToAdd
  const now = new Date().toISOString()
  const txId = `tx-${crypto.randomUUID()}`

  // 1. Insert ledger transaction
  await RoyaltyTransaction.create({
    id: txId,
    member_id: member.id,
    customer_id: order.customer_id,
    type: 'ORDER_COMPLETION',
    amount: pointsToAdd,
    direction: 'CREDIT',
    order_id: order.id,
    reason: `Order Completion #${order.order_number}`,
    balance_after: newBalance,
    created_by: assignedAdmin,
    created_at: now,
  })

  // 2. Update member balance
  await RoyaltyMember.updateOne(
    { id: member.id },
    { current_points: newBalance, lifetime_points: newLifetime }
  )

  // 3. Mark order as points credited
  await Order.updateOne({ id: order.id }, { points_credited: 1, updated_at: now })

  return { success: true, pointsCredited: pointsToAdd, newBalance }
}

/**
 * Reverse points if a completed order is cancelled / refunded.
 */
export async function reverseOrderPoints(orderId, reason = 'Order Cancellation / Refund', adminId = 'SYSTEM') {
  const order = await Order.findOne({ id: orderId })
  if (!order || order.points_credited !== 1 || !order.customer_id) {
    return { success: false, message: 'No points to reverse' }
  }

  const member = await getMemberByCustomerId(order.customer_id)
  if (!member) return { success: false, message: 'Member not found' }

  const pointsToDeduct = order.total_royalty_points
  const newBalance = Math.max(0, member.current_points - pointsToDeduct)
  const now = new Date().toISOString()
  const txId = `tx-${crypto.randomUUID()}`

  await RoyaltyTransaction.create({
    id: txId,
    member_id: member.id,
    customer_id: order.customer_id,
    type: 'REFUND',
    amount: pointsToDeduct,
    direction: 'DEBIT',
    order_id: order.id,
    reason: `${reason} #${order.order_number}`,
    balance_after: newBalance,
    created_by: adminId,
    created_at: now,
  })

  await RoyaltyMember.updateOne({ id: member.id }, { current_points: newBalance })
  await Order.updateOne({ id: order.id }, { points_credited: 0, updated_at: now })

  return { success: true, pointsDeducted: pointsToDeduct, newBalance }
}

/**
 * Redeem a reward using points. Generates a unique single-use code.
 */
export async function redeemReward(customerId, rewardId) {
  const customer = await Customer.findOne({ id: customerId })
  if (!customer) throw new Error('Customer not found')

  let member = await getMemberByCustomerId(customerId)
  if (!member) {
    member = await createRoyaltyMember(customerId)
  }

  const reward = await Reward.findOne({ id: rewardId, is_active: 1 })
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

  // 1. Debit transaction in ledger
  await RoyaltyTransaction.create({
    id: txId,
    member_id: member.id,
    customer_id: customerId,
    type: 'REWARD_REDEMPTION',
    amount: reward.points_required,
    direction: 'DEBIT',
    reward_id: reward.id,
    reason: `Redeemed: ${reward.name} (${redemptionCode})`,
    balance_after: newBalance,
    created_by: 'CUSTOMER',
    created_at: now.toISOString(),
  })

  // 2. Update member points
  await RoyaltyMember.updateOne(
    { id: member.id },
    { current_points: newBalance, points_redeemed: newRedeemed }
  )

  // 3. Create single-use redemption code
  await RewardRedemption.create({
    id: redemptionId,
    reward_id: reward.id,
    member_id: member.id,
    customer_id: customerId,
    redemption_code: redemptionCode,
    discount_value: reward.discount_value,
    min_order_value: reward.min_order_value,
    points_spent: reward.points_required,
    is_used: 0,
    expires_at: expiresAt,
    created_at: now.toISOString(),
  })

  return {
    success: true,
    redemptionCode,
    discountValue: reward.discount_value,
    minOrderValue: reward.min_order_value,
    newBalance,
    expiresAt,
  }
}

/**
 * Manual point adjustment by Admin with mandatory reason.
 */
export async function manualPointAdjustment(customerId, amount, direction, reason, adminId = 'ADMIN') {
  if (!reason || reason.trim().length < 3) {
    throw new Error('A valid reason is required for manual point adjustments')
  }
  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than zero')
  }

  let member = await getMemberByCustomerId(customerId)
  if (!member) {
    member = await createRoyaltyMember(customerId)
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

  await RoyaltyTransaction.create({
    id: txId,
    member_id: member.id,
    customer_id: customerId,
    type: 'MANUAL_ADJUSTMENT',
    amount: numericAmount,
    direction: direction,
    reason: `Manual Adjustment: ${reason}`,
    balance_after: newBalance,
    created_by: adminId,
    created_at: now,
  })

  await RoyaltyMember.updateOne(
    { id: member.id },
    { current_points: newBalance, lifetime_points: newLifetime }
  )

  return { success: true, newBalance }
}

/**
 * Fetch customer ledger history.
 */
export async function getCustomerTransactions(customerId) {
  return await RoyaltyTransaction.find({ customer_id: customerId })
    .sort({ created_at: -1 })
    .lean()
}
