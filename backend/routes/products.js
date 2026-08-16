import express from 'express'
import crypto from 'node:crypto'
import { Category, Product, ProductReview } from '../models/index.js'

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
        const cInfo = catMap[p.category_id] || { name: 'Desserts', slug: 'desserts' }
        return {
          id: p.id,
          categoryId: p.category_id,
          categorySlug: cInfo.slug,
          category: cInfo.name,
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

// Add a product review & rating
router.post('/:id/reviews', async (req, res) => {
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

    const review = await ProductReview.create({
      id: reviewId,
      product_id: productId,
      order_id: orderId || null,
      customer_id: customerId || 'guest',
      customer_name: customerName.trim(),
      rating: numRating,
      review_text: (reviewText || '').trim(),
      status: 'APPROVED',
      created_at: now,
    })

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
