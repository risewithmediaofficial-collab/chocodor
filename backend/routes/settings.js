import express from 'express'
import { StoreSetting } from '../models/index.js'

const router = express.Router()

/**
 * Get all store settings (Delivery rules, Promotions, Business details)
 */
router.get('/', async (req, res) => {
  try {
    const rows = await StoreSetting.find().lean()
    const settings = {}
    for (const row of rows) {
      settings[row.key] = row.value
    }
    res.json({ settings })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Update a specific setting key (e.g. delivery, promotions, business)
 */
router.patch('/:key', async (req, res) => {
  try {
    const { key } = req.params
    const value = req.body
    const now = new Date().toISOString()

    await StoreSetting.findOneAndUpdate(
      { key },
      { key, value, updated_at: now },
      { upsert: true, returnDocument: 'after' }
    )

    res.json({ success: true, key, value })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
