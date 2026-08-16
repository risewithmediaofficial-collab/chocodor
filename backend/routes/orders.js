import express from 'express'
import jwt from 'jsonwebtoken'
import { Order, OrderItem, Invoice, StoreSetting } from '../models/index.js'
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

// Live Server Quote for Cart
router.post('/quote', optionalAuth, async (req, res) => {
  try {
    const { items = [], appliedRewardCode, orderType = 'DELIVERY', applyFirstOrderOffer = false } = req.body
    const customerId = req.user ? req.user.id : (req.body.customerId || null)
    const customerMobile = req.body.customerMobile || (req.user ? req.user.mobile : null)

    const quote = await calculateOrderQuote({
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
router.post('/', optionalAuth, async (req, res) => {
  try {
    const customerId = req.user ? req.user.id : (req.body.customerId || null)
    const orderData = {
      ...req.body,
      customerId,
    }

    const order = await createOrder(orderData)
    res.status(201).json({ success: true, order })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Create Razorpay Order
router.post('/razorpay-order', optionalAuth, async (req, res) => {
  try {
    const { orderId } = req.body
    const order = await getOrderById(orderId)
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
router.post('/verify-payment', optionalAuth, async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body

    const isValid = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    })

    if (!isValid) {
      await markPaymentFailed(orderId, 'Cryptographic signature mismatch')
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed. Invalid transaction signature.',
      })
    }

    const updatedOrder = await updateRazorpayPaymentSuccess(
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
router.post('/payment-failed', optionalAuth, async (req, res) => {
  try {
    const { orderId, reason } = req.body
    const order = await markPaymentFailed(orderId, reason || 'Payment cancelled or declined')
    res.json({ success: true, order })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get Customer Orders
router.get('/my-orders', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Please log in to view your orders' })
    }

    const orders = await Order.find({ customer_id: req.user.id })
      .sort({ created_at: -1 })
      .lean()

    const orderIds = orders.map((o) => o.id)
    const items = await OrderItem.find({ order_id: { $in: orderIds } }).lean()
    const invoices = await Invoice.find({ order_id: { $in: orderIds } }).lean()

    const itemsMap = {}
    for (const item of items) {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = []
      itemsMap[item.order_id].push(item)
    }

    const invMap = {}
    for (const inv of invoices) {
      invMap[inv.order_id] = inv
    }

    const fullOrders = orders.map((o) => ({
      ...o,
      items: itemsMap[o.id] || [],
      invoice: invMap[o.id] || null,
    }))

    res.json({ orders: fullOrders })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get Printable Invoice Details
router.get('/invoice/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params
    const invoice = await Invoice.findOne({
      $or: [{ invoice_number: identifier }, { order_number: identifier }, { order_id: identifier }],
    }).lean()

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

    const order = await Order.findOne({ id: invoice.order_id }).lean()
    const items = await OrderItem.find({ order_id: invoice.order_id }).lean()
    const businessSetting = await StoreSetting.findOne({ key: 'business' }).lean()
    const business = businessSetting?.value || {}

    res.json({
      invoice: {
        ...invoice,
        order_type: order?.order_type || 'DELIVERY',
        order_time: order?.created_at || invoice.created_at,
        notes: order?.notes || '',
        order_source: order?.order_source || 'ONLINE',
        customer_address: invoice.customer_address,
        items,
      },
      business,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Track order by order number or ID
router.get('/track/:orderNumber', async (req, res) => {
  try {
    let order = await getOrderByNumber(req.params.orderNumber)
    if (!order) {
      order = await getOrderById(req.params.orderNumber)
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
