import express from 'express'
import crypto from 'crypto'
import { db } from '../db.js'

const router = express.Router()

// Get all active categories and products
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT * FROM categories 
      WHERE is_active = 1 
      ORDER BY sort_order ASC
    `).all()

    const products = db.prepare(`
      SELECT p.*, c.slug as category_slug, c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at ASC
    `).all()

    // Aggregate reviews for all products
    const reviewStats = db.prepare(`
      SELECT product_id, COUNT(*) as review_count, AVG(rating) as avg_rating
      FROM product_reviews
      WHERE status = 'APPROVED'
      GROUP BY product_id
    `).all()
    const statsMap = {}
    reviewStats.forEach((r) => {
      statsMap[r.product_id] = {
        count: r.review_count,
        rating: Number(Number(r.avg_rating).toFixed(1)),
      }
    })

    res.json({
      categories: categories.map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        color: cat.color,
        count: products.filter((p) => p.category_id === cat.id && p.is_available === 1).length,
      })),
      products: products.map((p) => {
        const stats = statsMap[p.id] || { count: 0, rating: 5.0 }
        return {
          id: p.id,
          categoryId: p.category_id,
          categorySlug: p.category_slug,
          category: p.category_name,
          name: p.name,
          price: p.price,
          royaltyPoints: p.royalty_points,
          description: p.description,
          badge: p.badge,
          image: p.image,
          ingredients: p.ingredients || 'Belgian Cocoa, Fresh Cream, Pure Butter, Cane Sugar, Roasted Nuts',
          dietaryInfo: p.dietary_info || '100% Vegetarian, Eggless',
          servingSuggestion: p.serving_suggestion || 'Best served warm. Enjoy within 24 hours of fresh boutique baking.',
          preparationTime: p.preparation_time || '15–20 mins',
          portionSize: p.portion_size || 'Serves 1–2',
          extraImages: p.extra_images ? JSON.parse(p.extra_images || '[]') : [],
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

// Get reviews for a customer
router.get('/customer/:customerId/reviews', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT * FROM product_reviews
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `).all(req.params.customerId)
    res.json({ reviews })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get single product with its reviews
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(req.params.id)

    if (!product) return res.status(404).json({ error: 'Product not found' })

    const reviews = db.prepare(`
      SELECT * FROM product_reviews
      WHERE product_id = ? AND status = 'APPROVED'
      ORDER BY created_at DESC
    `).all(req.params.id)

    const avgRating = reviews.length > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : 5.0

    res.json({
      id: product.id,
      categoryId: product.category_id,
      categorySlug: product.category_slug,
      category: product.category_name,
      name: product.name,
      price: product.price,
      royaltyPoints: product.royalty_points,
      description: product.description,
      badge: product.badge,
      image: product.image,
      ingredients: product.ingredients || 'Belgian Cocoa, Fresh Cream, Pure Butter, Cane Sugar, Roasted Nuts',
      dietaryInfo: product.dietary_info || '100% Vegetarian, Eggless',
      servingSuggestion: product.serving_suggestion || 'Best served warm. Enjoy within 24 hours of fresh boutique baking.',
      preparationTime: product.preparation_time || '15–20 mins',
      portionSize: product.portion_size || 'Serves 1–2',
      extraImages: product.extra_images ? JSON.parse(product.extra_images || '[]') : [],
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

// Add a product review & rating (after ordering)
router.post('/:id/reviews', (req, res) => {
  try {
    const productId = req.params.id
    const { rating, reviewText, customerName, customerId, orderId } = req.body

    const numRating = parseInt(rating, 10)
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Please select a rating between 1 and 5 stars.' })
    }

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' })
    }

    const reviewId = `rev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO product_reviews (
        id, product_id, order_id, customer_id, customer_name, rating, review_text, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?)
    `).run(
      reviewId,
      productId,
      orderId || null,
      customerId || 'guest',
      customerName.trim(),
      numRating,
      (reviewText || '').trim(),
      now
    )

    res.json({
      success: true,
      message: 'Thank you for reviewing! Your feedback has been recorded.',
      review: {
        id: reviewId,
        product_id: productId,
        rating: numRating,
        review_text: reviewText,
        customer_name: customerName.trim(),
        created_at: now,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
