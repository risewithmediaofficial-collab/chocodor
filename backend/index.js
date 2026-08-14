// Suppress experimental SQLite warning
const originalEmitWarning = process.emitWarning
process.emitWarning = (warning, ...args) => {
  if (typeof warning === 'string' && warning.includes('SQLite is an experimental feature')) return
  if (typeof warning === 'object' && warning?.message?.includes('SQLite')) return
  return originalEmitWarning.call(process, warning, ...args)
}

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDB } from './db.js'
import { connectMongoDB } from './mongodb.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import royaltyRoutes from './routes/royalty.js'
import adminRoutes from './routes/admin.js'
import posRoutes from './routes/pos.js'
import kotRoutes from './routes/kot.js'
import settingsRoutes from './routes/settings.js'
import reportsRoutes from './routes/reports.js'

// Initialize Databases
initDB()
connectMongoDB()

const app = express()
const PORT = process.env.PORT || 5000

// Middlewares
app.use(cors())
app.use(express.json())

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/royalty', royaltyRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/pos', posRoutes)
app.use('/api/kot', kotRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/reports', reportsRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', brand: 'Choco D\'or Krishnagiri', time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🍫 Choco D'or Backend running on http://localhost:${PORT}`)
})
