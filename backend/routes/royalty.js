import express from 'express'
import { Customer, Reward, RewardRedemption, QRToken } from '../models/index.js'
import { authMiddleware } from './auth.js'
import {
  getMemberByCustomerId,
  createRoyaltyMember,
  getCustomerTransactions,
  redeemReward,
} from '../services/royaltyService.js'
import {
  generateCustomerQR,
  validateQRToken,
  setPasswordFromQR,
  loginViaQR,
  revokeCustomerQR,
} from '../services/qrService.js'

const router = express.Router()

// Get Member Digital Card with Secure Scannable QR Pass
router.get('/card', authMiddleware, async (req, res) => {
  try {
    let member = await getMemberByCustomerId(req.user.id)
    if (!member) {
      member = await createRoyaltyMember(req.user.id)
    }

    const customer = await Customer.findOne({ id: req.user.id }).lean()

    // Retrieve or generate secure QR token
    let activeToken = await QRToken.findOne({ customer_id: req.user.id, status: 'ACTIVE' }).lean()
    let qrDetails
    if (activeToken) {
      const scanUrl = `http://localhost:5176/royalty/scan/${activeToken.token}`
      const QRCode = (await import('qrcode')).default
      const qrImage = await QRCode.toDataURL(scanUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#2B1712', light: '#FAF6F0' },
      })
      qrDetails = { scanUrl, qrImage, token: activeToken.token }
    } else {
      qrDetails = await generateCustomerQR(req.user.id)
    }

    res.json({
      member: {
        royaltyId: member.royalty_id,
        customerName: customer?.name || '',
        email: customer?.email || '',
        mobile: customer?.mobile || '',
        currentPoints: member.current_points,
        lifetimePoints: member.lifetime_points,
        pointsRedeemed: member.points_redeemed,
        tier: member.tier,
        createdAt: member.created_at,
        qrCode: qrDetails.qrImage,
        scanUrl: qrDetails.scanUrl,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Public Scan Endpoint: Validates QR Token
router.get('/scan/:token', async (req, res) => {
  try {
    const { token } = req.params
    const validation = await validateQRToken(token)
    res.json(validation)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// First-Time Password Setup from QR Scan
router.post('/scan/set-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' })
    }

    const result = await setPasswordFromQR(token, newPassword)
    res.json({
      success: true,
      message: "Password set successfully! Welcome to Choco D'or Royalty.",
      ...result,
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Returning Customer Login via Scanned QR
router.post('/scan/login', async (req, res) => {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ error: 'QR token is required' })

    const result = await loginViaQR(token)
    res.json({
      success: true,
      ...result,
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Admin Generate/Regenerate QR for any customer
router.post('/qr/generate/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params
    const qrDetails = await generateCustomerQR(customerId)
    res.json({ success: true, qr: qrDetails })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Admin Revoke QR for customer
router.post('/qr/revoke/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params
    const result = await revokeCustomerQR(customerId)
    res.json({ success: true, message: 'QR token revoked successfully', ...result })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Get Transaction Ledger
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const transactions = await getCustomerTransactions(req.user.id)
    res.json({ transactions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get Rewards & Customer's Active Redemptions
router.get('/rewards', authMiddleware, async (req, res) => {
  try {
    let member = await getMemberByCustomerId(req.user.id)
    if (!member) {
      member = await createRoyaltyMember(req.user.id)
    }

    const rewards = await Reward.find({ is_active: 1 }).sort({ points_required: 1 }).lean()
    const myRedemptions = await RewardRedemption.find({ customer_id: req.user.id })
      .sort({ created_at: -1 })
      .lean()

    const rewardIds = myRedemptions.map((r) => r.reward_id)
    const rewardDocs = await Reward.find({ id: { $in: rewardIds } }).lean()
    const rewMap = {}
    for (const r of rewardDocs) {
      rewMap[r.id] = { name: r.name, description: r.description }
    }

    res.json({
      currentPoints: member.current_points,
      rewards: rewards.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        pointsRequired: r.points_required,
        discountType: r.discount_type,
        discountValue: r.discount_value,
        minOrderValue: r.min_order_value,
        canRedeem: member.current_points >= r.points_required,
      })),
      myRedemptions: myRedemptions.map((red) => ({
        id: red.id,
        rewardId: red.reward_id,
        rewardName: rewMap[red.reward_id]?.name || 'Reward',
        redemptionCode: red.redemption_code,
        discountValue: red.discount_value,
        minOrderValue: red.min_order_value,
        pointsSpent: red.points_spent,
        isUsed: red.is_used === 1,
        usedOrderId: red.used_order_id,
        expiresAt: red.expires_at,
        isExpired: new Date(red.expires_at) < new Date(),
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Redeem Reward
router.post('/redeem', authMiddleware, async (req, res) => {
  try {
    const { rewardId } = req.body
    if (!rewardId) return res.status(400).json({ error: 'Reward ID is required' })

    const result = await redeemReward(req.user.id, rewardId)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
