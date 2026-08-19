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

import { PRODUCTS, CATEGORIES } from './products.js'

export const categories = CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  color: c.color,
  count: PRODUCTS.filter((p) => p.categoryId === c.id || p.categorySlug === c.slug).length,
}))

export const allProducts = PRODUCTS

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
    src: '/images/products/Pistachio_Salankatia.jpg',
    alt: "Choco D'or signature Pistachio Salankatia with Kunafa & Pistachio Cream",
    caption: 'Signature Pistachio Salankatia with artisanal pistachio cream & roasted pistachios ✨',
  },
  {
    id: 'ig-2',
    src: '/images/products/Matilda_Cake.jpg',
    alt: "Choco D'or decadent Matilda Chocolate Fudge Cake",
    caption: 'Rich, molten, decadent Matilda Chocolate Cake baked fresh daily in Krishnagiri 🍫',
  },
  {
    id: 'ig-3',
    src: '/images/products/Lotus_Biscoff_Waffle.jpg',
    alt: "Choco D'or crispy Lotus Biscoff Belgian Waffle",
    caption: 'Warm, crispy golden waffles loaded with Lotus Biscoff & Belgian chocolate 🧇',
  },
  {
    id: 'ig-4',
    src: '/images/products/Burnt_Basque_Cheese_Cake.jpg',
    alt: "Choco D'or San Sebastian Burnt Basque Cheesecake",
    caption: 'Caramelised crust with a silky smooth molten cream cheese centre 🍰',
  },
]

export const placeholderImage = '/images/hero_chocolate.jpg'
export const instagramPlaceholders = instagramImages
