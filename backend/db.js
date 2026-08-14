import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'chocodor.db')
export const db = new DatabaseSync(dbPath)

// Initialize Schema
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      mobile TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      saved_addresses TEXT DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS royalty_members (
      id TEXT PRIMARY KEY,
      customer_id TEXT UNIQUE NOT NULL,
      royalty_id TEXT UNIQUE NOT NULL,
      current_points INTEGER DEFAULT 0,
      lifetime_points INTEGER DEFAULT 0,
      points_redeemed INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'MEMBER',
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS royalty_transactions (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      direction TEXT NOT NULL,
      order_id TEXT,
      reward_id TEXT,
      reason TEXT NOT NULL,
      balance_after INTEGER NOT NULL,
      created_by TEXT DEFAULT 'SYSTEM',
      created_at TEXT NOT NULL,
      FOREIGN KEY (member_id) REFERENCES royalty_members(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#E8D5BD',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      royalty_points INTEGER NOT NULL,
      description TEXT DEFAULT '',
      badge TEXT DEFAULT '',
      image TEXT NOT NULL,
      is_available INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      is_bestseller INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      order_source TEXT DEFAULT 'ONLINE',
      invoice_number TEXT,
      kot_number TEXT,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      customer_mobile TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      order_type TEXT NOT NULL,
      delivery_address TEXT,
      pickup_time TEXT,
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL,
      first_order_discount REAL DEFAULT 0,
      reward_discount REAL DEFAULT 0,
      applied_reward_code TEXT,
      total_amount REAL NOT NULL,
      total_royalty_points INTEGER NOT NULL,
      points_credited INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      pos_staff_id TEXT,
      table_or_token_no TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name_snapshot TEXT NOT NULL,
      unit_price_snapshot REAL NOT NULL,
      royalty_points_snapshot INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      total_points INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS kots (
      id TEXT PRIMARY KEY,
      kot_number TEXT UNIQUE NOT NULL,
      order_id TEXT NOT NULL,
      order_number TEXT NOT NULL,
      order_source TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_mobile TEXT,
      order_type TEXT NOT NULL,
      items TEXT NOT NULL,
      special_instructions TEXT DEFAULT '',
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      order_id TEXT NOT NULL,
      order_number TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_mobile TEXT,
      customer_address TEXT,
      subtotal REAL NOT NULL,
      first_order_discount REAL DEFAULT 0,
      reward_discount REAL DEFAULT 0,
      delivery_charge REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      royalty_points_earned INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS qr_tokens (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      first_login_completed INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (member_id) REFERENCES royalty_members(id)
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      status TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS promotions_log (
      id TEXT PRIMARY KEY,
      promo_code TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      discount_amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      points_required INTEGER NOT NULL,
      discount_type TEXT NOT NULL,
      discount_value REAL NOT NULL,
      min_order_value REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      validity_days INTEGER DEFAULT 30,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reward_redemptions (
      id TEXT PRIMARY KEY,
      reward_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      redemption_code TEXT UNIQUE NOT NULL,
      discount_value REAL NOT NULL,
      min_order_value REAL NOT NULL,
      points_spent INTEGER NOT NULL,
      is_used INTEGER DEFAULT 0,
      used_order_id TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (reward_id) REFERENCES rewards(id),
      FOREIGN KEY (member_id) REFERENCES royalty_members(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'ADMIN',
      pin TEXT DEFAULT '1234',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      order_id TEXT,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      review_text TEXT DEFAULT '',
      status TEXT DEFAULT 'APPROVED',
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
  `)

  // Run migrations on existing tables if needed
  try {
    db.exec('ALTER TABLE orders ADD COLUMN order_source TEXT DEFAULT "ONLINE"')
  } catch {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN invoice_number TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN kot_number TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN first_order_discount REAL DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN razorpay_order_id TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN razorpay_payment_id TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN razorpay_signature TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN pos_staff_id TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN table_or_token_no TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE admins ADD COLUMN pin TEXT DEFAULT "1234"')
  } catch {}
  try {
    db.exec('ALTER TABLE products ADD COLUMN ingredients TEXT DEFAULT ""')
  } catch {}
  try {
    db.exec('ALTER TABLE products ADD COLUMN dietary_info TEXT DEFAULT "100% Vegetarian, Eggless"')
  } catch {}
  try {
    db.exec('ALTER TABLE products ADD COLUMN serving_suggestion TEXT DEFAULT ""')
  } catch {}
  try {
    db.exec('ALTER TABLE products ADD COLUMN preparation_time TEXT DEFAULT "15-20 mins"')
  } catch {}
  try {
    db.exec('ALTER TABLE products ADD COLUMN portion_size TEXT DEFAULT "Serves 1-2"')
  } catch {}
  try {
    db.exec('ALTER TABLE products ADD COLUMN extra_images TEXT DEFAULT "[]"')
  } catch {}

  seedDefaultData()
}

function seedDefaultData() {
  const now = new Date().toISOString()

  // 1. Seed Store Settings
  const deliverySetting = db.prepare('SELECT key FROM store_settings WHERE key = ?').get('delivery')
  if (!deliverySetting) {
    db.prepare('INSERT INTO store_settings (key, value, updated_at) VALUES (?, ?, ?)').run(
      'delivery',
      JSON.stringify({ standardCharge: 40, freeThreshold: 500, enabled: true, minOrder: 0 }),
      now
    )
  }

  const promoSetting = db.prepare('SELECT key FROM store_settings WHERE key = ?').get('promotions')
  if (!promoSetting) {
    db.prepare('INSERT INTO store_settings (key, value, updated_at) VALUES (?, ?, ?)').run(
      'promotions',
      JSON.stringify({ firstOrderOfferEnabled: true, firstOrderDiscount: 20, minOrder: 0 }),
      now
    )
  }

  const bizSetting = db.prepare('SELECT key FROM store_settings WHERE key = ?').get('business')
  const officialBizData = JSON.stringify({
    name: "Choco D'or",
    tagline: "A Little Luxury In Every Bite",
    location: "Krishnagiri",
    phone: "+91 94880 54036",
    email: "contact@chocodor.com",
    address: "Royakottai flyover, near SBI Bank, Londenpet, Krishnagiri, Bayanapalli, Tamil Nadu 635001",
    enableGst: false,
    gst: "33ADEPA2229C2ZG",
    fssai: "22418107000384",
  })

  if (!bizSetting) {
    db.prepare('INSERT INTO store_settings (key, value, updated_at) VALUES (?, ?, ?)').run(
      'business',
      officialBizData,
      now
    )
  } else {
    db.prepare('UPDATE store_settings SET value = ?, updated_at = ? WHERE key = ?').run(
      officialBizData,
      now,
      'business'
    )
  }

  // 2. Seed Admin & Staff Accounts
  const adminCheck = db.prepare('SELECT id FROM admins WHERE email = ?').get('admin@chocodor.com')
  if (!adminCheck) {
    const passwordHash = bcrypt.hashSync('chocodor2026', 10)
    db.prepare(`
      INSERT INTO admins (id, name, email, password_hash, role, pin, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('admin-1', 'Choco D\'or Admin', 'admin@chocodor.com', passwordHash, 'SUPER_ADMIN', '1234', now)
  }

  const staffCheck = db.prepare('SELECT id FROM admins WHERE email = ?').get('pos@chocodor.com')
  if (!staffCheck) {
    const passwordHash = bcrypt.hashSync('pos2026', 10)
    db.prepare(`
      INSERT INTO admins (id, name, email, password_hash, role, pin, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('staff-pos-1', 'Billing Counter 1', 'pos@chocodor.com', passwordHash, 'BILLING_STAFF', '1111', now)
  }

  const kitchenCheck = db.prepare('SELECT id FROM admins WHERE email = ?').get('kitchen@chocodor.com')
  if (!kitchenCheck) {
    const passwordHash = bcrypt.hashSync('kitchen2026', 10)
    db.prepare(`
      INSERT INTO admins (id, name, email, password_hash, role, pin, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('staff-kitchen-1', 'Kitchen Display Station', 'kitchen@chocodor.com', passwordHash, 'KITCHEN_STAFF', '2222', now)
  }

  // 3. Seed Categories
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count
  if (categoryCount === 0) {
    const initialCategories = [
      { id: 'cat-1', slug: 'lalban', name: 'Lalban', color: '#C9B8D9', sort_order: 1 },
      { id: 'cat-2', slug: 'waffles', name: 'Waffles', color: '#F0C14B', sort_order: 2 },
      { id: 'cat-3', slug: 'mini-pancakes', name: 'Mini Pancakes', color: '#A8C4D9', sort_order: 3 },
      { id: 'cat-4', slug: 'brownies', name: 'Brownies', color: '#E8A060', sort_order: 4 },
      { id: 'cat-5', slug: 'bomboloni', name: 'Bomboloni', color: '#C4BFB8', sort_order: 5 },
      { id: 'cat-6', slug: 'cakes', name: 'Cakes', color: '#F9D5A7', sort_order: 6 },
      { id: 'cat-7', slug: 'cheesecake', name: 'Cheese Cake', color: '#FBE4B8', sort_order: 7 },
      { id: 'cat-8', slug: 'tiramisu', name: 'Tiramisu', color: '#D6C0B3', sort_order: 8 },
      { id: 'cat-9', slug: 'buns', name: 'Buns', color: '#E8D5BD', sort_order: 9 },
      { id: 'cat-10', slug: 'tresleches', name: 'Tresleches', color: '#D4E2D4', sort_order: 10 },
    ]

    const insertCat = db.prepare(`
      INSERT INTO categories (id, slug, name, color, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const cat of initialCategories) {
      insertCat.run(cat.id, cat.slug, cat.name, cat.color, cat.sort_order, 1)
    }
  }

  // 4. Seed 43 Official Krishnagiri Menu Products
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count
  if (productCount === 0) {
    const initialProducts = [
      // 1. Lalban
      { id: 'p-1', cat: 'cat-1', name: 'Pistachio Salankatia', price: 359, points: 25, badge: 'Popular', image: '/images/products/Tiramisu.jpg', desc: 'Signature crispy pastry layered with rich pistachio cream and crushed roasted pistachios.', feat: 1, best: 0 },
      { id: 'p-2', cat: 'cat-1', name: 'Biscoff Salankatia', price: 359, points: 25, badge: 'Bestseller', image: '/images/products/Biscoff_Salankatia.jpg', desc: 'Decadent layered Salankatia drenched in caramelized Lotus Biscoff spread and cookie crumbs.', feat: 1, best: 1 },
      { id: 'p-3', cat: 'cat-1', name: 'Nutella Salankatia', price: 359, points: 25, badge: 'Signature', image: '/images/products/Nutella_Salankatia.jpg', desc: 'Golden flaky layers filled and drizzled generously with authentic creamy Nutella.', feat: 0, best: 0 },
      { id: 'p-4', cat: 'cat-1', name: 'Pistachio + Biscoff Salankatia', price: 389, points: 30, badge: 'Chef Special', image: '/images/products/Pistachio_+_Biscoff_Salankatia.jpg', desc: 'Dual delight combining nutty roasted pistachio and spiced Lotus Biscoff spread.', feat: 0, best: 0 },
      { id: 'p-5', cat: 'cat-1', name: 'Pistachio + Nutella Salankatia', price: 389, points: 30, badge: 'Special', image: '/images/products/Pistachio_+_Nutella_Salankatia.jpg', desc: 'A heavenly pairing of velvety Nutella hazelnut and rich pistachio cream.', feat: 0, best: 0 },
      { id: 'p-6', cat: 'cat-1', name: 'Biscoff + Nutella Salankatia', price: 389, points: 30, badge: 'Must Try', image: '/images/products/Biscoff_+_Nutella_Salankatia.jpg', desc: 'The ultimate indulgent combination of Lotus Biscoff crunch and creamy Nutella.', feat: 0, best: 0 },
      { id: 'p-7', cat: 'cat-1', name: 'Pistachio + Biscoff + Nutella Salankatia', price: 399, points: 35, badge: 'Supreme', image: '/images/products/Pistachio_+_Biscoff_+_Nutella_Salankatia.jpg', desc: 'Triple supreme loaded with Pistachio, Lotus Biscoff, and Nutella across flaky golden layers.', feat: 1, best: 1 },

      // 2. Waffles
      { id: 'p-8', cat: 'cat-2', name: 'Triple Chocolate Waffle', price: 169, points: 10, badge: 'Bestseller', image: '/images/products/Triple_Chocolate_Waffle.jpg', desc: 'A waffle loaded with three layers of chocolate goodness, perfect for sweet cravings.', feat: 1, best: 1 },
      { id: 'p-9', cat: 'cat-2', name: 'Lotus Biscoff Waffle', price: 229, points: 15, badge: 'Chef Pick', image: '/images/products/Lotus_Biscoff_Waffle.jpg', desc: 'Vanilla waffle covered with white chocolate and lotus biscoff bits with famous biscoff icecream.', feat: 1, best: 1 },
      { id: 'p-10', cat: 'cat-2', name: 'Oreo Waffle', price: 169, points: 10, badge: '', image: '/images/products/Oreo_Waffle.jpg', desc: 'A warm, crispy waffle with the chocolate crunch of Oreo in every bite.', feat: 0, best: 0 },
      { id: 'p-11', cat: 'cat-2', name: 'Kitkat Waffle', price: 169, points: 10, badge: '', image: '/images/products/Kitkat_Waffle.jpg', desc: 'A crispy waffle topped with the chocolatey goodness of Kitkat, perfect for sweet cravings.', feat: 0, best: 0 },
      { id: 'p-12', cat: 'cat-2', name: 'Nutty Nutella Waffle', price: 219, points: 15, badge: 'Popular', image: '/images/products/Nutty_Nutella_Waffle.jpg', desc: 'A warm waffle loaded with creamy Nutella and a nutty hazelnut twist in every bite.', feat: 0, best: 0 },
      { id: 'p-13', cat: 'cat-2', name: 'Butterscotch Waffle', price: 179, points: 10, badge: '', image: '/images/products/Butterscotch_Waffle.jpg', desc: 'Soft and buttery waffle with a classic butterscotch twist for a sweet treat.', feat: 0, best: 0 },
      { id: 'p-14', cat: 'cat-2', name: 'Dead By Chocolate', price: 169, points: 10, badge: 'Intense', image: '/images/products/Dead_By_Chocolate.jpg', desc: 'Intense dark chocolate waffle infused with melted chocolate ganache and cocoa crunch.', feat: 0, best: 0 },
      { id: 'p-15', cat: 'cat-2', name: 'White Choco Pistachio Waffle', price: 219, points: 15, badge: '', image: '/images/products/White_Choco_Pistachio_Waffle.jpg', desc: 'Warm crispy waffle drenched in velvety white chocolate sauce and toasted pistachio slivers.', feat: 0, best: 0 },
      { id: 'p-16', cat: 'cat-2', name: 'Kinder Joy Waffle', price: 229, points: 15, badge: '', image: '/images/products/Kinder_Joy_Waffle.jpg', desc: 'Playful waffle topped with Kinder chocolate cream, crispy wafers, and sweet creamy drizzle.', feat: 0, best: 0 },
      { id: 'p-17', cat: 'cat-2', name: 'Kiki & Oreo Cream Waffle', price: 229, points: 15, badge: '', image: '/images/products/Kiki_&_Oreo_Cream_Waffle.jpg', desc: 'Crispy golden waffle topped with Oreo cookie crunch and signature velvety cream.', feat: 0, best: 0 },

      // 3. Mini Pancakes
      { id: 'p-18', cat: 'cat-3', name: 'Triple Chocolate', price: 139, points: 10, badge: 'Bestseller', image: '/images/products/Triple_Chocolate.jpg', desc: 'A rich and satisfying chocolate treat for all the dessert lovers out there.', feat: 1, best: 1 },
      { id: 'p-19', cat: 'cat-3', name: 'Lotus Biscoff Pancake', price: 219, points: 15, badge: 'Popular', image: '/images/products/Lotus_Biscoff_Pancake.jpg', desc: 'Vanilla mini pancakes with lotus biscoff spread and cookie crumble.', feat: 0, best: 0 },
      { id: 'p-20', cat: 'cat-3', name: 'Kitkat Pancake', price: 169, points: 10, badge: '', image: '/images/products/Kitkat_Pancake.jpg', desc: 'Fluffy warm bite-sized mini pancakes topped with crushed Kitkat chocolate wafers.', feat: 0, best: 0 },
      { id: 'p-21', cat: 'cat-3', name: 'Nutty Nutella Pancake', price: 199, points: 12, badge: '', image: '/images/products/Nutty_Nutella_Pancake.jpg', desc: 'Warm mini pancakes smothered in rich Nutella and roasted chopped hazelnuts.', feat: 0, best: 0 },
      { id: 'p-22', cat: 'cat-3', name: 'Pistachio Nutella Pancake', price: 219, points: 15, badge: 'Chef Pick', image: '/images/products/Pistachio_Nutella_Pancake.jpg', desc: 'Dual sauce swirl of authentic Nutella and pistachio cream over fluffy mini pancakes.', feat: 1, best: 1 },
      { id: 'p-23', cat: 'cat-3', name: 'Oreo Cookies Pancake', price: 169, points: 10, badge: '', image: '/images/products/Oreo_Cookies_Pancake.jpg', desc: 'Mini pancakes showered in Oreo biscuit crumble and warm milk chocolate sauce.', feat: 0, best: 0 },

      // 4. Brownies
      { id: 'p-24', cat: 'cat-4', name: 'Triple Chocolate Brownie', price: 130, points: 8, badge: 'Classic', image: '/images/products/Triple_Chocolate_Brownie.jpg', desc: 'Fudgy, dense brownie baked with dark, milk, and white chocolate chunks.', feat: 0, best: 0 },
      { id: 'p-25', cat: 'cat-4', name: 'Nuts Brownie', price: 139, points: 8, badge: '', image: '/images/products/Nuts_Brownie.jpg', desc: 'Rich chocolate brownie loaded with roasted walnuts and cashews for a nutty crunch.', feat: 0, best: 0 },
      { id: 'p-26', cat: 'cat-4', name: 'Kitkat Brownie', price: 149, points: 10, badge: '', image: '/images/products/Kitkat_Brownie.jpg', desc: 'Warm fudgy brownie crowned with crispy chocolate-coated Kitkat pieces.', feat: 0, best: 0 },
      { id: 'p-27', cat: 'cat-4', name: 'Oreo Brownie', price: 149, points: 10, badge: '', image: '/images/products/Oreo_Brownie.jpg', desc: 'Dark cocoa brownie baked with whole Oreo cookies and smooth chocolate drizzle.', feat: 0, best: 0 },
      { id: 'p-28', cat: 'cat-4', name: 'Biscoff Choco Brownie', price: 199, points: 15, badge: 'Popular', image: '/images/products/Biscoff_Choco_Brownie.jpg', desc: 'Signature chocolate brownie swirled with molten Lotus Biscoff spread and biscuit crumb.', feat: 1, best: 1 },
      { id: 'p-29', cat: 'cat-4', name: 'Kinder Joy Bowl', price: 199, points: 15, badge: 'Special', image: '/images/products/Kinder_Joy_Bowl.jpg', desc: 'Warm brownie cubes served in a bowl topped with Kinder Joy chocolate creams and sprinkles.', feat: 0, best: 0 },

      // 5. Bomboloni
      { id: 'p-30', cat: 'cat-5', name: 'Choco Bomboloni', price: 139, points: 8, badge: 'Fresh', image: '/images/products/Choco_Bomboloni.jpg', desc: 'Italian-style soft, sugar-dusted artisanal doughnut bursting with molten Belgian chocolate.', feat: 0, best: 0 },
      { id: 'p-31', cat: 'cat-5', name: 'Nutella Bomboloni', price: 189, points: 12, badge: 'Bestseller', image: '/images/products/Nutella_Bombolon.jpg', desc: 'Pillow-soft Italian doughnut filled to the brim with creamy hazelnut Nutella.', feat: 0, best: 0 },
      { id: 'p-32', cat: 'cat-5', name: 'Biscoff Bomboloni', price: 219, points: 15, badge: 'Chef Pick', image: '/images/products/Biscoff_Bomboloni.jpg', desc: 'Golden fluffy doughnut filled with smooth spiced Lotus Biscoff cream.', feat: 0, best: 0 },

      // 6. Cakes
      { id: 'p-33', cat: 'cat-6', name: 'Matilda Cake', price: 289, points: 20, badge: 'Signature Showstopper', image: '/images/products/Matilda_Cake.jpg', desc: 'Legendary multi-layer deep dark chocolate fudge cake with silky chocolate ganache frosting.', feat: 1, best: 1 },
      { id: 'p-34', cat: 'cat-6', name: 'Burnt Basque Cheese Cake', price: 289, points: 20, badge: 'Masterpiece', image: '/images/products/Burnt_Basque_Cheese_Cake.jpg', desc: 'Caramelized burnt exterior with an ultra-creamy, molten custard-like cheesecake center.', feat: 1, best: 1 },

      // 7. Cheese Cake
      { id: 'p-35', cat: 'cat-7', name: 'Lotus Biscoff Cheese Cake', price: 239, points: 15, badge: 'Bestseller', image: '/images/products/Lotus_Biscoff_Cheese_Cake.jpg', desc: 'Creamy New York style cheesecake set over a buttery Lotus Biscoff biscuit crust.', feat: 0, best: 1 },
      { id: 'p-36', cat: 'cat-7', name: 'Chocolate Cheese Cake', price: 239, points: 15, badge: '', image: '/images/products/Chocolate_Cheese_Cake.jpg', desc: 'Velvety dark chocolate infused cream cheese slice topped with chocolate shavings.', feat: 0, best: 0 },
      { id: 'p-37', cat: 'cat-7', name: 'Nutella Cheese Cake', price: 239, points: 15, badge: '', image: '/images/products/Nutella_Cheese_Cake.jpg', desc: 'Rich Nutella marble cheesecake layered with roasted hazelnut butter biscuit base.', feat: 0, best: 0 },
      { id: 'p-38', cat: 'cat-7', name: 'Blueberry Cheesecake', price: 239, points: 15, badge: 'Fruit Classic', image: '/images/products/Blueberry_Cheesecake.jpg', desc: 'Classic creamy cheesecake topped with luscious wild blueberry compote.', feat: 0, best: 0 },

      // 8. Tiramisu
      { id: 'p-39', cat: 'cat-8', name: 'Tiramisu', price: 249, points: 18, badge: 'Authentic', image: '/images/products/Tiramisu.jpg', desc: 'Espresso-soaked ladyfinger biscuits layered with airy mascarpone cream and dusted with fine cocoa.', feat: 0, best: 0 },

      // 9. Buns
      { id: 'p-40', cat: 'cat-9', name: 'Korean Cheese Bun', price: 149, points: 10, badge: 'Savoury Sweet Icon', image: '/images/products/Korean_Cheese_Bun.jpg', desc: 'Soft pull-apart brioche bun stuffed with sweet cream cheese and soaked in garlic butter glaze.', feat: 1, best: 0 },

      // 10. Tresleches
      { id: 'p-41', cat: 'cat-10', name: 'Classic Tresleches', price: 149, points: 10, badge: 'Classic', image: '/images/products/Classic_Tresleches.jpg', desc: 'Ultra-moist sponge cake soaked in a rich blend of three milks and topped with light whipped cream.', feat: 0, best: 0 },
      { id: 'p-42', cat: 'cat-10', name: 'Rose Tresleches', price: 159, points: 10, badge: '', image: '/images/products/Rose_Tresleches.jpg', desc: 'Aromatic three-milk soaked sponge infused with Damascus rose water and dried rose petals.', feat: 0, best: 0 },
      { id: 'p-43', cat: 'cat-10', name: 'Pistachio Tresleches', price: 169, points: 12, badge: 'Signature', image: '/images/products/Pistachio_Tresleches.jpg', desc: 'Delicate sponge soaked in fragrant pistachio milk and topped with crushed green pistachios.', feat: 0, best: 0 },
    ]

    const insertProd = db.prepare(`
      INSERT INTO products (id, category_id, name, price, royalty_points, description, badge, image, is_available, is_featured, is_bestseller, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const p of initialProducts) {
      insertProd.run(p.id, p.cat, p.name, p.price, p.points, p.desc, p.badge, p.image, 1, p.feat, p.best, now)
    }
  }

  // 5. Seed Rewards
  const rewardCount = db.prepare('SELECT COUNT(*) as count FROM rewards').get().count
  if (rewardCount === 0) {
    const initialRewards = [
      { id: 'rew-1', name: '₹50 OFF Your Order', description: 'Redeem 500 Royalty Points for ₹50 discount on orders above ₹299.', points: 500, type: 'FIXED', value: 50, minOrder: 299 },
      { id: 'rew-2', name: '₹120 OFF Your Order', description: 'Redeem 1,000 Royalty Points for ₹120 discount on orders above ₹500.', points: 1000, type: 'FIXED', value: 120, minOrder: 500 },
      { id: 'rew-3', name: '₹300 OFF Your Order', description: 'Redeem 2,000 Royalty Points for ₹300 discount on orders above ₹1,000.', points: 2000, type: 'FIXED', value: 300, minOrder: 1000 },
    ]

    const insertReward = db.prepare(`
      INSERT INTO rewards (id, name, description, points_required, discount_type, discount_value, min_order_value, is_active, validity_days, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 30, ?)
    `)

    for (const r of initialRewards) {
      insertReward.run(r.id, r.name, r.description, r.points, r.type, r.value, r.minOrder, now)
    }
  }
}
