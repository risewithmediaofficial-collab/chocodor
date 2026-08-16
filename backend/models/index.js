import mongoose from 'mongoose'

// 1. Admin & Staff Model
const adminSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password_hash: { type: String, required: true },
  role: { type: String, default: 'ADMIN' }, // 'SUPER_ADMIN' | 'BILLING_STAFF' | 'KITCHEN_STAFF'
  pin: { type: String, default: '1234' },
  created_at: { type: String, default: () => new Date().toISOString() },
})

// 2. Customer Model
const customerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true, default: '' },
  mobile: { type: String, required: true, unique: true, trim: true, index: true },
  password_hash: { type: String, default: '' },
  saved_addresses: { type: Array, default: [] },
  created_at: { type: String, default: () => new Date().toISOString() },
})

// 3. Royalty Member Model
const royaltyMemberSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  customer_id: { type: String, required: true, unique: true, index: true },
  royalty_id: { type: String, required: true, unique: true, index: true }, // e.g. CDR-000001
  current_points: { type: Number, default: 0 },
  lifetime_points: { type: Number, default: 0 },
  points_redeemed: { type: Number, default: 0 },
  tier: { type: String, default: 'MEMBER' },
  created_at: { type: String, default: () => new Date().toISOString() },
})

// 4. Royalty Transaction Model (Ledger)
const royaltyTransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  member_id: { type: String, required: true, index: true },
  customer_id: { type: String, required: true, index: true },
  type: { type: String, required: true }, // 'ORDER_COMPLETION' | 'REWARD_REDEMPTION' | 'MANUAL_ADJUSTMENT' | 'REFUND'
  amount: { type: Number, required: true },
  direction: { type: String, required: true }, // 'CREDIT' | 'DEBIT'
  order_id: { type: String, default: null },
  reward_id: { type: String, default: null },
  reason: { type: String, required: true },
  balance_after: { type: Number, required: true },
  created_by: { type: String, default: 'SYSTEM' },
  created_at: { type: String, default: () => new Date().toISOString(), index: true },
})

// 5. Category Model
const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  slug: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  color: { type: String, default: '#E8D5BD' },
  sort_order: { type: Number, default: 0 },
  is_active: { type: Number, default: 1 },
})

// 6. Product Model
const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  category_id: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true },
  royalty_points: { type: Number, required: true },
  description: { type: String, default: '' },
  badge: { type: String, default: '' },
  image: { type: String, required: true },
  ingredients: { type: String, default: '' },
  dietary_info: { type: String, default: '100% Vegetarian, Eggless' },
  serving_suggestion: { type: String, default: '' },
  preparation_time: { type: String, default: '15-20 mins' },
  portion_size: { type: String, default: 'Serves 1-2' },
  extra_images: { type: Array, default: [] },
  is_available: { type: Number, default: 1 },
  is_featured: { type: Number, default: 0 },
  is_bestseller: { type: Number, default: 0 },
  created_at: { type: String, default: () => new Date().toISOString() },
})

// 7. Order Model
const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  order_number: { type: String, required: true, unique: true, index: true },
  order_source: { type: String, default: 'ONLINE' }, // 'ONLINE' | 'OFFLINE'
  invoice_number: { type: String, default: null },
  kot_number: { type: String, default: null },
  customer_id: { type: String, default: null, index: true },
  customer_name: { type: String, required: true, trim: true },
  customer_mobile: { type: String, required: true, trim: true, index: true },
  customer_email: { type: String, default: '' },
  order_type: { type: String, default: 'DELIVERY' }, // 'DELIVERY' | 'PICKUP' | 'DINE_IN'
  delivery_address: { type: mongoose.Schema.Types.Mixed, default: null },
  pickup_time: { type: String, default: 'As soon as possible' },
  subtotal: { type: Number, required: true },
  delivery_fee: { type: Number, default: 0 },
  first_order_discount: { type: Number, default: 0 },
  reward_discount: { type: Number, default: 0 },
  applied_reward_code: { type: String, default: null },
  total_amount: { type: Number, required: true },
  total_royalty_points: { type: Number, default: 0 },
  points_credited: { type: Number, default: 0 },
  status: { type: String, default: 'NEW', index: true }, // 'NEW' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'
  payment_status: { type: String, default: 'PENDING' }, // 'PENDING' | 'PAID' | 'COD_PENDING' | 'COD_CONFIRMED' | 'FAILED'
  payment_method: { type: String, default: 'COD' }, // 'COD' | 'RAZORPAY' | 'CASH' | 'UPI' | 'CARD'
  razorpay_order_id: { type: String, default: null },
  razorpay_payment_id: { type: String, default: null },
  razorpay_signature: { type: String, default: null },
  pos_staff_id: { type: String, default: null },
  table_or_token_no: { type: String, default: null },
  notes: { type: String, default: '' },
  created_at: { type: String, default: () => new Date().toISOString(), index: true },
  updated_at: { type: String, default: () => new Date().toISOString() },
})

// 8. Order Item Snapshot Model
const orderItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  order_id: { type: String, required: true, index: true },
  product_id: { type: String, required: true },
  product_name_snapshot: { type: String, required: true },
  unit_price_snapshot: { type: Number, required: true },
  royalty_points_snapshot: { type: Number, required: true },
  quantity: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  total_points: { type: Number, required: true },
})

// 9. Kitchen Order Ticket (KOT) Model
const kotSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  kot_number: { type: String, required: true, unique: true, index: true },
  order_id: { type: String, required: true, index: true },
  order_number: { type: String, required: true },
  order_source: { type: String, default: 'ONLINE' },
  customer_name: { type: String, required: true },
  customer_mobile: { type: String, default: '' },
  order_type: { type: String, default: 'DELIVERY' },
  items: { type: mongoose.Schema.Types.Mixed, required: true },
  special_instructions: { type: String, default: '' },
  status: { type: String, default: 'NEW' }, // 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED'
  created_at: { type: String, default: () => new Date().toISOString(), index: true },
  updated_at: { type: String, default: () => new Date().toISOString() },
})

// 10. Invoice Model
const invoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  invoice_number: { type: String, required: true, unique: true, index: true },
  order_id: { type: String, required: true, index: true },
  order_number: { type: String, required: true },
  customer_name: { type: String, required: true },
  customer_mobile: { type: String, default: '' },
  customer_address: { type: mongoose.Schema.Types.Mixed, default: null },
  subtotal: { type: Number, required: true },
  first_order_discount: { type: Number, default: 0 },
  reward_discount: { type: Number, default: 0 },
  delivery_charge: { type: Number, default: 0 },
  total_amount: { type: Number, required: true },
  payment_method: { type: String, required: true },
  payment_status: { type: String, required: true },
  royalty_points_earned: { type: Number, default: 0 },
  created_at: { type: String, default: () => new Date().toISOString() },
})

// 11. Store Settings Model
const storeSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  updated_at: { type: String, default: () => new Date().toISOString() },
})

// 12. Rewards Model
const rewardSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  points_required: { type: Number, required: true },
  discount_type: { type: String, default: 'FIXED' },
  discount_value: { type: Number, required: true },
  min_order_value: { type: Number, default: 0 },
  is_active: { type: Number, default: 1 },
  validity_days: { type: Number, default: 30 },
  created_at: { type: String, default: () => new Date().toISOString() },
})

// 13. Reward Redemptions (Coupon Codes) Model
const rewardRedemptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  reward_id: { type: String, required: true },
  member_id: { type: String, required: true, index: true },
  customer_id: { type: String, required: true, index: true },
  redemption_code: { type: String, required: true, unique: true, index: true },
  discount_value: { type: Number, required: true },
  min_order_value: { type: Number, default: 0 },
  points_spent: { type: Number, required: true },
  is_used: { type: Number, default: 0 },
  used_order_id: { type: String, default: null },
  expires_at: { type: String, required: true },
  created_at: { type: String, default: () => new Date().toISOString() },
})

// 14. Product Reviews Model
const productReviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  product_id: { type: String, required: true, index: true },
  order_id: { type: String, default: null },
  customer_id: { type: String, required: true },
  customer_name: { type: String, required: true },
  rating: { type: Number, required: true },
  review_text: { type: String, default: '' },
  status: { type: String, default: 'APPROVED' },
  created_at: { type: String, default: () => new Date().toISOString() },
})

// 15. Order Status History Model
const orderStatusHistorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  order_id: { type: String, required: true, index: true },
  status: { type: String, required: true },
  changed_by: { type: String, required: true },
  notes: { type: String, default: '' },
  created_at: { type: String, default: () => new Date().toISOString() },
})

// 16. Promotions Log Model
const promotionLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  promo_code: { type: String, required: true },
  customer_id: { type: String, required: true, index: true },
  order_id: { type: String, required: true },
  discount_amount: { type: Number, required: true },
  created_at: { type: String, default: () => new Date().toISOString() },
})

// 17. QR Tokens Model (In-Store QR Fast Login)
const qrTokenSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  customer_id: { type: String, required: true, index: true },
  member_id: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true, index: true },
  status: { type: String, default: 'ACTIVE' },
  first_login_completed: { type: Number, default: 0 },
  expires_at: { type: String, required: true },
  created_at: { type: String, default: () => new Date().toISOString() },
})

export const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema)
export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema)
export const RoyaltyMember = mongoose.models.RoyaltyMember || mongoose.model('RoyaltyMember', royaltyMemberSchema)
export const RoyaltyTransaction = mongoose.models.RoyaltyTransaction || mongoose.model('RoyaltyTransaction', royaltyTransactionSchema)
export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema)
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema)
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)
export const OrderItem = mongoose.models.OrderItem || mongoose.model('OrderItem', orderItemSchema)
export const KOT = mongoose.models.KOT || mongoose.model('KOT', kotSchema)
export const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema)
export const StoreSetting = mongoose.models.StoreSetting || mongoose.model('StoreSetting', storeSettingSchema)
export const Reward = mongoose.models.Reward || mongoose.model('Reward', rewardSchema)
export const RewardRedemption = mongoose.models.RewardRedemption || mongoose.model('RewardRedemption', rewardRedemptionSchema)
export const ProductReview = mongoose.models.ProductReview || mongoose.model('ProductReview', productReviewSchema)
export const OrderStatusHistory = mongoose.models.OrderStatusHistory || mongoose.model('OrderStatusHistory', orderStatusHistorySchema)
export const PromotionLog = mongoose.models.PromotionLog || mongoose.model('PromotionLog', promotionLogSchema)
export const QRToken = mongoose.models.QRToken || mongoose.model('QRToken', qrTokenSchema)
