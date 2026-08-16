import { connectMongoDB } from '../mongodb.js'
import {
  Customer,
  RoyaltyMember,
  RoyaltyTransaction,
  Order,
  OrderItem,
  KOT,
  Invoice,
  RewardRedemption,
  ProductReview,
  OrderStatusHistory,
  PromotionLog,
  QRToken,
} from '../models/index.js'

async function purgeTestData() {
  console.log('🧹 Purging test data from MongoDB...')
  await connectMongoDB()

  const custRes = await Customer.deleteMany({})
  const memRes = await RoyaltyMember.deleteMany({})
  const txRes = await RoyaltyTransaction.deleteMany({})
  const ordRes = await Order.deleteMany({})
  const itemRes = await OrderItem.deleteMany({})
  const kotRes = await KOT.deleteMany({})
  const invRes = await Invoice.deleteMany({})
  const redRes = await RewardRedemption.deleteMany({})
  const revRes = await ProductReview.deleteMany({})
  const oshRes = await OrderStatusHistory.deleteMany({})
  const prmRes = await PromotionLog.deleteMany({})
  const qrRes = await QRToken.deleteMany({})

  console.log('✅ Cleaned up MongoDB Collections:')
  console.log(`   • Customers: ${custRes.deletedCount} deleted`)
  console.log(`   • Royalty Members: ${memRes.deletedCount} deleted`)
  console.log(`   • Royalty Transactions: ${txRes.deletedCount} deleted`)
  console.log(`   • Orders: ${ordRes.deletedCount} deleted`)
  console.log(`   • Order Items: ${itemRes.deletedCount} deleted`)
  console.log(`   • KOTs: ${kotRes.deletedCount} deleted`)
  console.log(`   • Invoices: ${invRes.deletedCount} deleted`)
  console.log(`   • Reward Redemptions: ${redRes.deletedCount} deleted`)
  console.log(`   • Product Reviews: ${revRes.deletedCount} deleted`)
  console.log(`   • QR Tokens: ${qrRes.deletedCount} deleted`)
  console.log('✨ All fake/test data removed! Only clean Store Settings, Official Products & Admin credentials remain.')
  process.exit(0)
}

purgeTestData().catch((err) => {
  console.error('Purge error:', err)
  process.exit(1)
})
