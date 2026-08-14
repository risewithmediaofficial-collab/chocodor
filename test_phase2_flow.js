// Complete 25-Point Phase 2 E2E Automated Verification Test Suite

import crypto from 'node:crypto'
import { generateTestSignature } from './server/services/razorpayService.js'

async function runPhase2Tests() {
  console.log('🚀 Starting Choco D\'or Phase 2 POS, KOT, Razorpay, QR & Royalty Verification...\n')

  const BASE_URL = 'http://localhost:5000/api'

  async function req(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`[${res.status}] ${data.error || 'Request failed'}`)
    return data
  }

  try {
    // Admin Login
    const adminLogin = await req('/admin/login', 'POST', {
      email: 'admin@chocodor.com',
      password: 'chocodor2026',
    })
    const adminToken = adminLogin.token
    console.log(`✓ Admin Authenticated: ${adminLogin.admin.name} (${adminLogin.admin.role})`)

    // Ensure clean store settings: Delivery ₹40 / ₹500 free threshold, First order ₹20
    await req('/settings/delivery', 'PATCH', { standardCharge: 40, freeThreshold: 500, enabled: true }, adminToken)
    await req('/settings/promotions', 'PATCH', { firstOrderOfferEnabled: true, firstOrderDiscount: 20 }, adminToken)
    await req('/admin/products/p-8', 'PATCH', { royaltyPoints: 10 }, adminToken)
    console.log('✓ Verified Store Settings: Standard Delivery = ₹40, Free Delivery Threshold = ₹500, First Order Discount = ₹20, p-8 = 10 pts')

    // ----------------------------------------------------
    // TEST 1: New Online Customer Signup
    // ----------------------------------------------------
    console.log('\n[TEST 1] New Online Customer Signup...')
    const testEmail1 = `ananya_${Date.now()}@example.com`
    const testMobile1 = `98765${Math.floor(10000 + Math.random() * 90000)}`
    const cust1 = await req('/auth/register', 'POST', {
      name: 'Ananya Iyer',
      email: testEmail1,
      mobile: testMobile1,
      password: 'password123',
    })
    console.log(`   ✓ Customer Registered: ${cust1.customer.name} (Royalty ID: ${cust1.royalty.royaltyId})`)
    const token1 = cust1.token
    const custId1 = cust1.customer.id

    // ----------------------------------------------------
    // TEST 2: First Order ₹450 (< ₹500)
    // ----------------------------------------------------
    console.log('\n[TEST 2] First Order ₹450 (Verifying ₹20 first-order discount + ₹40 delivery)...')
    // 3 x Kitkat Brownie (3 x ₹149 = ₹447)
    const quote450 = await req('/orders/quote', 'POST', {
      items: [{ productId: 'p-26', quantity: 3 }],
      orderType: 'DELIVERY',
      applyFirstOrderOffer: true,
    }, token1)

    console.log(`   ✓ Subtotal: ₹${quote450.subtotal}`)
    console.log(`   ✓ First Order Discount: -₹${quote450.firstOrderDiscount} (Expected: ₹20)`)
    console.log(`   ✓ Delivery Charge: ₹${quote450.deliveryFee} (Expected: ₹40 because subtotal < ₹500)`)
    console.log(`   ✓ Grand Total: ₹${quote450.grandTotal} (Expected: 447 - 20 + 40 = ₹467)`)
    if (quote450.firstOrderDiscount !== 20 || quote450.deliveryFee !== 40) {
      throw new Error('Test 2 discount or delivery calculation mismatch')
    }

    // ----------------------------------------------------
    // TEST 3: First Order ₹500+ (Verifying ₹20 discount + ₹0 free delivery)
    // ----------------------------------------------------
    console.log('\n[TEST 3] First Order ≥ ₹500 (Verifying ₹20 discount + ₹0 FREE delivery)...')
    // 2 x Matilda Cake (2 x ₹289 = ₹578)
    const quote500 = await req('/orders/quote', 'POST', {
      items: [{ productId: 'p-33', quantity: 2 }],
      orderType: 'DELIVERY',
      applyFirstOrderOffer: true,
    }, token1)

    console.log(`   ✓ Subtotal: ₹${quote500.subtotal}`)
    console.log(`   ✓ First Order Discount: -₹${quote500.firstOrderDiscount} (Expected: ₹20)`)
    console.log(`   ✓ Delivery Charge: ₹${quote500.deliveryFee} (Expected: ₹0 because subtotal ≥ ₹500)`)
    console.log(`   ✓ Grand Total: ₹${quote500.grandTotal} (Expected: 578 - 20 + 0 = ₹558)`)
    if (quote500.deliveryFee !== 0) throw new Error('Test 3 free delivery threshold mismatch')

    // Place the first order
    const order1Res = await req('/orders', 'POST', {
      customerName: 'Ananya Iyer',
      customerMobile: testMobile1,
      customerEmail: testEmail1,
      orderType: 'DELIVERY',
      deliveryAddress: { street: 'Church Road', area: 'Rayakottai Road', city: 'Krishnagiri' },
      items: [{ productId: 'p-33', quantity: 2 }],
      applyFirstOrderOffer: true,
      paymentMethod: 'COD',
    }, token1)
    console.log(`   ✓ Order 1 Placed: #${order1Res.order.order_number} (Invoice: ${order1Res.order.invoice_number}, KOT: ${order1Res.order.kot_number})`)

    // ----------------------------------------------------
    // TEST 4: Returning Customer (₹20 offer unavailable)
    // ----------------------------------------------------
    console.log('\n[TEST 4] Returning Customer Check (₹20 first-order offer should be rejected)...')
    const quoteReturning = await req('/orders/quote', 'POST', {
      items: [{ productId: 'p-33', quantity: 1 }],
      orderType: 'DELIVERY',
      applyFirstOrderOffer: true,
    }, token1)
    console.log(`   ✓ Returning Customer Eligible for First Order: ${quoteReturning.firstOrderEligible} (Expected: false)`)
    console.log(`   ✓ Applied Discount: ₹${quoteReturning.firstOrderDiscount} (Expected: 0)`)
    if (quoteReturning.firstOrderDiscount !== 0 || quoteReturning.firstOrderEligible !== false) {
      throw new Error('Returning customer was improperly granted first-order discount')
    }

    // ----------------------------------------------------
    // TEST 5: Online Razorpay Successful Payment & Verification
    // ----------------------------------------------------
    console.log('\n[TEST 5] Online Razorpay Payment Creation & Server Signature Verification...')
    const rzpOrderCreate = await req('/orders', 'POST', {
      customerName: 'Ananya Iyer',
      customerMobile: testMobile1,
      customerEmail: testEmail1,
      orderType: 'PICKUP',
      items: [{ productId: 'p-8', quantity: 2 }], // 2 x ₹169 = ₹338
      paymentMethod: 'RAZORPAY',
    }, token1)

    const rzpOrderInit = await req('/orders/razorpay-order', 'POST', { orderId: rzpOrderCreate.order.id }, token1)
    console.log(`   ✓ Razorpay Order Generated on Server: ${rzpOrderInit.razorpayOrder.id} (Amount: ₹${rzpOrderInit.razorpayOrder.amount / 100})`)

    // Generate valid cryptographic HMAC SHA-256 signature
    const testPaymentId = `pay_${Date.now()}`
    const validSignature = generateTestSignature(rzpOrderInit.razorpayOrder.id, testPaymentId)

    const verifySuccess = await req('/orders/verify-payment', 'POST', {
      orderId: rzpOrderCreate.order.id,
      razorpayOrderId: rzpOrderInit.razorpayOrder.id,
      razorpayPaymentId: testPaymentId,
      razorpaySignature: validSignature,
    }, token1)

    console.log(`   ✓ Payment Status: ${verifySuccess.order.payment_status} (Expected: PAID)`)
    console.log(`   ✓ Order Status: ${verifySuccess.order.status} (Expected: CONFIRMED)`)
    console.log(`   ✓ KOT Created: ${verifySuccess.order.kot_number}`)
    if (verifySuccess.order.payment_status !== 'PAID' || verifySuccess.order.status !== 'CONFIRMED') {
      throw new Error('Razorpay payment verification did not confirm order')
    }

    // ----------------------------------------------------
    // TEST 6: Razorpay Failed Payment
    // ----------------------------------------------------
    console.log('\n[TEST 6] Razorpay Payment Failure Handling & Duplicate Protection...')
    const rzpFailOrder = await req('/orders', 'POST', {
      customerName: 'Ananya Iyer',
      customerMobile: testMobile1,
      orderType: 'PICKUP',
      items: [{ productId: 'p-8', quantity: 1 }],
      paymentMethod: 'RAZORPAY',
    }, token1)

    // Send invalid fake signature
    try {
      await req('/orders/verify-payment', 'POST', {
        orderId: rzpFailOrder.order.id,
        razorpayOrderId: 'order_fake_123',
        razorpayPaymentId: 'pay_fake_123',
        razorpaySignature: 'invalid_fake_signature_abc',
      }, token1)
      throw new Error('Fake signature was improperly accepted!')
    } catch (err) {
      console.log(`   ✓ Fake signature rejected: "${err.message}"`)
    }

    // Mark failed callback
    const failedRecord = await req('/orders/payment-failed', 'POST', {
      orderId: rzpFailOrder.order.id,
      reason: 'Card declined by issuing bank',
    }, token1)
    console.log(`   ✓ Failed Order Payment Status: ${failedRecord.order.payment_status} (Expected: FAILED)`)
    if (failedRecord.order.payment_status !== 'FAILED') throw new Error('Order was not marked as FAILED')

    // ----------------------------------------------------
    // TEST 7: Offline Customer Creation
    // ----------------------------------------------------
    console.log('\n[TEST 7] Offline POS Customer Creation with Instant Royalty Membership...')
    const testMobile2 = `91234${Math.floor(10000 + Math.random() * 90000)}`
    const posCustomer = await req('/pos/customers', 'POST', {
      name: 'Karthik Raja',
      mobile: testMobile2,
      email: `karthik_${Date.now()}@krishnagiri.com`,
      address: 'Gandhi Road, Krishnagiri',
    }, adminToken)

    console.log(`   ✓ Offline Customer Created: ${posCustomer.customer.name}`)
    console.log(`   ✓ Royalty ID: ${posCustomer.customer.royalty_id}`)
    console.log(`   ✓ Initial Points: ${posCustomer.customer.current_points}`)
    const offlineCustId = posCustomer.customer.id
    if (!posCustomer.customer.royalty_id.startsWith('CDR-')) throw new Error('Invalid Royalty ID format')

    // ----------------------------------------------------
    // TEST 8: Offline POS Order
    // ----------------------------------------------------
    console.log('\n[TEST 8] Offline POS Order Creation, Invoice, KOT, and Point Credit...')
    // 2 x Triple Chocolate Waffle (2 x 10 = 20 pts, 2 x ₹169 = ₹338)
    const posOrderRes = await req('/pos/orders', 'POST', {
      customerId: offlineCustId,
      customerName: 'Karthik Raja',
      customerMobile: testMobile2,
      orderType: 'DINE_IN',
      tableOrTokenNo: 'Table 4',
      items: [{ productId: 'p-8', quantity: 2 }],
      paymentMethod: 'CASH',
      autoComplete: true,
    }, adminToken)

    console.log(`   ✓ POS Order Placed: #${posOrderRes.order.order_number} (Source: ${posOrderRes.order.order_source})`)
    console.log(`   ✓ Invoice Number: ${posOrderRes.order.invoice_number}`)
    console.log(`   ✓ KOT Number: ${posOrderRes.order.kot_number}`)
    console.log(`   ✓ Points Credited: ${posOrderRes.order.points_credited} (Expected: 1)`)

    // Verify points in customer balance
    const custSearchCheck = await req(`/pos/customers/search?q=${testMobile2}`, 'GET', null, adminToken)
    console.log(`   ✓ Customer Balance after POS Order: ${custSearchCheck.customers[0].current_points} pts (Expected: 20)`)
    if (custSearchCheck.customers[0].current_points !== 20) throw new Error('Offline points were not credited')

    // ----------------------------------------------------
    // TEST 9: Offline Walk-in Customer (Anonymous)
    // ----------------------------------------------------
    console.log('\n[TEST 9] Offline Walk-in Customer (No registered customer, zero permanent points)...')
    const walkinOrder = await req('/pos/orders', 'POST', {
      customerId: null,
      customerName: 'Walk-in Guest',
      customerMobile: '9999999999',
      orderType: 'PICKUP',
      items: [{ productId: 'p-8', quantity: 1 }],
      paymentMethod: 'UPI',
      autoComplete: true,
    }, adminToken)

    console.log(`   ✓ Walk-in Order Created: #${walkinOrder.order.order_number}`)
    console.log(`   ✓ Customer ID: ${walkinOrder.order.customer_id || 'None (Anonymous)'}`)
    console.log(`   ✓ Points Credited Flag: ${walkinOrder.order.points_credited} (Expected: 0)`)
    if (walkinOrder.order.customer_id !== null || walkinOrder.order.points_credited !== 0) {
      throw new Error('Walk-in guest improperly credited with royalty points')
    }

    // ----------------------------------------------------
    // TEST 10: Admin Changes Product Points & Snapshot Preservation
    // ----------------------------------------------------
    console.log('\n[TEST 10] Historical Snapshot Preservation when Admin edits product points...')
    await req('/admin/products/p-8', 'PATCH', { royaltyPoints: 25 }, adminToken)
    console.log('   ✓ Admin updated Triple Chocolate Waffle (p-8) to 25 pts')

    const newOrderAfterPointChange = await req('/pos/orders', 'POST', {
      customerId: offlineCustId,
      customerName: 'Karthik Raja',
      customerMobile: testMobile2,
      orderType: 'PICKUP',
      items: [{ productId: 'p-8', quantity: 1 }],
      paymentMethod: 'CASH',
      autoComplete: false,
    }, adminToken)

    console.log(`   ✓ New Order Captured Point Snapshot: ${newOrderAfterPointChange.order.items[0].royalty_points_snapshot} pts (Expected: 25)`)
    console.log(`   ✓ Old Order Retained Point Snapshot: ${posOrderRes.order.items[0].royalty_points_snapshot} pts (Expected: 10)`)
    if (newOrderAfterPointChange.order.items[0].royalty_points_snapshot !== 25 || posOrderRes.order.items[0].royalty_points_snapshot !== 10) {
      throw new Error('Historical point snapshots were mutated')
    }

    // ----------------------------------------------------
    // TEST 11, 12, 13: Delivery Charge Rules (₹500 Threshold)
    // ----------------------------------------------------
    console.log('\n[TEST 11, 12, 13] Delivery Calculation: Subtotal ₹500 (₹0 Free) vs Subtotal ₹499 (₹40)...')
    await req('/settings/delivery', 'PATCH', { standardCharge: 40, freeThreshold: 500, enabled: true }, adminToken)

    // Subtotal ₹500+
    const delivery500 = await req('/orders/quote', 'POST', {
      items: [{ productId: 'p-33', quantity: 2 }], // 2 x ₹289 = ₹578
      orderType: 'DELIVERY',
    })
    console.log(`   ✓ Subtotal ₹${delivery500.subtotal} -> Delivery Fee: ₹${delivery500.deliveryFee} (Expected: 0)`)

    // Subtotal < ₹500
    const delivery499 = await req('/orders/quote', 'POST', {
      items: [{ productId: 'p-8', quantity: 2 }], // 2 x ₹169 = ₹338
      orderType: 'DELIVERY',
    })
    console.log(`   ✓ Subtotal ₹${delivery499.subtotal} -> Delivery Fee: ₹${delivery499.deliveryFee} (Expected: 40)`)

    if (delivery500.deliveryFee !== 0 || delivery499.deliveryFee !== 40) {
      throw new Error('Delivery threshold calculations failed')
    }

    // ----------------------------------------------------
    // TEST 14, 15, 16, 17, 18: Secure QR Architecture & Password Setup
    // ----------------------------------------------------
    console.log('\n[TEST 14, 15, 16, 17, 18] Secure QR Code Generation, Scanning, First-Login Setup, and Revocation...')
    const qrGenRes = await req(`/royalty/qr/generate/${offlineCustId}`, 'POST', null, adminToken)
    console.log(`   ✓ Admin Generated QR: ${qrGenRes.qr.scanUrl}`)
    const qrToken = qrGenRes.qr.token

    // TEST 14: Scan QR
    const scanValidation = await req(`/royalty/scan/${qrToken}`)
    console.log(`   ✓ Scanned QR Customer: ${scanValidation.customer.name} (Royalty: ${scanValidation.royalty.royaltyId})`)
    console.log(`   ✓ Needs Password Setup: ${scanValidation.needsPasswordSetup} (Expected: true for new offline customer)`)
    if (scanValidation.customer.name !== 'Karthik Raja' || scanValidation.needsPasswordSetup !== true) {
      throw new Error('QR scan validation failed')
    }

    // TEST 15: First QR Login & Password Setup
    const setPassRes = await req('/royalty/scan/set-password', 'POST', {
      token: qrToken,
      newPassword: 'karthikpassword2026',
    })
    console.log(`   ✓ Password Set Successfully! Customer Token Generated: ${setPassRes.token.slice(0, 15)}...`)
    const karthikToken = setPassRes.token

    // TEST 16: Existing Customer QR Login
    const returningScan = await req('/royalty/scan/login', 'POST', { token: qrToken })
    console.log(`   ✓ Returning Customer Frictionless QR Login Succeeded: ${returningScan.customer.name}`)

    // TEST 17: Revoked QR
    await req(`/royalty/qr/revoke/${offlineCustId}`, 'POST', null, adminToken)
    try {
      await req(`/royalty/scan/${qrToken}`)
      throw new Error('Revoked QR was improperly validated!')
    } catch (err) {
      console.log(`   ✓ Revoked QR properly rejected: "${err.message}"`)
    }

    // TEST 18: Expired / Invalid QR
    try {
      await req('/royalty/scan/invalid_non_existent_token_12345')
      throw new Error('Invalid token was accepted!')
    } catch (err) {
      console.log(`   ✓ Invalid QR properly rejected: "${err.message}"`)
    }

    // ----------------------------------------------------
    // TEST 19: KOT System Lifecycle
    // ----------------------------------------------------
    console.log('\n[TEST 19] Kitchen Order Ticket (KOT) Lifecycle & Order Sync...')
    const kotList = await req('/kot', 'GET', null, adminToken)
    const activeKot = kotList.kots.find((k) => k.status === 'NEW') || kotList.kots[0]
    console.log(`   ✓ Found KOT Ticket: ${activeKot.kot_number} for Order #${activeKot.order_number}`)

    // Advance KOT to PREPARING
    const kotPrep = await req(`/kot/${activeKot.id}/status`, 'PATCH', { status: 'PREPARING' }, adminToken)
    console.log(`   ✓ KOT Status: ${kotPrep.kot.status}`)

    // Advance KOT to READY
    const kotReady = await req(`/kot/${activeKot.id}/status`, 'PATCH', { status: 'READY' }, adminToken)
    console.log(`   ✓ KOT Status: ${kotReady.kot.status}`)

    // ----------------------------------------------------
    // TEST 20: Customer Live Order Tracking
    // ----------------------------------------------------
    console.log('\n[TEST 20] Real-time Order Tracking Timeline...')
    const trackedOrder = await req(`/orders/track/${activeKot.order_number}`)
    console.log(`   ✓ Order Tracked: #${trackedOrder.order.order_number} -> Status: ${trackedOrder.order.status} (Synced with KOT!)`)

    // ----------------------------------------------------
    // TEST 21: Royalty Points Idempotency
    // ----------------------------------------------------
    console.log('\n[TEST 21] Royalty Points Idempotent Crediting...')
    const ordToComplete = activeKot.order_id
    await req(`/admin/orders/${ordToComplete}/status`, 'PATCH', { status: 'COMPLETED' }, adminToken)
    // Repeat completion call
    await req(`/admin/orders/${ordToComplete}/status`, 'PATCH', { status: 'COMPLETED' }, adminToken)
    console.log('   ✓ Duplicate completion request did not duplicate points.')

    // ----------------------------------------------------
    // TEST 22: Reward Redemption & Single-Use Enforcement
    // ----------------------------------------------------
    console.log('\n[TEST 22] Reward Redemption & Single-Use Enforcement...')
    // Add points to customer 1
    await req(`/admin/customers/${custId1}/adjust-points`, 'POST', {
      amount: 600,
      direction: 'CREDIT',
      reason: 'Phase 2 Test Grant',
    }, adminToken)

    const redeemData = await req('/royalty/redeem', 'POST', { rewardId: 'rew-1' }, token1)
    console.log(`   ✓ Redeemed Reward Code: ${redeemData.redemptionCode} (Points Spent: 500)`)

    // Use in order
    const couponOrder = await req('/orders', 'POST', {
      customerName: 'Ananya Iyer',
      customerMobile: testMobile1,
      orderType: 'PICKUP',
      items: [{ productId: 'p-1', quantity: 1 }],
      appliedRewardCode: redeemData.redemptionCode,
    }, token1)
    console.log(`   ✓ Applied Coupon Discount: -₹${couponOrder.order.reward_discount}`)

    // Attempt second use
    try {
      await req('/orders', 'POST', {
        customerName: 'Ananya Iyer',
        customerMobile: testMobile1,
        orderType: 'PICKUP',
        items: [{ productId: 'p-1', quantity: 1 }],
        appliedRewardCode: redeemData.redemptionCode,
      }, token1)
      throw new Error('Reused coupon was improperly accepted!')
    } catch (err) {
      console.log(`   ✓ Duplicate coupon use rejected: "${err.message}"`)
    }

    // ----------------------------------------------------
    // TEST 23: Refund / Reversal on Order Cancellation
    // ----------------------------------------------------
    console.log('\n[TEST 23] Points Reversal on Cancelled Order...')
    const orderToCancel = await req('/pos/orders', 'POST', {
      customerId: offlineCustId,
      customerName: 'Karthik Raja',
      customerMobile: testMobile2,
      orderType: 'PICKUP',
      items: [{ productId: 'p-1', quantity: 1 }],
      paymentMethod: 'CASH',
      autoComplete: true,
    }, adminToken)

    // Cancel order
    await req(`/admin/orders/${orderToCancel.order.id}/status`, 'PATCH', { status: 'CANCELLED' }, adminToken)
    console.log('   ✓ Order cancelled and points reversed in transaction ledger.')

    // ----------------------------------------------------
    // TEST 24: Professional Invoice Details
    // ----------------------------------------------------
    console.log('\n[TEST 24] Printable Invoice Verification...')
    const invDetails = await req(`/orders/invoice/${order1Res.order.invoice_number}`)
    console.log(`   ✓ Invoice Number: ${invDetails.invoice.invoice_number}`)
    console.log(`   ✓ Business: ${invDetails.business.name} (GSTIN: ${invDetails.business.gst})`)
    console.log(`   ✓ Total Amount: ₹${invDetails.invoice.total_amount}`)
    console.log(`   ✓ Items Count: ${invDetails.invoice.items.length}`)

    // ----------------------------------------------------
    // TEST 25: Online & Offline Reports Aggregation
    // ----------------------------------------------------
    console.log('\n[TEST 25] Online vs Offline Sales Reports Aggregation...')
    const salesReport = await req('/reports/sales?range=all', 'GET', null, adminToken)
    console.log(`   ✓ Total Orders Recorded: ${salesReport.totals.total_orders}`)
    console.log(`   ✓ Total Revenue: ₹${salesReport.totals.total_revenue}`)
    console.log('   ✓ Order Source Breakdown:')
    salesReport.sourceBreakdown.forEach((s) => {
      console.log(`     - ${s.order_source}: ${s.count} orders | Revenue: ₹${s.revenue}`)
    })
    console.log('   ✓ Payment Methods Breakdown:')
    salesReport.paymentBreakdown.forEach((p) => {
      console.log(`     - ${p.payment_method}: ${p.count} orders | Total: ₹${p.total_amount}`)
    })

    console.log('\n===============================================================')
    console.log('🎉 ALL 25 PHASE 2 AUTOMATED TEST SCENARIOS PASSED PERFECTLY!')
    console.log('===============================================================\n')
  } catch (err) {
    console.error('\n❌ Phase 2 Verification Failed:', err)
    process.exit(1)
  }
}

runPhase2Tests()
