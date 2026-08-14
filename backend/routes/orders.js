import express from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../db.js'
import {
  createOrder,
  getOrderById,
  getOrderByNumber,
  calculateOrderQuote,
  updateRazorpayPaymentSuccess,
  markPaymentFailed,
} from '../services/orderService.js'
import { createRazorpayOrder, verifyPaymentSignature } from '../services/razorpayService.js'
import { JWT_SECRET } from './auth.js'

const router = express.Router()

function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    try {
      const token = header.split(' ')[1]
      req.user = jwt.verify(token, JWT_SECRET)
    } catch {
      // ignore
    }
  }
  next()
}

// Live Server Quote for Cart (Validates server prices, point sum, delivery fee, reward discount, first-order offer)
router.post('/quote', optionalAuth, (req, res) => {
  try {
    const { items = [], appliedRewardCode, orderType = 'DELIVERY', applyFirstOrderOffer = false } = req.body
    const customerId = req.user ? req.user.id : (req.body.customerId || null)
    const customerMobile = req.body.customerMobile || (req.user ? req.user.mobile : null)

    const quote = calculateOrderQuote({
      items,
      orderType,
      customerId,
      customerMobile,
      appliedRewardCode,
      applyFirstOrderOffer,
    })

    res.json(quote)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Create Order (Online or Offline)
router.post('/', optionalAuth, (req, res) => {
  try {
    const customerId = req.user ? req.user.id : (req.body.customerId || null)
    const orderData = {
      ...req.body,
      customerId,
    }

    const order = createOrder(orderData)
    res.status(201).json({ success: true, order })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Create Razorpay Order
router.post('/razorpay-order', optionalAuth, async (req, res) => {
  try {
    const { orderId } = req.body
    const order = getOrderById(orderId)
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const rzpOrder = await createRazorpayOrder({
      amount: order.total_amount,
      receipt: order.order_number,
    })

    res.json({
      success: true,
      razorpayOrder: rzpOrder,
      order,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Verify Razorpay Payment Signature
router.post('/verify-payment', optionalAuth, (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body

    const isValid = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    })

    if (!isValid) {
      markPaymentFailed(orderId, 'Cryptographic signature mismatch')
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed. Invalid transaction signature.',
      })
    }

    const updatedOrder = updateRazorpayPaymentSuccess(
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    )

    res.json({
      success: true,
      order: updatedOrder,
      message: 'Payment verified successfully. Order confirmed.',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Mark Payment as Failed
router.post('/payment-failed', optionalAuth, (req, res) => {
  try {
    const { orderId, reason } = req.body
    const order = markPaymentFailed(orderId, reason || 'Payment cancelled or declined')
    res.json({ success: true, order })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get Customer Orders
router.get('/my-orders', optionalAuth, (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Please log in to view your orders' })
    }

    const orders = db.prepare(`
      SELECT * FROM orders 
      WHERE customer_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id)

    const fullOrders = orders.map((o) => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id)
      const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(o.id)
      return {
        ...o,
        delivery_address: o.delivery_address ? JSON.parse(o.delivery_address) : null,
        items,
        invoice,
      }
    })

    res.json({ orders: fullOrders })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get Printable Invoice Details
router.get('/invoice/:identifier', (req, res) => {
  try {
    const { identifier } = req.params
    // Find invoice by invoice_number or order_number or order_id
    const invoice = db.prepare(`
      SELECT i.*, o.order_type, o.created_at as order_time, o.notes, o.order_source
      FROM invoices i
      JOIN orders o ON i.order_id = o.id
      WHERE i.invoice_number = ? OR i.order_number = ? OR i.order_id = ?
    `).get(identifier, identifier, identifier)

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(invoice.order_id)
    const businessSettings = db.prepare("SELECT value FROM store_settings WHERE key = 'business'").get()
    const business = businessSettings ? JSON.parse(businessSettings.value) : {}

    res.json({
      invoice: {
        ...invoice,
        customer_address: invoice.customer_address ? JSON.parse(invoice.customer_address) : null,
        items,
      },
      business,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Track order by order number or ID
router.get('/track/:orderNumber', (req, res) => {
  try {
    let order = getOrderByNumber(req.params.orderNumber)
    if (!order) {
      order = getOrderById(req.params.orderNumber)
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found. Please check your order reference number.' })
    }
    res.json({ order })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
