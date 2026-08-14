import express from 'express'
import { db } from '../db.js'

const router = express.Router()

router.get('/sales', (req, res) => {
  try {
    const { range, fromDate, toDate } = req.query

    let dateLimit = ''
    const params = []

    if (fromDate) {
      dateLimit += ' AND o.created_at >= ?'
      params.push(`${fromDate}T00:00:00.000Z`)
    }
    if (toDate) {
      dateLimit += ' AND o.created_at <= ?'
      params.push(`${toDate}T23:59:59.999Z`)
    }

    if (!fromDate && !toDate) {
      if (range === 'today') {
        dateLimit = "AND o.created_at >= date('now', 'start of day')"
      } else if (range === '7d') {
        dateLimit = "AND o.created_at >= datetime('now', '-7 days')"
      } else if (range === '30d') {
        dateLimit = "AND o.created_at >= datetime('now', '-30 days')"
      }
    }

    // 1. Total Metrics
    const totals = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        IFNULL(SUM(total_amount), 0) as total_revenue,
        IFNULL(SUM(subtotal), 0) as total_subtotal,
        IFNULL(SUM(first_order_discount), 0) as total_first_order_discounts,
        IFNULL(SUM(reward_discount), 0) as total_reward_discounts,
        IFNULL(SUM(delivery_fee), 0) as total_delivery_charges,
        IFNULL(SUM(total_royalty_points), 0) as total_royalty_points_issued
      FROM orders o
      WHERE o.status != 'CANCELLED' ${dateLimit}
    `).get(...params)

    // 2. Online vs Offline Breakdown
    const sourceBreakdown = db.prepare(`
      SELECT
        order_source,
        COUNT(*) as count,
        IFNULL(SUM(total_amount), 0) as revenue
      FROM orders o
      WHERE o.status != 'CANCELLED' ${dateLimit}
      GROUP BY order_source
    `).all(...params)

    // 3. Payment Method Breakdown
    const paymentBreakdown = db.prepare(`
      SELECT
        payment_method,
        COUNT(*) as count,
        IFNULL(SUM(total_amount), 0) as total_amount
      FROM orders o
      WHERE o.status != 'CANCELLED' ${dateLimit}
      GROUP BY payment_method
    `).all(...params)

    // 4. Product Sales Performance
    const productSales = db.prepare(`
      SELECT
        oi.product_name_snapshot as name,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.subtotal) as total_revenue,
        SUM(oi.total_points) as total_points_issued
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'CANCELLED' ${dateLimit}
      GROUP BY oi.product_name_snapshot
      ORDER BY quantity_sold DESC
      LIMIT 15
    `).all(...params)

    // 5. Delivery Performance (Paid vs Free)
    const deliveryStats = db.prepare(`
      SELECT
        COUNT(CASE WHEN order_type = 'DELIVERY' AND delivery_fee = 0 THEN 1 END) as free_deliveries,
        COUNT(CASE WHEN order_type = 'DELIVERY' AND delivery_fee > 0 THEN 1 END) as paid_deliveries,
        IFNULL(SUM(CASE WHEN order_type = 'DELIVERY' THEN delivery_fee ELSE 0 END), 0) as delivery_revenue
      FROM orders o
      WHERE o.status != 'CANCELLED' ${dateLimit}
    `).get()

    // 6. First-Order Offer Stats
    const firstOrderStats = db.prepare(`
      SELECT
        COUNT(*) as offers_used,
        IFNULL(SUM(discount_amount), 0) as total_discount_given
      FROM promotions_log p
      WHERE 1=1 ${dateLimit.replace(/o\./g, 'p.')}
    `).get()

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
