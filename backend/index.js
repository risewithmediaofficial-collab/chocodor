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

// API Routes (mounted on both /api/* and /* for universal reverse-proxy support)
app.use('/api/auth', authRoutes)
app.use('/auth', authRoutes)

app.use('/api/admin', adminRoutes)

app.use('/api/products', productRoutes)
app.use('/products', productRoutes)

app.use('/api/orders', orderRoutes)
app.use('/orders', orderRoutes)

app.use('/api/royalty', royaltyRoutes)
app.use('/royalty', royaltyRoutes)

app.use('/api/pos', posRoutes)
app.use('/pos', posRoutes)

app.use('/api/kot', kotRoutes)
app.use('/kot', kotRoutes)

app.use('/api/settings', settingsRoutes)
app.use('/settings', settingsRoutes)

app.use('/api/reports', reportsRoutes)
app.use('/reports', reportsRoutes)

// Root API Welcome & Status Dashboard
app.get('/', (req, res) => {
  const host = req.hostname || 'localhost'
  const clientUrl = process.env.CLIENT_URL || `http://${host}:8084`

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Choco D'or Backend API</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        body { background: #1C120C; color: #FAF6F0; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
        .card { background: #2A1C14; border: 1px solid rgba(229, 169, 59, 0.3); border-radius: 16px; padding: 36px; max-width: 580px; width: 100%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .badge { display: inline-block; background: rgba(229, 169, 59, 0.15); color: #E5A93B; border: 1px solid #E5A93B; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; padding: 6px 14px; border-radius: 999px; text-transform: uppercase; margin-bottom: 16px; }
        h1 { font-size: 26px; color: #FAF6F0; margin-bottom: 10px; }
        p { color: rgba(250, 246, 240, 0.7); font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
        .btn-group { display: flex; flex-direction: column; gap: 12px; }
        .btn { display: inline-block; padding: 14px 20px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 14px; transition: 0.2s; }
        .btn--gold { background: linear-gradient(135deg, #E5A93B, #C88D25); color: #1C120C; }
        .btn--dark { background: rgba(250, 246, 240, 0.08); color: #FAF6F0; border: 1px solid rgba(250, 246, 240, 0.15); }
        .status-dot { display: inline-block; width: 8px; height: 8px; background: #22C55E; border-radius: 50%; margin-right: 6px; box-shadow: 0 0 10px #22C55E; }
        .endpoints { margin-top: 24px; text-align: left; background: rgba(0,0,0,0.3); padding: 14px; border-radius: 8px; font-size: 12px; color: rgba(250,246,240,0.6); }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge"><span class="status-dot"></span> Backend API Live (Node 22)</span>
        <h1>🍫 Choco D'or REST API</h1>
        <p>You are viewing the backend API service (Port ${PORT}). The customer storefront and admin dashboard are served by the frontend container.</p>
        <div class="btn-group">
          <a href="${clientUrl}/admin" class="btn btn--gold">🚀 Open Admin & POS Portal (Port 8084) →</a>
          <a href="${clientUrl}" class="btn btn--dark">🛍️ Open Customer Boutique Storefront →</a>
        </div>
        <div class="endpoints">
          <strong>API Endpoints:</strong><br>
          • <code>GET /api/health</code> — Health check<br>
          • <code>GET /api/products</code> — 43 Confectionery catalogue items<br>
          • <code>POST /api/auth/login</code> — Customer authentication<br>
          • <code>POST /api/admin/login</code> — Staff/Admin POS authentication
        </div>
      </div>
    </body>
    </html>
  `)
})

// Auto-redirect /admin requests on backend port to the frontend admin portal
app.get(/^\/admin(?:\/.*)?$/, (req, res) => {
  const host = req.hostname || 'localhost'
  const clientUrl = process.env.CLIENT_URL || `http://${host}:8084`
  res.redirect(`${clientUrl}/admin`)
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', brand: 'Choco D\'or Krishnagiri', time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🍫 Choco D'or Backend running on http://localhost:${PORT}`)
})
