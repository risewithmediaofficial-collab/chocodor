import express from 'express'
import { db } from '../db.js'

const router = express.Router()

/**
 * Get all store settings (Delivery rules, Promotions, Business details)
 */
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value, updated_at FROM store_settings').all()
    const settings = {}
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value)
      } catch {
        settings[row.key] = row.value
      }
    }
    res.json({ settings })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Update a specific setting key (e.g. delivery, promotions, business)
 */
router.patch('/:key', (req, res) => {
  try {
    const { key } = req.params
    const value = req.body

    const existing = db.prepare('SELECT key FROM store_settings WHERE key = ?').get(key)
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value)
    const now = new Date().toISOString()

    if (existing) {
      db.prepare('UPDATE store_settings SET value = ?, updated_at = ? WHERE key = ?').run(valueStr, now, key)
    } else {
      db.prepare('INSERT INTO store_settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, valueStr, now)
    }

    res.json({ success: true, key, value })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
