import express from 'express'
import { db } from '../db.js'
import { updateOrderStatus } from '../services/orderService.js'

const router = express.Router()

/**
 * Get all KOTs for the Kitchen Display Station
 * Supports `status` filter and `since` polling timestamp.
 */
router.get('/', (req, res) => {
  try {
    const { status, since } = req.query

    let query = 'SELECT * FROM kots WHERE 1=1'
    const params = []

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    if (since) {
      query += ' AND updated_at > ?'
      params.push(since)
    }

    query += ' ORDER BY created_at ASC'

    const rows = db.prepare(query).all(...params)

    const kots = rows.map((kot) => ({
      ...kot,
      items: JSON.parse(kot.items),
    }))

    res.json({ kots })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Update KOT status and synchronize the related Order
 */
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['NEW', 'PREPARING', 'READY', 'COMPLETED']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid KOT status: ${status}` })
    }

    const kot = db.prepare('SELECT * FROM kots WHERE id = ?').get(id)
    if (!kot) return res.status(404).json({ error: 'KOT ticket not found' })

    const now = new Date().toISOString()
    db.prepare('UPDATE kots SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id)

    // Synchronize corresponding order
    let targetOrderStatus = null
    if (status === 'PREPARING') targetOrderStatus = 'PREPARING'
    else if (status === 'READY') targetOrderStatus = 'READY'
    else if (status === 'COMPLETED') targetOrderStatus = 'COMPLETED'

    if (targetOrderStatus) {
      try {
        updateOrderStatus(kot.order_id, targetOrderStatus, 'KITCHEN_STAFF', `KOT #${kot.kot_number} updated to ${status}`)
      } catch (err) {
        console.warn('Order status sync notice:', err.message)
      }
    }

    const updated = db.prepare('SELECT * FROM kots WHERE id = ?').get(id)
    res.json({
      success: true,
      kot: {
        ...updated,
        items: JSON.parse(updated.items),
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
