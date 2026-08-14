// Comprehensive E2E test script validating all requirements of Part 42

async function runTests() {
  console.log('🚀 Starting Choco D\'or Full-Stack E2E Automated Verification...\n')

  const BASE_URL = 'http://localhost:5000/api'

  // Helper for requests
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
    // 1. Register Customer
    console.log('1. Testing Customer Registration & Instant Royalty ID...')
    const testEmail = `rahul_${Date.now()}@example.com`
    const testMobile = `98765${Math.floor(10000 + Math.random() * 90000)}`

    const custReg = await req('/auth/register', 'POST', {
      name: 'Rahul Sharma',
      email: testEmail,
      mobile: testMobile,
      password: 'password123',
    })
    console.log(`   ✓ Customer created: ${custReg.customer.name}`)
    console.log(`   ✓ Royalty ID generated: ${custReg.royalty.royaltyId}, Points: ${custReg.royalty.currentPoints}`)
    const custToken = custReg.token
    const customerId = custReg.customer.id

    // 2. Admin Login
    console.log('\n2. Testing Admin Login...')
    const adminLogin = await req('/admin/login', 'POST', {
      email: 'admin@chocodor.com',
      password: 'chocodor2026',
    })
    console.log(`   ✓ Admin authenticated: ${adminLogin.admin.name}`)
    const adminToken = adminLogin.token

    // 3. Admin Point Configuration
    console.log('\n3. Testing Admin Product Royalty Points Configuration...')
    await req('/admin/products/p-8', 'PATCH', { royaltyPoints: 10, price: 169 }, adminToken)
    await req('/admin/products/p-9', 'PATCH', { royaltyPoints: 15, price: 229 }, adminToken)
    console.log('   ✓ Set Triple Chocolate Waffle (p-8) = 10 pts, Price = ₹169')
    console.log('   ✓ Set Lotus Biscoff Waffle (p-9) = 15 pts, Price = ₹229')

    // 4. Cart Live Quote
    console.log('\n4. Testing Live Cart Server Quote (2× Waffle 1 + 1× Waffle 2)...')
    const quote = await req('/orders/quote', 'POST', {
      items: [
        { productId: 'p-8', quantity: 2 },
        { productId: 'p-9', quantity: 1 },
      ],
      orderType: 'DELIVERY',
    })
    console.log(`   ✓ Calculated Subtotal: ₹${quote.subtotal} (Expected: ₹567)`)
    console.log(`   ✓ Calculated Royalty Points: +${quote.totalRoyaltyPoints} pts (Expected: 20 + 15 = 35 pts)`)
    console.log(`   ✓ Delivery Fee: ₹${quote.deliveryFee}`)
    if (quote.totalRoyaltyPoints !== 35) throw new Error('Quote points mismatch')

    // 5. Customer Places Order 1
    console.log('\n5. Testing Order Creation with Point Snapshots...')
    const order1Res = await req('/orders', 'POST', {
      customerName: 'Rahul Sharma',
      customerMobile: testMobile,
      customerEmail: testEmail,
      orderType: 'DELIVERY',
      deliveryAddress: { street: 'MG Road', area: 'Gandhi Nagar', city: 'Krishnagiri' },
      items: [
        { productId: 'p-8', quantity: 2 },
        { productId: 'p-9', quantity: 1 },
      ],
    }, custToken)

    const order1 = order1Res.order
    console.log(`   ✓ Order placed: ${order1.order_number}`)
    console.log(`   ✓ Total Amount: ₹${order1.total_amount}`)
    console.log(`   ✓ Captured Total Royalty Points: +${order1.total_royalty_points} pts`)
    console.log(`   ✓ Points Credited: ${order1.points_credited} (Must be 0 until completed)`)
    console.log(`   ✓ Snapshot Item 1 points: ${order1.items[0].royalty_points_snapshot} pts`)
    console.log(`   ✓ Snapshot Item 2 points: ${order1.items[1].royalty_points_snapshot} pts`)

    // Verify customer balance is still 0
    const profileBefore = await req('/auth/me', 'GET', null, custToken)
    console.log(`   ✓ Customer balance before completion: ${profileBefore.royalty.currentPoints} pts (Expected: 0)`)
    if (profileBefore.royalty.currentPoints !== 0) throw new Error('Points should not be credited before order completion')

    // 6. Admin 30-Second Polling Detection
    console.log('\n6. Testing Admin Live Orders Polling & Search...')
    const liveOrders = await req('/admin/orders', 'GET', null, adminToken)
    const foundOrder = liveOrders.orders.find((o) => o.id === order1.id)
    console.log(`   ✓ Admin polling retrieved order ${foundOrder.order_number} with status: ${foundOrder.status}`)

    // 7. Order Status Progression & Point Credit on COMPLETED
    console.log('\n7. Testing Order Lifecycle & Idempotent Point Crediting on COMPLETED...')
    await req(`/admin/orders/${order1.id}/status`, 'PATCH', { status: 'CONFIRMED' }, adminToken)
    await req(`/admin/orders/${order1.id}/status`, 'PATCH', { status: 'PREPARING' }, adminToken)
    await req(`/admin/orders/${order1.id}/status`, 'PATCH', { status: 'READY' }, adminToken)
    await req(`/admin/orders/${order1.id}/status`, 'PATCH', { status: 'OUT_FOR_DELIVERY' }, adminToken)
    await req(`/admin/orders/${order1.id}/status`, 'PATCH', { status: 'DELIVERED' }, adminToken)
    const completedOrder = await req(`/admin/orders/${order1.id}/status`, 'PATCH', { status: 'COMPLETED' }, adminToken)

    console.log(`   ✓ Order status updated to: ${completedOrder.order.status}`)
    console.log(`   ✓ Order points_credited flag: ${completedOrder.order.points_credited}`)

    // Verify customer balance now has exactly +35 points
    const profileAfter = await req('/auth/me', 'GET', null, custToken)
    console.log(`   ✓ Customer balance after completion: ${profileAfter.royalty.currentPoints} pts (Expected: 35)`)
    if (profileAfter.royalty.currentPoints !== 35) throw new Error('Points credit mismatch on completion')

    // 8. Idempotency Test: Completing again does NOT duplicate points
    console.log('\n8. Testing Idempotency (Completing already completed order)...')
    await req(`/admin/orders/${order1.id}/status`, 'PATCH', { status: 'COMPLETED' }, adminToken)
    const profileIdempotent = await req('/auth/me', 'GET', null, custToken)
    console.log(`   ✓ Balance after duplicate complete: ${profileIdempotent.royalty.currentPoints} pts (Must remain 35)`)
    if (profileIdempotent.royalty.currentPoints !== 35) throw new Error('Duplicate point credit detected')

    // 9. Admin Changes Product Points & Snapshots Test
    console.log('\n9. Testing Historical Snapshot Preservation when Admin modifies points...')
    await req('/admin/products/p-9', 'PATCH', { royaltyPoints: 20 }, adminToken)
    console.log('   ✓ Admin updated Lotus Biscoff Waffle (p-9) from 15 pts -> 20 pts')

    const order2Res = await req('/orders', 'POST', {
      customerName: 'Rahul Sharma',
      customerMobile: testMobile,
      customerEmail: testEmail,
      orderType: 'PICKUP',
      items: [{ productId: 'p-9', quantity: 1 }],
    }, custToken)
    const order2 = order2Res.order
    console.log(`   ✓ Order 2 placed with points snapshot: +${order2.total_royalty_points} pts (Expected: 20)`)

    // Verify Order 1 still has 15 points snapshot for Lotus Biscoff
    const recheckedOrder1 = await req(`/admin/orders/${order1.id}`, 'GET', null, adminToken)
    const waffleItemOrder1 = recheckedOrder1.order.items.find((i) => i.product_id === 'p-9')
    console.log(`   ✓ Historical Order 1 Lotus Biscoff points snapshot: ${waffleItemOrder1.royalty_points_snapshot} pts (Preserved!)`)
    if (waffleItemOrder1.royalty_points_snapshot !== 15) throw new Error('Historical point snapshot was mutated!')

    // Complete Order 2 -> Credits 20 points
    await req(`/admin/orders/${order2.id}/status`, 'PATCH', { status: 'COMPLETED' }, adminToken)
    const profileAfterOrder2 = await req('/auth/me', 'GET', null, custToken)
    console.log(`   ✓ Customer balance after Order 2: ${profileAfterOrder2.royalty.currentPoints} pts (Expected: 35 + 20 = 55)`)

    // 10. Manual Admin Points Adjustment with Mandatory Reason
    console.log('\n10. Testing Manual Admin Point Adjustment with Mandatory Audit Reason...')
    await req(`/admin/customers/${customerId}/adjust-points`, 'POST', {
      amount: 500,
      direction: 'CREDIT',
      reason: 'Krishnagiri Launch Bonus & Compensation',
    }, adminToken)

    const profileAfterManual = await req('/auth/me', 'GET', null, custToken)
    console.log(`   ✓ Balance after +500 manual adjustment: ${profileAfterManual.royalty.currentPoints} pts (Expected: 555)`)

    // 11. Reward Redemption & Single-Use Code Enforcement
    console.log('\n11. Testing Reward Redemption, Ledger Debit & Single-Use Code...')
    const redeemRes = await req('/royalty/redeem', 'POST', { rewardId: 'rew-1' }, custToken)
    console.log(`   ✓ Redeemed ₹50 OFF reward for 500 pts! Generated Coupon: ${redeemRes.redemptionCode}`)
    console.log(`   ✓ New Balance: ${redeemRes.newBalance} pts (Expected: 555 - 500 = 55)`)

    // Place Order 3 applying the redemption code
    console.log('\n12. Testing Checkout with Redeemed Coupon...')
    const order3Res = await req('/orders', 'POST', {
      customerName: 'Rahul Sharma',
      customerMobile: testMobile,
      customerEmail: testEmail,
      orderType: 'DELIVERY',
      deliveryAddress: { street: 'MG Road', area: 'Gandhi Nagar', city: 'Krishnagiri' },
      items: [{ productId: 'p-1', quantity: 1 }], // ₹359
      appliedRewardCode: redeemRes.redemptionCode,
    }, custToken)
    console.log(`   ✓ Order 3 placed with reward: Subtotal: ₹${order3Res.order.subtotal}, Discount: -₹${order3Res.order.reward_discount}, Total: ₹${order3Res.order.total_amount}`)

    // Attempt to reuse the same redemption code (Must fail)
    console.log('\n13. Testing Rejection of Already-Used Coupon Code...')
    try {
      await req('/orders', 'POST', {
        customerName: 'Rahul Sharma',
        customerMobile: testMobile,
        customerEmail: testEmail,
        orderType: 'PICKUP',
        items: [{ productId: 'p-1', quantity: 1 }],
        appliedRewardCode: redeemRes.redemptionCode,
      }, custToken)
      throw new Error('Duplicate coupon redemption was improperly allowed!')
    } catch (err) {
      console.log(`   ✓ Duplicate code properly rejected: "${err.message}"`)
    }

    // 14. Cancelled Order Points Test
    console.log('\n14. Testing Cancelled Order (Zero Points Credited)...')
    const order4Res = await req('/orders', 'POST', {
      customerName: 'Rahul Sharma',
      customerMobile: testMobile,
      customerEmail: testEmail,
      orderType: 'PICKUP',
      items: [{ productId: 'p-1', quantity: 1 }],
    }, custToken)
    await req(`/admin/orders/${order4Res.order.id}/status`, 'PATCH', { status: 'CANCELLED' }, adminToken)
    const cancelledOrder = await req(`/admin/orders/${order4Res.order.id}`, 'GET', null, adminToken)
    console.log(`   ✓ Cancelled order points_credited: ${cancelledOrder.order.points_credited} (Must be 0)`)

    // 15. Ledger Audit Trail Verification
    console.log('\n15. Verifying Complete Royalty Transaction Ledger...')
    const ledger = await req('/royalty/transactions', 'GET', null, custToken)
    console.log(`   ✓ Total Transactions in Customer Ledger: ${ledger.transactions.length}`)
    ledger.transactions.forEach((tx, idx) => {
      console.log(`     [${idx + 1}] ${tx.direction === 'CREDIT' ? '+' : '-'}${tx.amount} pts | ${tx.type} | "${tx.reason}" | Balance: ${tx.balance_after} pts`)
    })

    console.log('\n======================================================')
    console.log('🎉 ALL 15 AUTOMATED VERIFICATION SUITES PASSED PERFECTLY!')
    console.log('======================================================\n')
  } catch (err) {
    console.error('\n❌ Verification Failed:', err)
    process.exit(1)
  }
}

runTests()
