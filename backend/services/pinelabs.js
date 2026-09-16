/**
 * Pine Labs Plutus Cloud Integration Service
 * ==========================================
 * Handles communication with the Pine Labs Plutus Cloud API for POS terminal payments.
 *
 * How it works:
 * 1. Call initiateTransaction() → Pine Labs Cloud returns a PTRID
 * 2. The physical Plutus terminal auto-prompts the customer to tap/swipe/insert card
 * 3. Call fetchTransactionStatus() repeatedly until approved or failed
 *
 * API Docs Reference: https://developer.pinelabs.com/
 */

import https from 'node:https'
import http from 'node:http'
import { URL } from 'node:url'

// ─── Environment Config ──────────────────────────────────────────────────────

const ENV = process.env.PINELABS_ENV || 'UAT'

const ENDPOINTS = {
  UAT: {
    initiate: 'https://www.plutuscloudserviceuat.in:8201/CloudBasedIntegration/V1/PostTransaction',
    fetchStatus: 'https://www.plutuscloudserviceuat.in:8201/CloudBasedIntegration/V1/GetCloudBasedTxnStatus',
  },
  PRODUCTION: {
    initiate: 'https://www.plutuscloudservice.in:8201/CloudBasedIntegration/V1/PostTransaction',
    fetchStatus: 'https://www.plutuscloudservice.in:8201/CloudBasedIntegration/V1/GetCloudBasedTxnStatus',
  },
}

const BASE = ENDPOINTS[ENV] || ENDPOINTS.UAT

// ─── Sequence Number Generator ───────────────────────────────────────────────
// Pine Labs requires a unique sequential number per transaction session
let _sequenceCounter = Math.floor(Date.now() / 1000) % 100000

function nextSequence() {
  _sequenceCounter = (_sequenceCounter + 1) % 999999
  return _sequenceCounter
}

// ─── HTTP Helper (supports https on custom ports) ─────────────────────────────

function makeRequest(urlStr, method, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr)
    const isHttps = parsed.protocol === 'https:'
    const lib = isHttps ? https : http

    const postData = JSON.stringify(body)

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + (parsed.search || ''),
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      // Allow self-signed / corporate certs on Pine Labs servers
      rejectUnauthorized: false,
      timeout: 30000,
    }

    const req = lib.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) })
        } catch {
          resolve({ statusCode: res.statusCode, body: data })
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Pine Labs API request timed out (30s)'))
    })

    req.write(postData)
    req.end()
  })
}

// ─── initiateTransaction ──────────────────────────────────────────────────────

/**
 * Initiates a card payment on the connected Plutus terminal via Pine Labs Cloud.
 *
 * @param {object} options
 * @param {number} options.amount - Amount in rupees (will be converted to paisa internally if needed)
 * @param {string} options.orderId - Your internal order/reference ID
 * @returns {Promise<{ ptrid: string, transactionNumber: string, sequenceNumber: number }>}
 */
export async function initiateTransaction({ amount, orderId }) {
  const clientId   = process.env.PINELABS_CLIENT_ID
  const userId     = process.env.PINELABS_USER_ID
  const secToken   = process.env.PINELABS_SECURITY_TOKEN
  const merchantId = process.env.PINELABS_MERCHANT_ID || clientId
  const allowedPaymentMode = process.env.PINELABS_ALLOWED_PAYMENT_MODE || '37'

  if (!clientId || !userId || !secToken) {
    throw new Error(
      'Pine Labs credentials are not configured. ' +
      'Set PINELABS_CLIENT_ID, PINELABS_USER_ID, and PINELABS_SECURITY_TOKEN in .env'
    )
  }

  // Pine Labs requires amount in PAISA (integer), e.g., ₹100.50 → 10050
  const amountInPaisa = Math.round(Number(amount) * 100)

  if (!amountInPaisa || amountInPaisa <= 0) {
    throw new Error(`Invalid amount for Pine Labs transaction: ${amount}`)
  }

  const sequenceNumber = nextSequence()
  // TransactionNumber must be unique per merchant session — use orderId + sequence
  const transactionNumber = `CDR-${orderId || Date.now()}-${sequenceNumber}`.slice(0, 20)

  const payload = {
    TransactionNumber: transactionNumber,
    SequenceNumber: sequenceNumber,
    AllowedPaymentMode: allowedPaymentMode,
    ClientId: Number(clientId),
    UserID: userId,
    MerchantID: merchantId,
    SecurityToken: secToken,
    Amount: amountInPaisa,
    // Optional: add additional data for reconciliation
    AdditionalInfo: [
      { Tag: '0', Value: orderId || '' },
      { Tag: '1', Value: 'Choco D\'or' },
    ],
  }

  console.log(`[Pine Labs] Initiating transaction: ₹${amount} | TxnNo: ${transactionNumber}`)

  const { statusCode, body } = await makeRequest(BASE.initiate, 'POST', payload)

  if (statusCode !== 200) {
    throw new Error(`Pine Labs API error (HTTP ${statusCode}): ${JSON.stringify(body)}`)
  }

  // Pine Labs returns { PlutusTransactionReferenceID, ResponseCode, ResponseMessage }
  if (body.ResponseCode && body.ResponseCode !== '0' && body.ResponseCode !== 0) {
    throw new Error(`Pine Labs rejected transaction: [${body.ResponseCode}] ${body.ResponseMessage || ''}`)
  }

  const ptrid = String(body.PlutusTransactionReferenceID || body.PTRID || '')

  if (!ptrid) {
    throw new Error(`Pine Labs did not return a PTRID. Response: ${JSON.stringify(body)}`)
  }

  console.log(`[Pine Labs] Transaction initiated. PTRID: ${ptrid}`)

  return { ptrid, transactionNumber, sequenceNumber }
}

// ─── fetchTransactionStatus ───────────────────────────────────────────────────

/**
 * Polls the Pine Labs Cloud for the status of a transaction.
 *
 * @param {object} options
 * @param {string} options.ptrid - The Plutus Transaction Reference ID
 * @param {string} options.clientId - Optional override; reads from env by default
 * @returns {Promise<{ approved: boolean, status: string, transactionData: object }>}
 */
export async function fetchTransactionStatus({ ptrid }) {
  const clientId = process.env.PINELABS_CLIENT_ID
  const userId   = process.env.PINELABS_USER_ID
  const secToken = process.env.PINELABS_SECURITY_TOKEN

  if (!clientId || !userId || !secToken) {
    throw new Error('Pine Labs credentials are not configured.')
  }

  const payload = {
    PlutusTransactionReferenceID: ptrid,
    ClientId: Number(clientId),
    UserID: userId,
    SecurityToken: secToken,
  }

  const { statusCode, body } = await makeRequest(BASE.fetchStatus, 'POST', payload)

  if (statusCode !== 200) {
    throw new Error(`Pine Labs status API error (HTTP ${statusCode}): ${JSON.stringify(body)}`)
  }

  // Normalize the response
  // Pine Labs returns ResponseCode 0 = Success, 1 = Pending, others = Failed/Error
  const responseCode = String(body.ResponseCode ?? '')
  const transactionData = body.TransactionData || body.TransactionResponse || {}
  const txnStatus = transactionData.TxnStatus || body.TxnStatus || ''

  // Approved states: ResponseCode=0 AND TxnStatus is 'APPROVED' or 'SUCCESS' or '0300'
  const isApproved =
    (responseCode === '0' || responseCode === '00') &&
    (txnStatus === 'APPROVED' || txnStatus === 'SUCCESS' || txnStatus === '0300' || !txnStatus)

  // Pending: transaction still in progress (terminal hasn't responded yet)
  const isPending =
    responseCode === '1' ||
    txnStatus === 'PENDING' ||
    txnStatus === '' ||
    body.ResponseMessage?.toLowerCase().includes('pending')

  let status = 'FAILED'
  if (isApproved) status = 'APPROVED'
  else if (isPending) status = 'PENDING'

  return {
    approved: isApproved,
    pending: isPending,
    status,
    responseCode,
    responseMessage: body.ResponseMessage || '',
    transactionData,
    rawResponse: body,
  }
}

// ─── Mock Mode (for UI testing without a live terminal) ────────────────────────

/**
 * Simulates a Pine Labs transaction for UI testing when credentials aren't set.
 * Returns a fake PTRID after a delay. Set PINELABS_MOCK=true in .env to use.
 */
export async function mockInitiateTransaction({ amount, orderId }) {
  await new Promise((r) => setTimeout(r, 1000))
  const fakePtrid = `MOCK-PTRID-${Date.now()}`
  console.log(`[Pine Labs MOCK] Fake initiate: ₹${amount} | PTRID: ${fakePtrid}`)
  return { ptrid: fakePtrid, transactionNumber: `CDR-MOCK-${orderId}`, sequenceNumber: 1 }
}

export async function mockFetchTransactionStatus({ ptrid }) {
  await new Promise((r) => setTimeout(r, 2000))
  console.log(`[Pine Labs MOCK] Fake status check for PTRID: ${ptrid} → APPROVED`)
  return {
    approved: true,
    pending: false,
    status: 'APPROVED',
    responseCode: '0',
    responseMessage: 'Mock approved for testing',
    transactionData: { TxnStatus: 'APPROVED', ApprovalCode: 'MOCK123' },
    rawResponse: {},
  }
}
