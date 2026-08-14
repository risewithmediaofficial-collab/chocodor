import crypto from 'node:crypto'
import QRCode from 'qrcode'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'chocodor_royalty_secret_jwt_2026'

/**
 * Generates a secure, cryptographically random, revocable QR token for a customer.
 * Previous active tokens for this customer are automatically revoked.
 * Produces both the secure scan URL and an actual scannable QR Data URL image.
 */
export async function generateCustomerQR(customerId, baseUrl = 'http://localhost:5176') {
  const customer = db.prepare('SELECT id, name, mobile, email, password_hash FROM customers WHERE id = ?').get(customerId)
  if (!customer) throw new Error('Customer not found')

  const member = db.prepare('SELECT id, royalty_id, current_points, tier FROM royalty_members WHERE customer_id = ?').get(customerId)
  if (!member) throw new Error('Customer is not a Royalty member')

  // Revoke existing active tokens for this customer
  db.prepare("UPDATE qr_tokens SET status = 'REVOKED' WHERE customer_id = ? AND status = 'ACTIVE'").run(customerId)

  // Generate cryptographically secure token (32 bytes = 64 hex chars)
  const token = crypto.randomBytes(32).toString('hex')
  const tokenId = `qrt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  const now = new Date()
  // Expires in 365 days unless revoked
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
  const firstLoginCompleted = (customer.password_hash && customer.password_hash.trim() !== '') ? 1 : 0

  db.prepare(`
    INSERT INTO qr_tokens (id, customer_id, member_id, token, status, first_login_completed, expires_at, created_at)
    VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
  `).run(tokenId, customer.id, member.id, token, firstLoginCompleted, expiresAt, now.toISOString())

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
 * Returns customer, royalty member, and first_login_completed status.
 */
export function validateQRToken(token) {
  if (!token) throw new Error('Token is required')

  const qr = db.prepare(`
    SELECT q.*, c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email, c.password_hash,
           m.royalty_id, m.current_points, m.lifetime_points, m.tier
    FROM qr_tokens q
    JOIN customers c ON q.customer_id = c.id
    JOIN royalty_members m ON q.member_id = m.id
    WHERE q.token = ?
  `).get(token)

  if (!qr) {
    throw new Error('Invalid QR code. Token not recognized.')
  }

  if (qr.status === 'REVOKED') {
    throw new Error('This Royalty QR card has been revoked by store administration.')
  }

  if (new Date(qr.expires_at) < new Date()) {
    throw new Error('This Royalty QR card has expired. Please request a new card.')
  }

  const needsPasswordSetup = !qr.password_hash || qr.password_hash.trim() === '' || qr.first_login_completed === 0

  return {
    isValid: true,
    token: qr.token,
    status: qr.status,
    needsPasswordSetup,
    customer: {
      id: qr.customer_id,
      name: qr.customer_name,
      mobile: qr.customer_mobile,
      email: qr.customer_email,
    },
    royalty: {
      royaltyId: qr.royalty_id,
      currentPoints: qr.current_points,
      lifetimePoints: qr.lifetime_points,
      tier: qr.tier,
    },
  }
}

/**
 * First-Time QR Onboarding: Sets the customer's password and issues a signed JWT session.
 */
export function setPasswordFromQR(token, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long')
  }

  const validation = validateQRToken(token)
  const passwordHash = bcrypt.hashSync(newPassword, 10)

  // Update customer password
  db.prepare('UPDATE customers SET password_hash = ? WHERE id = ?').run(passwordHash, validation.customer.id)

  // Mark token as onboarded
  db.prepare('UPDATE qr_tokens SET first_login_completed = 1 WHERE token = ?').run(token)

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
 * Frictionless Returning QR Login: Generates a signed session for a valid QR card.
 */
export function loginViaQR(token) {
  const validation = validateQRToken(token)

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
export function revokeCustomerQR(customerId) {
  const info = db.prepare("UPDATE qr_tokens SET status = 'REVOKED' WHERE customer_id = ? AND status = 'ACTIVE'").run(customerId)
  return { revokedCount: info.changes }
}
