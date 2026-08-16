import bcrypt from 'bcryptjs'
import {
  Admin,
  Category,
  Product,
  StoreSetting,
  Reward,
} from './index.js'

export async function seedDefaultData() {
  const now = new Date().toISOString()

  // 1. Seed Store Settings
  const deliverySetting = await StoreSetting.findOne({ key: 'delivery' })
  if (!deliverySetting) {
    await StoreSetting.create({
      key: 'delivery',
      value: { standardCharge: 40, freeThreshold: 500, enabled: true, minOrder: 0 },
      updated_at: now,
    })
  }

  const promoSetting = await StoreSetting.findOne({ key: 'promotions' })
  if (!promoSetting) {
    await StoreSetting.create({
      key: 'promotions',
      value: { firstOrderOfferEnabled: true, firstOrderDiscount: 20, minOrder: 0 },
      updated_at: now,
    })
  }

  const bizSetting = await StoreSetting.findOne({ key: 'business' })
  const officialBizData = {
    name: "Choco D'or",
    tagline: "A Little Luxury In Every Bite",
    location: "Krishnagiri",
    phone: "+91 94880 54036",
    email: "contact@chocodor.com",
    address: "Royakottai flyover, near SBI Bank, Londenpet, Krishnagiri, Bayanapalli, Tamil Nadu 635001",
    enableGst: false,
    gst: "33ADEPA2229C2ZG",
    fssai: "22418107000384",
  }

  if (!bizSetting) {
    await StoreSetting.create({
      key: 'business',
      value: officialBizData,
      updated_at: now,
    })
  } else {
    await StoreSetting.updateOne({ key: 'business' }, { value: officialBizData, updated_at: now })
  }

  // 2. Seed Admin & Staff Accounts
  const adminCheck = await Admin.findOne({ email: 'admin@chocodor.com' })
  if (!adminCheck) {
    const passwordHash = bcrypt.hashSync('chocodor2026', 10)
    await Admin.create({
      id: 'admin-1',
      name: "Choco D'or Admin",
      email: 'admin@chocodor.com',
      password_hash: passwordHash,
      role: 'SUPER_ADMIN',
      pin: '1234',
      created_at: now,
    })
  }

  const staffCheck = await Admin.findOne({ email: 'pos@chocodor.com' })
  if (!staffCheck) {
    const passwordHash = bcrypt.hashSync('pos2026', 10)
    await Admin.create({
      id: 'staff-pos-1',
      name: 'Billing Counter 1',
      email: 'pos@chocodor.com',
      password_hash: passwordHash,
      role: 'BILLING_STAFF',
      pin: '1111',
      created_at: now,
    })
  }

  const kitchenCheck = await Admin.findOne({ email: 'kitchen@chocodor.com' })
  if (!kitchenCheck) {
    const passwordHash = bcrypt.hashSync('kitchen2026', 10)
    await Admin.create({
      id: 'staff-kitchen-1',
      name: 'Kitchen Display Station',
      email: 'kitchen@chocodor.com',
      password_hash: passwordHash,
      role: 'KITCHEN_STAFF',
      pin: '2222',
      created_at: now,
    })
  }

  // 3. Seed Categories
  const categoryCount = await Category.countDocuments()
  if (categoryCount === 0) {
    const initialCategories = [
      { id: 'cat-1', slug: 'lalban', name: 'Lalban', color: '#C9B8D9', sort_order: 1, is_active: 1 },
      { id: 'cat-2', slug: 'waffles', name: 'Waffles', color: '#F0C14B', sort_order: 2, is_active: 1 },
      { id: 'cat-3', slug: 'mini-pancakes', name: 'Mini Pancakes', color: '#A8C4D9', sort_order: 3, is_active: 1 },
      { id: 'cat-4', slug: 'brownies', name: 'Brownies', color: '#E8A060', sort_order: 4, is_active: 1 },
      { id: 'cat-5', slug: 'bomboloni', name: 'Bomboloni', color: '#C4BFB8', sort_order: 5, is_active: 1 },
      { id: 'cat-6', slug: 'cakes', name: 'Cakes', color: '#F9D5A7', sort_order: 6, is_active: 1 },
      { id: 'cat-7', slug: 'cheesecake', name: 'Cheese Cake', color: '#FBE4B8', sort_order: 7, is_active: 1 },
      { id: 'cat-8', slug: 'tiramisu', name: 'Tiramisu', color: '#D6C0B3', sort_order: 8, is_active: 1 },
      { id: 'cat-9', slug: 'buns', name: 'Buns', color: '#E8D5BD', sort_order: 9, is_active: 1 },
      { id: 'cat-10', slug: 'tresleches', name: 'Tresleches', color: '#D4E2D4', sort_order: 10, is_active: 1 },
    ]

    await Category.insertMany(initialCategories)
  }

  // 4. Seed 43 Official Krishnagiri Menu Products
  const productCount = await Product.countDocuments()
  if (productCount === 0) {
    const initialProducts = [
      // 1. Lalban
      { id: 'p-1', category_id: 'cat-1', name: 'Pistachio Salankatia', price: 359, royalty_points: 25, badge: 'Popular', image: '/images/products/Pistachio_Salankatia.jpg', description: 'Signature crispy pastry layered with rich pistachio cream and crushed roasted pistachios.', is_featured: 1, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-2', category_id: 'cat-1', name: 'Biscoff Salankatia', price: 359, royalty_points: 25, badge: 'Bestseller', image: '/images/products/Biscoff_Salankatia.jpg', description: 'Decadent layered Salankatia drenched in caramelized Lotus Biscoff spread and cookie crumbs.', is_featured: 1, is_bestseller: 1, is_available: 1, created_at: now },
      { id: 'p-3', category_id: 'cat-1', name: 'Nutella Salankatia', price: 359, royalty_points: 25, badge: 'Signature', image: '/images/products/Nutella_Salankatia.jpg', description: 'Golden flaky layers filled and drizzled generously with authentic creamy Nutella.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-4', category_id: 'cat-1', name: 'Pistachio + Biscoff Salankatia', price: 389, royalty_points: 30, badge: 'Chef Special', image: '/images/products/Pistachio_+_Biscoff_Salankatia.jpg', description: 'Dual delight combining nutty roasted pistachio and spiced Lotus Biscoff spread.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-5', category_id: 'cat-1', name: 'Pistachio + Nutella Salankatia', price: 389, royalty_points: 30, badge: 'Special', image: '/images/products/Pistachio_+_Nutella_Salankatia.jpg', description: 'A heavenly pairing of velvety Nutella hazelnut and rich pistachio cream.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-6', category_id: 'cat-1', name: 'Biscoff + Nutella Salankatia', price: 389, royalty_points: 30, badge: 'Must Try', image: '/images/products/Biscoff_+_Nutella_Salankatia.jpg', description: 'The ultimate indulgent combination of Lotus Biscoff crunch and creamy Nutella.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-7', category_id: 'cat-1', name: 'Pistachio + Biscoff + Nutella Salankatia', price: 399, royalty_points: 35, badge: 'Supreme', image: '/images/products/Pistachio_+_Biscoff_+_Nutella_Salankatia.jpg', description: 'Triple supreme loaded with Pistachio, Lotus Biscoff, and Nutella across flaky golden layers.', is_featured: 1, is_bestseller: 1, is_available: 1, created_at: now },

      // 2. Waffles
      { id: 'p-8', category_id: 'cat-2', name: 'Triple Chocolate Waffle', price: 169, royalty_points: 10, badge: 'Bestseller', image: '/images/products/Triple_Chocolate_Waffle.jpg', description: 'A waffle loaded with three layers of chocolate goodness, perfect for sweet cravings.', is_featured: 1, is_bestseller: 1, is_available: 1, created_at: now },
      { id: 'p-9', category_id: 'cat-2', name: 'Lotus Biscoff Waffle', price: 229, royalty_points: 15, badge: 'Chef Pick', image: '/images/products/Lotus_Biscoff_Waffle.jpg', description: 'Vanilla waffle covered with white chocolate and lotus biscoff bits with famous biscoff icecream.', is_featured: 1, is_bestseller: 1, is_available: 1, created_at: now },
      { id: 'p-10', category_id: 'cat-2', name: 'Oreo Waffle', price: 169, royalty_points: 10, badge: '', image: '/images/products/Oreo_Waffle.jpg', description: 'A warm, crispy waffle with the chocolate crunch of Oreo in every bite.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-11', category_id: 'cat-2', name: 'Kitkat Waffle', price: 169, royalty_points: 10, badge: '', image: '/images/products/Kitkat_Waffle.jpg', description: 'A crispy waffle topped with the chocolatey goodness of Kitkat, perfect for sweet cravings.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-12', category_id: 'cat-2', name: 'Nutty Nutella Waffle', price: 219, royalty_points: 15, badge: 'Popular', image: '/images/products/Nutty_Nutella_Waffle.jpg', description: 'A warm waffle loaded with creamy Nutella and a nutty hazelnut twist in every bite.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-13', category_id: 'cat-2', name: 'Butterscotch Waffle', price: 179, royalty_points: 10, badge: '', image: '/images/products/Butterscotch_Waffle.jpg', description: 'Soft and buttery waffle with a classic butterscotch twist for a sweet treat.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-14', category_id: 'cat-2', name: 'Dead By Chocolate', price: 169, royalty_points: 10, badge: 'Intense', image: '/images/products/Dead_By_Chocolate.jpg', description: 'Intense dark chocolate waffle infused with melted chocolate ganache and cocoa crunch.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-15', category_id: 'cat-2', name: 'White Choco Pistachio Waffle', price: 219, royalty_points: 15, badge: '', image: '/images/products/White_Choco_Pistachio_Waffle.jpg', description: 'Warm crispy waffle drenched in velvety white chocolate sauce and toasted pistachio slivers.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-16', category_id: 'cat-2', name: 'Kinder Joy Waffle', price: 229, royalty_points: 15, badge: '', image: '/images/products/Kinder_Joy_Waffle.jpg', description: 'Playful waffle topped with Kinder chocolate cream, crispy wafers, and sweet creamy drizzle.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-17', category_id: 'cat-2', name: 'Kiki & Oreo Cream Waffle', price: 229, royalty_points: 15, badge: '', image: '/images/products/Kiki_&_Oreo_Cream_Waffle.jpg', description: 'Crispy golden waffle topped with Oreo cookie crunch and signature velvety cream.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },

      // 3. Mini Pancakes
      { id: 'p-18', category_id: 'cat-3', name: 'Triple Chocolate', price: 139, royalty_points: 10, badge: 'Bestseller', image: '/images/products/Triple_Chocolate.jpg', description: 'A rich and satisfying chocolate treat for all the dessert lovers out there.', is_featured: 1, is_bestseller: 1, is_available: 1, created_at: now },
      { id: 'p-19', category_id: 'cat-3', name: 'Lotus Biscoff Pancake', price: 219, royalty_points: 15, badge: 'Popular', image: '/images/products/Lotus_Biscoff_Pancake.jpg', description: 'Vanilla mini pancakes with lotus biscoff spread and cookie crumble.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-20', category_id: 'cat-3', name: 'Kitkat Pancake', price: 169, royalty_points: 10, badge: '', image: '/images/products/Kitkat_Pancake.jpg', description: 'Fluffy warm bite-sized mini pancakes topped with crushed Kitkat chocolate wafers.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-21', category_id: 'cat-3', name: 'Nutty Nutella Pancake', price: 199, royalty_points: 12, badge: '', image: '/images/products/Nutty_Nutella_Pancake.jpg', description: 'Warm mini pancakes smothered in rich Nutella and roasted chopped hazelnuts.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-22', category_id: 'cat-3', name: 'Butterscotch Pancake', price: 169, royalty_points: 10, badge: '', image: '/images/products/Butterscotch_Pancake.jpg', description: 'Fluffy mini pancakes drizzled with golden butterscotch sauce and crunchy praline.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-23', category_id: 'cat-3', name: 'Pistachio Pancake', price: 219, royalty_points: 15, badge: 'Special', image: '/images/products/Pistachio_Pancake.jpg', description: 'Bite-sized pancakes generously coated with smooth pistachio cream and roasted nuts.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-24', category_id: 'cat-3', name: 'White Choco Pistachio Pancake', price: 219, royalty_points: 15, badge: '', image: '/images/products/White_Choco_Pistachio_Pancake.jpg', description: 'Fluffy pancakes layered with melted white chocolate and aromatic pistachio crumbs.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-25', category_id: 'cat-3', name: 'Kinder Joy Pancake', price: 219, royalty_points: 15, badge: '', image: '/images/products/Kinder_Joy_Pancake.jpg', description: 'Fun mini pancake bites drenched in sweet Kinder milk and cocoa hazelnut cream.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },

      // 4. Brownies
      { id: 'p-26', category_id: 'cat-4', name: 'Brownie With Ice Cream', price: 149, royalty_points: 10, badge: 'Classic', image: '/images/products/Brownie_With_Ice_Cream.jpg', description: 'Fudgy, melt-in-mouth warm chocolate brownie served with a scoop of premium vanilla bean ice cream.', is_featured: 1, is_bestseller: 1, is_available: 1, created_at: now },
      { id: 'p-27', category_id: 'cat-4', name: 'Triple Chocolate Brownie', price: 179, royalty_points: 12, badge: 'Bestseller', image: '/images/products/Triple_Chocolate_Brownie.jpg', description: 'Dense fudge brownie loaded with dark, milk, and white chocolate chunks for extreme chocolate craving.', is_featured: 1, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-28', category_id: 'cat-4', name: 'Sizzler Brownie', price: 249, royalty_points: 18, badge: 'Must Try', image: '/images/products/Sizzler_Brownie.jpg', description: 'Served sizzling hot on a cast-iron skillet with a scoop of ice cream and flowing hot chocolate fudge.', is_featured: 1, is_bestseller: 1, is_available: 1, created_at: now },
      { id: 'p-29', category_id: 'cat-4', name: 'Nutella Brownie', price: 189, royalty_points: 12, badge: '', image: '/images/products/Nutella_Brownie.jpg', description: 'Warm baked chocolate brownie topped with thick creamy Nutella and crunchy hazelnuts.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-30', category_id: 'cat-4', name: 'Nutella Brownie Sizzler', price: 269, royalty_points: 20, badge: 'Special', image: '/images/products/Nutella_Brownie_Sizzler.jpg', description: 'Sizzling hot platter with fudgy brownie, vanilla ice cream, and bubbling hot Nutella glaze.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-31', category_id: 'cat-4', name: 'Lotus Biscoff Brownie', price: 189, royalty_points: 12, badge: 'Popular', image: '/images/products/Lotus_Biscoff_Brownie.jpg', description: 'Decadent chocolate brownie slathered with spiced Lotus Biscoff spread and biscuit crumb.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-32', category_id: 'cat-4', name: 'Lotus Biscoff Sizzler', price: 269, royalty_points: 20, badge: 'Chef Special', image: '/images/products/Lotus_Biscoff_Sizzler.jpg', description: 'The sensational sizzler experience combining hot caramelized Biscoff sauce and cool vanilla ice cream.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },

      // 5. Bomboloni
      { id: 'p-33', category_id: 'cat-5', name: 'Triple Chocolate Bomboloni', price: 149, royalty_points: 10, badge: 'Popular', image: '/images/products/Triple_Chocolate_Bomboloni.jpg', description: 'Italian filled doughnut coated in fine sugar and packed to the brim with rich chocolate custard.', is_featured: 1, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-34', category_id: 'cat-5', name: 'Nutella Bomboloni', price: 149, royalty_points: 10, badge: 'Bestseller', image: '/images/products/Nutella_Bomboloni.jpg', description: 'Fluffy golden Italian doughnut exploding with velvety authentic Nutella filling.', is_featured: 0, is_bestseller: 1, is_available: 1, created_at: now },
      { id: 'p-35', category_id: 'cat-5', name: 'Lotus Biscoff Bomboloni', price: 149, royalty_points: 10, badge: '', image: '/images/products/Lotus_Biscoff_Bomboloni.jpg', description: 'Pillowy soft Italian doughnut stuffed generously with smooth caramelized Biscoff cream.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-36', category_id: 'cat-5', name: 'Pistachio Bomboloni', price: 149, royalty_points: 10, badge: 'Signature', image: '/images/products/Pistachio_Bomboloni.jpg', description: 'Artisanal Italian doughnut filled with luxurious nutty Sicilian pistachio pastry cream.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },

      // 6. Cakes
      { id: 'p-37', category_id: 'cat-6', name: 'Matilda Cake', price: 239, royalty_points: 18, badge: 'Signature', image: '/images/products/Matilda_Cake.jpg', description: 'Inspired by the classic movie: ultra-rich, deeply decadent multi-layer chocolate fudge cake with silky chocolate ganache.', is_featured: 1, is_bestseller: 1, is_available: 1, created_at: now },

      // 7. Cheese Cake
      { id: 'p-38', category_id: 'cat-7', name: 'San Sebastian Cheese Cake', price: 259, royalty_points: 20, badge: 'Bestseller', image: '/images/products/San_Sebastian_Cheese_Cake.jpg', description: 'Authentic Basque burnt cheesecake with a caramelized, deeply roasted exterior and a molten, ultra-creamy center.', is_featured: 1, is_bestseller: 1, is_available: 1, created_at: now },

      // 8. Tiramisu
      { id: 'p-39', category_id: 'cat-8', name: 'Tiramisu', price: 249, royalty_points: 18, badge: 'Classic', image: '/images/products/Tiramisu.jpg', description: 'Classic Italian dessert crafted with espresso-soaked ladyfingers, velvety mascarpone cream, and Dutch cocoa dust.', is_featured: 1, is_bestseller: 0, is_available: 1, created_at: now },

      // 9. Buns
      { id: 'p-40', category_id: 'cat-9', name: 'Coffee Bun', price: 129, royalty_points: 8, badge: 'Fresh Baked', image: '/images/products/Coffee_Bun.jpg', description: 'Aromatic Rotiboy-style bun with a crispy coffee-caramel crust and warm, melting buttery center.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },

      // 10. Tresleches
      { id: 'p-41', category_id: 'cat-10', name: 'Pistachio Tresleches', price: 239, royalty_points: 18, badge: 'Popular', image: '/images/products/Pistachio_Tresleches.jpg', description: 'Spongy Mexican milk cake soaked in a rich three-milk pistachio bath, crowned with roasted pistachios.', is_featured: 1, is_bestseller: 0, is_available: 1, created_at: now },
      { id: 'p-42', category_id: 'cat-10', name: 'Lotus Biscoff Tresleches', price: 239, royalty_points: 18, badge: 'Bestseller', image: '/images/products/Lotus_Biscoff_Tresleches.jpg', description: 'Ultra-moist sponge cake soaked in spiced Biscoff-infused milk and finished with caramelized cream.', is_featured: 1, is_bestseller: 1, is_available: 1, created_at: now },
      { id: 'p-43', category_id: 'cat-10', name: 'Rose Tresleches', price: 219, royalty_points: 15, badge: 'Special', image: '/images/products/Rose_Tresleches.jpg', description: 'Delicately scented rose milk sponge infused with saffron, cardamom, and edible rose petals.', is_featured: 0, is_bestseller: 0, is_available: 1, created_at: now },
    ]

    await Product.insertMany(initialProducts)
  }

  // 5. Seed Rewards Catalog
  const rewardCount = await Reward.countDocuments()
  if (rewardCount === 0) {
    const initialRewards = [
      {
        id: 'rew-1',
        name: '₹50 OFF Your Order',
        description: 'Enjoy a flat ₹50 discount on any delicious dessert order.',
        points_required: 500,
        discount_type: 'FIXED',
        discount_value: 50,
        min_order_value: 199,
        is_active: 1,
        validity_days: 30,
        created_at: now,
      },
      {
        id: 'rew-2',
        name: '₹100 OFF Luxury Treat',
        description: 'Get ₹100 OFF your confectionery order above ₹349.',
        points_required: 900,
        discount_type: 'FIXED',
        discount_value: 100,
        min_order_value: 349,
        is_active: 1,
        validity_days: 45,
        created_at: now,
      },
      {
        id: 'rew-3',
        name: '₹200 OFF Grand Indulgence',
        description: 'Unlock ₹200 OFF on full bakery boxes and party platters above ₹599.',
        points_required: 1600,
        discount_type: 'FIXED',
        discount_value: 200,
        min_order_value: 599,
        is_active: 1,
        validity_days: 60,
        created_at: now,
      },
    ]

    await Reward.insertMany(initialRewards)
  }
}
