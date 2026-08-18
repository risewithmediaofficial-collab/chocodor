import express from 'express'
import crypto from 'node:crypto'
import { Category, Product, ProductReview, Order, OrderItem, Customer } from '../models/index.js'

const router = express.Router()

// Get all active categories and products
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ is_active: 1 }).sort({ sort_order: 1 }).lean()
    const products = await Product.find().sort({ created_at: 1 }).lean()

    const catMap = {}
    for (const c of categories) {
      catMap[c.id] = { name: c.name, slug: c.slug }
    }

    // Aggregate reviews for all products
    const reviewStats = await ProductReview.aggregate([
      { $match: { status: 'APPROVED' } },
      {
        $group: {
          _id: '$product_id',
          review_count: { $sum: 1 },
          avg_rating: { $avg: '$rating' },
        },
      },
    ])
    const statsMap = {}
    reviewStats.forEach((r) => {
      statsMap[r._id] = {
        count: r.review_count,
        rating: Number(r.avg_rating.toFixed(1)),
      }
    })

    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        color: c.color,
        sortOrder: c.sort_order,
      })),
      products: products.map((p) => {
        const cInfo = catMap[p.category_id] || { name: 'Desserts', slug: 'desserts' }
        const stats = statsMap[p.id] || { count: 0, rating: 5.0 }

        return {
          id: p.id,
          categoryId: p.category_id,
          categorySlug: cInfo.slug,
          category: cInfo.name,
          name: p.name,
          price: p.price,
          takeawayExtraCost: p.takeaway_extra_cost || 0,
          royaltyPoints: p.royalty_points,
          description: p.description,
          badge: p.badge,
          image: p.image,
          ingredients: p.ingredients || 'Belgian Cocoa, Fresh Cream, Pure Butter, Cane Sugar, Roasted Nuts',
          dietaryInfo: p.dietary_info || '100% Vegetarian, Eggless',
          servingSuggestion: p.serving_suggestion || 'Best served warm. Enjoy within 24 hours of fresh boutique baking.',
          preparationTime: p.preparation_time || '15–20 mins',
          portionSize: p.portion_size || 'Serves 1–2',
          extraImages: p.extra_images || [],
          isAvailable: p.is_available === 1,
          isFeatured: p.is_featured === 1,
          isBestseller: p.is_bestseller === 1,
          rating: stats.rating,
          reviewCount: stats.count,
        }
      }),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Check if a customer is eligible to review a product (Strictly only after ordering)
router.get('/:id/review-eligibility', async (req, res) => {
  try {
    const productId = req.params.id
    const customerId = req.query.customerId || null
    const customerMobile = req.query.customerMobile || null

    if (!customerId && !customerMobile) {
      return res.json({
        canReview: false,
        reason: 'LOGIN_REQUIRED',
        message: 'Please sign in to your account to review desserts you have ordered.',
      })
    }

    // Find non-cancelled orders for this customer
    const query = { status: { $ne: 'CANCELLED' } }
    if (customerId && customerMobile) {
      query.$or = [{ customer_id: customerId }, { customer_mobile: customerMobile }]
    } else if (customerId) {
      query.customer_id = customerId
    } else {
      query.customer_mobile = customerMobile
    }

    const orders = await Order.find(query).select('id order_number status created_at').lean()
    if (!orders || orders.length === 0) {
      return res.json({
        canReview: false,
        reason: 'NO_ORDERS',
        message: 'Only customers who have ordered this confectionery can write a review. Please order this item first!',
      })
    }

    const orderIds = orders.map((o) => o.id)
    const purchasedItem = await OrderItem.findOne({
      order_id: { $in: orderIds },
      product_id: productId,
    }).lean()

    if (!purchasedItem) {
      return res.json({
        canReview: false,
        reason: 'NOT_PURCHASED',
        message: 'You have not ordered this dessert yet. Only customers who have ordered this item can leave a review.',
      })
    }

    // Check if review already exists
    const existingReview = await ProductReview.findOne({
      product_id: productId,
      $or: [
        { customer_id: customerId },
        { customer_name: { $regex: new RegExp(`^${customerMobile}$`, 'i') } },
      ],
    }).lean()

    res.json({
      canReview: true,
      hasPurchased: true,
      alreadyReviewed: Boolean(existingReview),
      existingReview: existingReview || null,
      eligibleOrderId: purchasedItem.order_id,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get reviews for a customer
router.get('/customer/:customerId/reviews', async (req, res) => {
  try {
    const reviews = await ProductReview.find({ customer_id: req.params.customerId })
      .sort({ created_at: -1 })
      .lean()
    res.json({ reviews })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get single product with its reviews
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id }).lean()
    if (!product) return res.status(404).json({ error: 'Product not found' })

    const category = await Category.findOne({ id: product.category_id }).lean()
    const reviews = await ProductReview.find({ product_id: req.params.id, status: 'APPROVED' })
      .sort({ created_at: -1 })
      .lean()

    const avgRating =
      reviews.length > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
        : 5.0

    res.json({
      id: product.id,
      categoryId: product.category_id,
      categorySlug: category?.slug || 'desserts',
      category: category?.name || 'Dessert',
      name: product.name,
      price: product.price,
      takeawayExtraCost: product.takeaway_extra_cost || 0,
      royaltyPoints: product.royalty_points,
      description: product.description,
      badge: product.badge,
      image: product.image,
      ingredients: product.ingredients || 'Belgian Cocoa, Fresh Cream, Pure Butter, Cane Sugar, Roasted Nuts',
      dietaryInfo: product.dietary_info || '100% Vegetarian, Eggless',
      servingSuggestion: product.serving_suggestion || 'Best served warm. Enjoy within 24 hours of fresh boutique baking.',
      preparationTime: product.preparation_time || '15–20 mins',
      portionSize: product.portion_size || 'Serves 1–2',
      extraImages: product.extra_images || [],
      isAvailable: product.is_available === 1,
      isFeatured: product.is_featured === 1,
      isBestseller: product.is_bestseller === 1,
      rating: avgRating,
      reviewCount: reviews.length,
      reviews,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add a product review & rating (STRICTLY ONLY AFTER ORDERING)
router.post('/:id/reviews', async (req, res) => {
  try {
    const productId = req.params.id
    const { rating, reviewText, customerName, customerId, customerMobile, orderId } = req.body

    const numRating = parseInt(rating, 10)
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Please select a rating between 1 and 5 stars.' })
    }

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' })
    }

    if (!customerId && !customerMobile && !orderId) {
      return res.status(403).json({
        error: 'Only customers who have placed an order for this confectionery can write a review. Please sign in to submit your review.',
      })
    }

    // Strict Verification: Confirm customer ordered this product
    let verifiedOrder = null

    if (orderId) {
      const order = await Order.findOne({ id: orderId, status: { $ne: 'CANCELLED' } }).lean()
      if (order) {
        const itemExists = await OrderItem.exists({ order_id: orderId, product_id: productId })
        if (itemExists) verifiedOrder = order
      }
    }

    if (!verifiedOrder) {
      const query = { status: { $ne: 'CANCELLED' } }
      if (customerId && customerMobile) {
        query.$or = [{ customer_id: customerId }, { customer_mobile: customerMobile }]
      } else if (customerId) {
        query.customer_id = customerId
      } else if (customerMobile) {
        query.customer_mobile = customerMobile
      }

      const orders = await Order.find(query).select('id').lean()
      if (orders && orders.length > 0) {
        const orderIds = orders.map((o) => o.id)
        const purchasedItem = await OrderItem.findOne({
          order_id: { $in: orderIds },
          product_id: productId,
        }).lean()

        if (purchasedItem) {
          verifiedOrder = orders.find((o) => o.id === purchasedItem.order_id)
        }
      }
    }

    if (!verifiedOrder) {
      return res.status(403).json({
        error: 'Verified Order Required: You can only review confectioneries that you have ordered and tasted. Please place an order for this dessert first!',
      })
    }

    const reviewId = `rev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
    const now = new Date().toISOString()

    const review = await ProductReview.create({
      id: reviewId,
      product_id: productId,
      order_id: verifiedOrder.id,
      customer_id: customerId || 'verified_buyer',
      customer_name: customerName.trim(),
      rating: numRating,
      review_text: (reviewText || '').trim(),
      status: 'APPROVED',
      created_at: now,
    })

    res.json({
      success: true,
      message: 'Thank you for reviewing! Your verified feedback has been recorded.',
      review: {
        id: reviewId,
        product_id: productId,
        rating: numRating,
        review_text: reviewText,
        customer_name: customerName.trim(),
        created_at: now,
        is_verified: true,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
