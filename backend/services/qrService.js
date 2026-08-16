import crypto from 'node:crypto'
import QRCode from 'qrcode'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Customer, RoyaltyMember, QRToken } from '../models/index.js'

const JWT_SECRET = process.env.JWT_SECRET || 'chocodor_royalty_secret_jwt_2026'

/**
 * Generates a secure, cryptographically random, revocable QR token for a customer.
 */
export async function generateCustomerQR(customerId, baseUrl = 'http://localhost:5176') {
  const customer = await Customer.findOne({ id: customerId }).lean()
  if (!customer) throw new Error('Customer not found')

  const member = await RoyaltyMember.findOne({ customer_id: customerId }).lean()
  if (!member) throw new Error('Customer is not a Royalty member')

  // Revoke existing active tokens for this customer
  await QRToken.updateMany({ customer_id: customerId, status: 'ACTIVE' }, { status: 'REVOKED' })

  const token = crypto.randomBytes(32).toString('hex')
  const tokenId = `qrt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
  const firstLoginCompleted = customer.password_hash && customer.password_hash.trim() !== '' ? 1 : 0

  await QRToken.create({
    id: tokenId,
    customer_id: customer.id,
    member_id: member.id,
    token,
    status: 'ACTIVE',
    first_login_completed: firstLoginCompleted,
    expires_at: expiresAt,
    created_at: now.toISOString(),
  })

  const scanUrl = `${baseUrl}/royalty/scan/${token}`
  const qrImage = await QRCode.toDataURL(scanUrl, {
    width: 320,
    margin: 2,
    color: {
      dark: '#2B1712',
      light: '#FFFFFF',
    },
  })

  return {
    tokenId,
    token,
    scanUrl,
    qrImage,
    status: 'ACTIVE',
    firstLoginCompleted: Boolean(firstLoginCompleted),
    expiresAt,
    memberId: member.royalty_id,
    customerName: customer.name,
    customerMobile: customer.mobile,
  }
}

/**
 * Validates a scanned QR token.
 */
export async function validateQRToken(token) {
  if (!token) throw new Error('Token is required')

  const qr = await QRToken.findOne({ token }).lean()
  if (!qr) {
    throw new Error('Invalid QR code. Token not recognized.')
  }

  if (qr.status === 'REVOKED') {
    throw new Error('This Royalty QR card has been revoked by store administration.')
  }

  if (new Date(qr.expires_at) < new Date()) {
    throw new Error('This Royalty QR card has expired. Please request a new card.')
  }

  const customer = await Customer.findOne({ id: qr.customer_id }).lean()
  const member = await RoyaltyMember.findOne({ id: qr.member_id }).lean()

  const needsPasswordSetup = !customer?.password_hash || customer.password_hash.trim() === '' || qr.first_login_completed === 0

  return {
    isValid: true,
    token: qr.token,
    status: qr.status,
    needsPasswordSetup,
    customer: {
      id: customer.id,
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
    },
    royalty: {
      royaltyId: member?.royalty_id || '',
      currentPoints: member?.current_points || 0,
      lifetimePoints: member?.lifetime_points || 0,
      tier: member?.tier || 'MEMBER',
    },
  }
}

/**
 * First-Time QR Onboarding: Sets customer password and issues signed JWT session.
 */
export async function setPasswordFromQR(token, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long')
  }

  const validation = await validateQRToken(token)
  const passwordHash = bcrypt.hashSync(newPassword, 10)

  await Customer.updateOne({ id: validation.customer.id }, { password_hash: passwordHash })
  await QRToken.updateOne({ token }, { first_login_completed: 1 })

  const jwtToken = jwt.sign(
    {
      id: validation.customer.id,
      name: validation.customer.name,
      email: validation.customer.email,
      mobile: validation.customer.mobile,
      royaltyId: validation.royalty.royaltyId,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  )

  return {
    customer: validation.customer,
    royalty: validation.royalty,
    token: jwtToken,
  }
}

/**
 * Returning QR Login: Generates a signed session for a valid QR card.
 */
export async function loginViaQR(token) {
  const validation = await validateQRToken(token)

  if (validation.needsPasswordSetup) {
    throw new Error('First-time password setup is required for this card')
  }

  const jwtToken = jwt.sign(
    {
      id: validation.customer.id,
      name: validation.customer.name,
      email: validation.customer.email,
      mobile: validation.customer.mobile,
      royaltyId: validation.royalty.royaltyId,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  )

  return {
    customer: validation.customer,
    royalty: validation.royalty,
    token: jwtToken,
  }
}

/**
 * Revokes an active QR token for a customer.
 */
export async function revokeCustomerQR(customerId) {
  const res = await QRToken.updateMany({ customer_id: customerId, status: 'ACTIVE' }, { status: 'REVOKED' })
  return { revokedCount: res.modifiedCount }
}
