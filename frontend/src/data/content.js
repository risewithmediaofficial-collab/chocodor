export const brand = {
  name: "Choco D'or",
  tagline: "A Little Luxury In Every Bite.",
  location: "Krishnagiri",
  instagram: 'https://instagram.com/choco.dor_',
  instagramHandle: '@choco.dor_',
}

export const navLinks = [
  { label: 'Shop', to: '/shop' },
  { label: 'Our Story', to: '/story' },
  { label: 'Royalty', to: '/royalty' },
]

export const categories = [
  { name: 'Lalban', count: 7, color: '#C9B8D9' },
  { name: 'Waffles', count: 10, color: '#F0C14B' },
  { name: 'Mini Pancakes', count: 6, color: '#A8C4D9' },
  { name: 'Brownies', count: 6, color: '#E8A060' },
  { name: 'Bomboloni', count: 3, color: '#C4BFB8' },
  { name: 'Cakes', count: 2, color: '#F9D5A7' },
  { name: 'Cheesecake', count: 4, color: '#FBE4B8' },
  { name: 'Tresleches', count: 3, color: '#D4E2D4' },
  { name: 'Tiramisu', count: 1, color: '#D6C0B3' },
  { name: 'Buns', count: 1, color: '#E8D5BD' },
]

export const allProducts = [
  // 1. Lalban
  {
    id: 'lalban-1',
    name: 'Pistachio Salankatia',
    category: 'Lalban',
    price: 359,
    description: 'Signature crispy pastry layered with rich pistachio cream and crushed roasted pistachios.',
    badge: 'Popular',
    image: '/images/products/Pistachio_Salankatia.jpg',
  },
  {
    id: 'lalban-2',
    name: 'Biscoff Salankatia',
    category: 'Lalban',
    price: 359,
    description: 'Decadent layered Salankatia drenched in caramelized Lotus Biscoff spread and cookie crumbs.',
    badge: 'Bestseller',
    image: '/images/products/Biscoff_Salankatia.jpg',
  },
  {
    id: 'lalban-3',
    name: 'Nutella Salankatia',
    category: 'Lalban',
    price: 359,
    description: 'Golden flaky layers filled and drizzled generously with authentic creamy Nutella.',
    badge: 'Signature',
    image: '/images/products/Nutella_Salankatia.jpg',
  },
  {
    id: 'lalban-4',
    name: 'Pistachio + Biscoff Salankatia',
    category: 'Lalban',
    price: 389,
    description: 'Dual delight combining nutty roasted pistachio and spiced Lotus Biscoff spread.',
    badge: 'Chef Special',
    image: '/images/products/Pistachio_+_Biscoff_Salankatia.jpg',
  },
  {
    id: 'lalban-5',
    name: 'Pistachio + Nutella Salankatia',
    category: 'Lalban',
    price: 389,
    description: 'A heavenly pairing of velvety Nutella hazelnut and rich pistachio cream.',
    badge: 'Special',
    image: '/images/products/Pistachio_+_Nutella_Salankatia.jpg',
  },
  {
    id: 'lalban-6',
    name: 'Biscoff + Nutella Salankatia',
    category: 'Lalban',
    price: 389,
    description: 'The ultimate indulgent combination of Lotus Biscoff crunch and creamy Nutella.',
    badge: 'Must Try',
    image: '/images/products/Biscoff_+_Nutella_Salankatia.jpg',
  },
  {
    id: 'lalban-7',
    name: 'Pistachio + Biscoff + Nutella Salankatia',
    category: 'Lalban',
    price: 399,
    description: 'Triple supreme loaded with Pistachio, Lotus Biscoff, and Nutella across flaky golden layers.',
    badge: 'Supreme',
    image: '/images/products/Pistachio_+_Biscoff_+_Nutella_Salankatia.jpg',
  },

  // 2. Waffles
  {
    id: 'waffle-1',
    name: 'Triple Chocolate Waffle',
    category: 'Waffles',
    price: 169,
    description: 'A waffle loaded with three layers of chocolate goodness, perfect for sweet cravings.',
    badge: 'Bestseller',
    image: '/images/products/Triple_Chocolate_Waffle.jpg',
  },
  {
    id: 'waffle-2',
    name: 'Lotus Biscoff Waffle',
    category: 'Waffles',
    price: 229,
    description: 'Vanilla waffle covered with white chocolate and lotus biscoff bits with famous biscoff icecream.',
    badge: 'Chef Pick',
    image: '/images/products/Lotus_Biscoff_Waffle.jpg',
  },
  {
    id: 'waffle-3',
    name: 'Oreo Waffle',
    category: 'Waffles',
    price: 169,
    description: 'A warm, crispy waffle with the chocolate crunch of Oreo in every bite.',
    image: '/images/products/Oreo_Waffle.jpg',
  },
  {
    id: 'waffle-4',
    name: 'Kitkat Waffle',
    category: 'Waffles',
    price: 169,
    description: 'A crispy waffle topped with the chocolatey goodness of Kitkat, perfect for sweet cravings.',
    image: '/images/products/Kitkat_Waffle.jpg',
  },
  {
    id: 'waffle-5',
    name: 'Nutty Nutella Waffle',
    category: 'Waffles',
    price: 219,
    description: 'A warm waffle loaded with creamy Nutella and a nutty hazelnut twist in every bite.',
    badge: 'Popular',
    image: '/images/products/Nutty_Nutella_Waffle.jpg',
  },
  {
    id: 'waffle-6',
    name: 'Butterscotch Waffle',
    category: 'Waffles',
    price: 179,
    description: 'Soft and buttery waffle with a classic butterscotch twist for a sweet treat.',
    image: '/images/products/Butterscotch_Waffle.jpg',
  },
  {
    id: 'waffle-7',
    name: 'Dead By Chocolate Waffle',
    category: 'Waffles',
    price: 169,
    description: 'Intense dark chocolate waffle infused with melted chocolate ganache and cocoa crunch.',
    badge: 'Intense',
    image: '/images/chocolate_bar.jpg',
  },
  {
    id: 'waffle-8',
    name: 'White Choco Pistachio Waffle',
    category: 'Waffles',
    price: 219,
    description: 'Warm crispy waffle drenched in velvety white chocolate sauce and toasted pistachio slivers.',
    image: '/images/products/White_Choco_Pistachio_Waffle.jpg',
  },
  {
    id: 'waffle-9',
    name: 'Kinder Joy Waffle',
    category: 'Waffles',
    price: 229,
    description: 'Playful waffle topped with Kinder chocolate cream, crispy wafers, and sweet creamy drizzle.',
    image: '/images/products/Kinder_Joy_Waffle.jpg',
  },
  {
    id: 'waffle-10',
    name: 'Kiki & Oreo Cream Waffle',
    category: 'Waffles',
    price: 229,
    description: 'Crispy golden waffle topped with Oreo cookie crunch and signature velvety cream.',
    image: '/images/products/Kiki_&_Oreo_Cream_Waffle.jpg',
  },

  // 3. Mini Pancakes
  {
    id: 'pancake-1',
    name: 'Triple Chocolate Mini Pancakes',
    category: 'Mini Pancakes',
    price: 139,
    description: 'A rich and satisfying chocolate treat for all the dessert lovers out there.',
    badge: 'Bestseller',
    image: '/images/hero_chocolate.jpg',
  },
  {
    id: 'pancake-2',
    name: 'Lotus Biscoff Mini Pancakes',
    category: 'Mini Pancakes',
    price: 219,
    description: 'Vanilla mini pancakes with lotus biscoff spread and cookie crumble.',
    badge: 'Popular',
    image: '/images/chocolate_truffles_stack.jpg',
  },
  {
    id: 'pancake-3',
    name: 'Kitkat Mini Pancakes',
    category: 'Mini Pancakes',
    price: 169,
    description: 'Fluffy warm bite-sized mini pancakes topped with crushed Kitkat chocolate wafers.',
    image: '/images/chocolate_bar.jpg',
  },
  {
    id: 'pancake-4',
    name: 'Nutty Nutella Mini Pancakes',
    category: 'Mini Pancakes',
    price: 199,
    description: 'Warm mini pancakes smothered in rich Nutella and roasted chopped hazelnuts.',
    image: '/images/hero_chocolate.jpg',
  },
  {
    id: 'pancake-5',
    name: 'Pistachio Nutella Mini Pancakes',
    category: 'Mini Pancakes',
    price: 219,
    description: 'Dual sauce swirl of authentic Nutella and pistachio cream over fluffy mini pancakes.',
    badge: 'Chef Pick',
    image: '/images/chocolate_gift_box.jpg',
  },
  {
    id: 'pancake-6',
    name: 'Oreo Cookies Mini Pancakes',
    category: 'Mini Pancakes',
    price: 169,
    description: 'Mini pancakes showered in Oreo biscuit crumble and warm milk chocolate sauce.',
    image: '/images/chocolate_truffles_stack.jpg',
  },

  // 4. Brownies
  {
    id: 'brownie-1',
    name: 'Triple Chocolate Brownie',
    category: 'Brownies',
    price: 130,
    description: 'Fudgy, dense brownie baked with dark, milk, and white chocolate chunks.',
    badge: 'Classic',
    image: '/images/products/Triple_Chocolate_Brownie.jpg',
  },
  {
    id: 'brownie-2',
    name: 'Nuts Brownie',
    category: 'Brownies',
    price: 139,
    description: 'Rich chocolate brownie loaded with roasted walnuts and cashews for a nutty crunch.',
    image: '/images/products/Nuts_Brownie.jpg',
  },
  {
    id: 'brownie-3',
    name: 'Kitkat Brownie',
    category: 'Brownies',
    price: 149,
    description: 'Warm fudgy brownie crowned with crispy chocolate-coated Kitkat pieces.',
    image: '/images/products/Kitkat_Brownie.jpg',
  },
  {
    id: 'brownie-4',
    name: 'Oreo Brownie',
    category: 'Brownies',
    price: 149,
    description: 'Dark cocoa brownie baked with whole Oreo cookies and smooth chocolate drizzle.',
    image: '/images/products/Oreo_Brownie.jpg',
  },
  {
    id: 'brownie-5',
    name: 'Biscoff Choco Brownie',
    category: 'Brownies',
    price: 199,
    description: 'Signature chocolate brownie swirled with molten Lotus Biscoff spread and biscuit crumb.',
    badge: 'Popular',
    image: '/images/products/Biscoff_Choco_Brownie.jpg',
  },
  {
    id: 'brownie-6',
    name: 'Kinder Joy Bowl',
    category: 'Brownies',
    price: 199,
    description: 'Warm brownie cubes served in a bowl topped with Kinder Joy chocolate creams and sprinkles.',
    badge: 'Special',
    image: '/images/products/Kinder_Joy_Bowl.jpg',
  },

  // 5. Bomboloni
  {
    id: 'bomboloni-1',
    name: 'Choco Bomboloni',
    category: 'Bomboloni',
    price: 139,
    description: 'Italian-style soft, sugar-dusted artisanal doughnut bursting with molten Belgian chocolate.',
    badge: 'Fresh',
    image: '/images/products/Choco_Bomboloni.jpg',
  },
  {
    id: 'bomboloni-2',
    name: 'Nutella Bomboloni',
    category: 'Bomboloni',
    price: 189,
    description: 'Pillow-soft Italian doughnut filled to the brim with creamy hazelnut Nutella.',
    badge: 'Bestseller',
    image: '/images/products/Nutella_Bombolon.jpg',
  },
  {
    id: 'bomboloni-3',
    name: 'Biscoff Bomboloni',
    category: 'Bomboloni',
    price: 219,
    description: 'Golden fluffy doughnut filled with smooth spiced Lotus Biscoff cream.',
    badge: 'Chef Pick',
    image: '/images/products/Biscoff_Bomboloni.jpg',
  },

  // 6. Cakes
  {
    id: 'cake-1',
    name: 'Matilda Cake',
    category: 'Cakes',
    price: 289,
    description: 'Legendary multi-layer deep dark chocolate fudge cake with silky chocolate ganache frosting.',
    badge: 'Signature Showstopper',
    image: '/images/products/Matilda_Cake.jpg',
  },
  {
    id: 'cake-2',
    name: 'Burnt Basque Cheese Cake',
    category: 'Cakes',
    price: 289,
    description: 'Caramelized burnt exterior with an ultra-creamy, molten custard-like cheesecake center.',
    badge: 'Masterpiece',
    image: '/images/products/Burnt_Basque_Cheese_Cake.jpg',
  },

  // 7. Cheesecake
  {
    id: 'cheesecake-1',
    name: 'Lotus Biscoff Cheese Cake',
    category: 'Cheesecake',
    price: 239,
    description: 'Creamy New York style cheesecake set over a buttery Lotus Biscoff biscuit crust.',
    badge: 'Bestseller',
    image: '/images/products/Lotus_Biscoff_Cheese_Cake.jpg',
  },
  {
    id: 'cheesecake-2',
    name: 'Chocolate Cheese Cake',
    category: 'Cheesecake',
    price: 239,
    description: 'Velvety dark chocolate infused cream cheese slice topped with chocolate shavings.',
    image: '/images/products/Chocolate_Cheese_Cake.jpg',
  },
  {
    id: 'cheesecake-3',
    name: 'Nutella Cheese Cake',
    category: 'Cheesecake',
    price: 239,
    description: 'Rich Nutella marble cheesecake layered with roasted hazelnut butter biscuit base.',
    image: '/images/products/Nutella_Cheese_Cake.jpg',
  },
  {
    id: 'cheesecake-4',
    name: 'Blueberry Cheesecake',
    category: 'Cheesecake',
    price: 239,
    description: 'Classic creamy cheesecake topped with luscious wild blueberry compote.',
    badge: 'Fruit Classic',
    image: '/images/products/Blueberry_Cheesecake.jpg',
  },

  // 8. Tiramisu
  {
    id: 'tiramisu-1',
    name: 'Classic Italian Tiramisu',
    category: 'Tiramisu',
    price: 249,
    description: 'Espresso-soaked ladyfinger biscuits layered with airy mascarpone cream and dusted with fine cocoa.',
    badge: 'Authentic',
    image: '/images/chocolate_bar.jpg',
  },

  // 9. Buns
  {
    id: 'bun-1',
    name: 'Korean Cheese Bun',
    category: 'Buns',
    price: 149,
    description: 'Soft pull-apart brioche bun stuffed with sweet cream cheese and soaked in garlic butter glaze.',
    badge: 'Savoury Sweet Icon',
    image: '/images/products/Korean_Cheese_Bun.jpg',
  },

  // 10. Tresleches
  {
    id: 'tresleches-1',
    name: 'Classic Tresleches',
    category: 'Tresleches',
    price: 149,
    description: 'Ultra-moist sponge cake soaked in a rich blend of three milks and topped with light whipped cream.',
    badge: 'Classic',
    image: '/images/products/Classic_Tresleches.jpg',
  },
  {
    id: 'tresleches-2',
    name: 'Rose Tresleches',
    category: 'Tresleches',
    price: 159,
    description: 'Aromatic three-milk soaked sponge infused with Damascus rose water and dried rose petals.',
    image: '/images/products/Rose_Tresleches.jpg',
  },
  {
    id: 'tresleches-3',
    name: 'Pistachio Tresleches',
    category: 'Tresleches',
    price: 169,
    description: 'Delicate sponge soaked in fragrant pistachio milk and topped with crushed green pistachios.',
    badge: 'Signature',
    image: '/images/products/Pistachio_Tresleches.jpg',
  },
]

// Signature highlights for Home page
export const signatureProducts = [
  allProducts.find((p) => p.name === 'Triple Chocolate Waffle') || allProducts[7],
  allProducts.find((p) => p.name === 'Biscoff Salankatia') || allProducts[1],
  allProducts.find((p) => p.name === 'Matilda Cake') || allProducts[28],
]

// Best Sellers for Home page
export const favouriteProducts = [
  allProducts.find((p) => p.name === 'Lotus Biscoff Waffle') || allProducts[8],
  allProducts.find((p) => p.name === 'Pistachio + Biscoff + Nutella Salankatia') || allProducts[6],
  allProducts.find((p) => p.name === 'Biscoff Choco Brownie') || allProducts[24],
  allProducts.find((p) => p.name === 'Burnt Basque Cheese Cake') || allProducts[29],
]

export const shopProducts = allProducts

export const royaltySteps = [
  {
    step: '01',
    title: 'Shop',
    text: "Enjoy your Choco D'or favourites in boutique or online.",
    icon: '🍫',
  },
  {
    step: '02',
    title: 'Earn',
    text: 'Collect Royalty points automatically on every eligible purchase.',
    icon: '✨',
  },
  {
    step: '03',
    title: 'Redeem',
    text: 'Turn your points into exclusive rewards, tastings and sweet surprises.',
    icon: '👑',
  },
]

export const footerLinks = {
  shop: [
    { label: 'Lalban', to: '/shop' },
    { label: 'Waffles & Pancakes', to: '/shop' },
    { label: 'Brownies & Cakes', to: '/shop' },
    { label: 'Cheesecakes & Tresleches', to: '/shop' },
  ],
  royalty: [
    { label: 'Royalty Card', to: '/royalty' },
    { label: 'My Rewards', to: '/royalty/rewards' },
    { label: 'My Points', to: '/royalty/points' },
    { label: 'Member Benefits', to: '/royalty' },
  ],
  help: [
    { label: 'Contact Us', to: '/contact' },
    { label: 'Delivery Information', to: '/delivery' },
    { label: 'Order Tracking', to: '/order-tracking' },
  ],
  follow: [
    { label: 'Instagram @choco.dor_', href: 'https://instagram.com/choco.dor_', external: true },
  ],
}

export function formatPrice(price) {
  if (price == null) return '₹ —'
  return `₹${price.toLocaleString('en-IN')}`
}

export const instagramImages = [
  {
    id: 'ig-1',
    src: '/images/hero_chocolate.jpg',
    alt: "Choco D'or freshly prepared Waffles and Lalban",
    caption: 'Fresh morning baking in the Choco D\'or kitchen ✨',
  },
  {
    id: 'ig-2',
    src: '/images/chocolate_gift_box.jpg',
    alt: "Choco D'or luxury Matilda Cake & packaging",
    caption: 'The art of artisanal desserts in Krishnagiri 🎁',
  },
  {
    id: 'ig-3',
    src: '/images/chocolate_truffles_stack.jpg',
    alt: 'Lotus Biscoff Waffle and Mini Pancakes',
    caption: 'Warm, crispy, golden waffles loaded with Belgian chocolate 🧇',
  },
  {
    id: 'ig-4',
    src: '/images/chocolate_bar.jpg',
    alt: 'Burnt Basque Cheesecake and Brownies',
    caption: 'That perfect caramelised crust and molten centre 🍰',
  },
]

export const placeholderImage = '/images/hero_chocolate.jpg'
export const instagramPlaceholders = instagramImages
