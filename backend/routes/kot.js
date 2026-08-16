import express from 'express'
import { KOT } from '../models/index.js'
import { updateOrderStatus } from '../services/orderService.js'

const router = express.Router()

/**
 * Get all KOTs for the Kitchen Display Station
 */
router.get('/', async (req, res) => {
  try {
    const { status, since } = req.query
    const filter = {}

    if (status) {
      filter.status = status
    }

    if (since) {
      filter.updated_at = { $gt: since }
    }

    const kots = await KOT.find(filter).sort({ created_at: 1 }).lean()

    res.json({ kots })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Update KOT status and synchronize the related Order
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['NEW', 'PREPARING', 'READY', 'COMPLETED']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid KOT status: ${status}` })
    }

    const kot = await KOT.findOne({ id }).lean()
    if (!kot) return res.status(404).json({ error: 'KOT ticket not found' })

    const now = new Date().toISOString()
    await KOT.updateOne({ id }, { status, updated_at: now })

    // Synchronize corresponding order
    let targetOrderStatus = null
    if (status === 'PREPARING') targetOrderStatus = 'PREPARING'
    else if (status === 'READY') targetOrderStatus = 'READY'
    else if (status === 'COMPLETED') targetOrderStatus = 'COMPLETED'

    if (targetOrderStatus) {
      try {
        await updateOrderStatus(kot.order_id, targetOrderStatus, 'KITCHEN_STAFF', `KOT #${kot.kot_number} updated to ${status}`)
      } catch (err) {
        console.warn('Order status sync notice:', err.message)
      }
    }

    const updated = await KOT.findOne({ id }).lean()
    res.json({
      success: true,
      kot: updated,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
