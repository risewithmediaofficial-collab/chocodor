import express from 'express'
import { Order, OrderItem, PromotionLog } from '../models/index.js'

const router = express.Router()

router.get('/sales', async (req, res) => {
  try {
    const { range, fromDate, toDate } = req.query
    const matchFilter = { status: { $ne: 'CANCELLED' } }

    if (fromDate || toDate) {
      matchFilter.created_at = {}
      if (fromDate) matchFilter.created_at.$gte = `${fromDate}T00:00:00.000Z`
      if (toDate) matchFilter.created_at.$lte = `${toDate}T23:59:59.999Z`
    } else if (range === 'today') {
      const today = new Date().toISOString().split('T')[0]
      matchFilter.created_at = { $regex: `^${today}` }
    } else if (range === '7d') {
      const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      matchFilter.created_at = { $gte: d }
    } else if (range === '30d') {
      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      matchFilter.created_at = { $gte: d }
    }

    // 1. Total Metrics
    const totalsAgg = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          total_orders: { $sum: 1 },
          total_revenue: { $sum: '$total_amount' },
          total_subtotal: { $sum: '$subtotal' },
          total_first_order_discounts: { $sum: '$first_order_discount' },
          total_reward_discounts: { $sum: '$reward_discount' },
          total_delivery_charges: { $sum: '$delivery_fee' },
          total_royalty_points_issued: { $sum: '$total_royalty_points' },
        },
      },
    ])
    const totals = totalsAgg.length > 0
      ? totalsAgg[0]
      : {
          total_orders: 0,
          total_revenue: 0,
          total_subtotal: 0,
          total_first_order_discounts: 0,
          total_reward_discounts: 0,
          total_delivery_charges: 0,
          total_royalty_points_issued: 0,
        }

    // 2. Online vs Offline Breakdown
    const sourceBreakdown = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$order_source',
          order_source: { $first: '$order_source' },
          count: { $sum: 1 },
          revenue: { $sum: '$total_amount' },
        },
      },
    ])

    // 3. Payment Method Breakdown
    const paymentBreakdown = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$payment_method',
          payment_method: { $first: '$payment_method' },
          count: { $sum: 1 },
          total_amount: { $sum: '$total_amount' },
        },
      },
    ])

    // 4. Product Sales Performance
    const matchingOrders = await Order.find(matchFilter, { id: 1 }).lean()
    const matchingOrderIds = matchingOrders.map((o) => o.id)

    const productSales = await OrderItem.aggregate([
      { $match: { order_id: { $in: matchingOrderIds } } },
      {
        $group: {
          _id: '$product_name_snapshot',
          name: { $first: '$product_name_snapshot' },
          quantity_sold: { $sum: '$quantity' },
          total_revenue: { $sum: '$subtotal' },
          total_points_issued: { $sum: '$total_points' },
        },
      },
      { $sort: { quantity_sold: -1 } },
      { $limit: 15 },
    ])

    // 5. Delivery Performance (Paid vs Free)
    const deliveryStatsAgg = await Order.aggregate([
      { $match: { ...matchFilter, order_type: 'DELIVERY' } },
      {
        $group: {
          _id: null,
          free_deliveries: {
            $sum: { $cond: [{ $eq: ['$delivery_fee', 0] }, 1, 0] },
          },
          paid_deliveries: {
            $sum: { $cond: [{ $gt: ['$delivery_fee', 0] }, 1, 0] },
          },
          delivery_revenue: { $sum: '$delivery_fee' },
        },
      },
    ])
    const deliveryStats = deliveryStatsAgg.length > 0
      ? deliveryStatsAgg[0]
      : { free_deliveries: 0, paid_deliveries: 0, delivery_revenue: 0 }

    // 6. First-Order Offer Stats
    const promoFilter = {}
    if (matchFilter.created_at) promoFilter.created_at = matchFilter.created_at
    const firstOrderStatsAgg = await PromotionLog.aggregate([
      { $match: promoFilter },
      {
        $group: {
          _id: null,
          offers_used: { $sum: 1 },
          total_discount_given: { $sum: '$discount_amount' },
        },
      },
    ])
    const firstOrderStats = firstOrderStatsAgg.length > 0
      ? firstOrderStatsAgg[0]
      : { offers_used: 0, total_discount_given: 0 }

    res.json({
      totals,
      sourceBreakdown,
      paymentBreakdown,
      productSales,
      deliveryStats,
      firstOrderStats,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
