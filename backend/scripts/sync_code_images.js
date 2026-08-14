import fs from 'fs'
import path from 'path'

const imageMap = {
  'Pistachio Salankatia': '/images/products/Pistachio_Salankatia.jpg',
  'Biscoff Salankatia': '/images/products/Biscoff_Salankatia.jpg',
  'Nutella Salankatia': '/images/products/Nutella_Salankatia.jpg',
  'Pistachio + Biscoff Salankatia': '/images/products/Pistachio_+_Biscoff_Salankatia.jpg',
  'Pistachio + Nutella Salankatia': '/images/products/Pistachio_+_Nutella_Salankatia.jpg',
  'Biscoff + Nutella Salankatia': '/images/products/Biscoff_+_Nutella_Salankatia.jpg',
  'Pistachio + Biscoff + Nutella Salankatia': '/images/products/Pistachio_+_Biscoff_+_Nutella_Salankatia.jpg',
  'Triple Chocolate Waffle': '/images/products/Triple_Chocolate_Waffle.jpg',
  'Lotus Biscoff Waffle': '/images/products/Lotus_Biscoff_Waffle.jpg',
  'Oreo Waffle': '/images/products/Oreo_Waffle.jpg',
  'Kitkat Waffle': '/images/products/Kitkat_Waffle.jpg',
  'Nutty Nutella Waffle': '/images/products/Nutty_Nutella_Waffle.jpg',
  'Butterscotch Waffle': '/images/products/Butterscotch_Waffle.jpg',
  'Dead By Chocolate': '/images/products/Dead_By_Chocolate.jpg',
  'White Choco Pistachio Waffle': '/images/products/White_Choco_Pistachio_Waffle.jpg',
  'Kinder Joy Waffle': '/images/products/Kinder_Joy_Waffle.jpg',
  'Kiki & Oreo Cream Waffle': '/images/products/Kiki_&_Oreo_Cream_Waffle.jpg',
  'Triple Chocolate': '/images/products/Triple_Chocolate.jpg',
  'Lotus Biscoff Pancake': '/images/products/Lotus_Biscoff_Pancake.jpg',
  'Kitkat Pancake': '/images/products/Kitkat_Pancake.jpg',
  'Nutty Nutella Pancake': '/images/products/Nutty_Nutella_Pancake.jpg',
  'Oreo Cookies Pancake': '/images/products/Oreo_Cookies_Pancake.jpg',
  'Pistachio Nutella Pancake': '/images/products/Pistachio_Nutella_Pancake.jpg',
  'Triple Chocolate Brownie': '/images/products/Triple_Chocolate_Brownie.jpg',
  'Biscoff Choco Brownie': '/images/products/Biscoff_Choco_Brownie.jpg',
  'Nuts Brownie': '/images/products/Nuts_Brownie.jpg',
  'Kitkat Brownie': '/images/products/Kitkat_Brownie.jpg',
  'Oreo Brownie': '/images/products/Oreo_Brownie.jpg',
  'Kinder Joy Bowl': '/images/products/Kinder_Joy_Bowl.jpg',
  'Nutella Bomboloni': '/images/products/Nutella_Bombolon.jpg',
  'Biscoff Bomboloni': '/images/products/Biscoff_Bomboloni.jpg',
  'Choco Bomboloni': '/images/products/Choco_Bomboloni.jpg',
  'Matilda Cake': '/images/products/Matilda_Cake.jpg',
  'Burnt Basque Cheese Cake': '/images/products/Burnt_Basque_Cheese_Cake.jpg',
  'Lotus Biscoff Cheese Cake': '/images/products/Lotus_Biscoff_Cheese_Cake.jpg',
  'Blueberry Cheesecake': '/images/products/Blueberry_Cheesecake.jpg',
  'Nutella Cheese Cake': '/images/products/Nutella_Cheese_Cake.jpg',
  'Chocolate Cheese Cake': '/images/products/Chocolate_Cheese_Cake.jpg',
  'Tiramisu': '/images/products/Tiramisu.jpg',
  'Korean Cheese Bun': '/images/products/Korean_Cheese_Bun.jpg',
  'Classic Tresleches': '/images/products/Classic_Tresleches.jpg',
  'Pistachio Tresleches': '/images/products/Pistachio_Tresleches.jpg',
  'Rose Tresleches': '/images/products/Rose_Tresleches.jpg',
}

// 1. Update frontend/src/data/content.js
const contentPath = path.resolve('frontend/src/data/content.js')
let contentJs = fs.readFileSync(contentPath, 'utf8')

for (const [name, img] of Object.entries(imageMap)) {
  // Regex to replace image: '/images/...' inside the object with this name
  const regex = new RegExp(`(name:\\s*['"]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][\\s\\S]*?image:\\s*)['"][^'"]+['"]`, 'g')
  contentJs = contentJs.replace(regex, `$1'${img}'`)
}
fs.writeFileSync(contentPath, contentJs, 'utf8')
console.log('✓ Updated frontend/src/data/content.js')

// 2. Update backend/db.js
const dbPath = path.resolve('backend/db.js')
let dbJs = fs.readFileSync(dbPath, 'utf8')
for (const [name, img] of Object.entries(imageMap)) {
  const regex = new RegExp(`(name:\\s*['"]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][\\s\\S]*?image:\\s*)['"][^'"]+['"]`, 'g')
  dbJs = dbJs.replace(regex, `$1'${img}'`)
}
fs.writeFileSync(dbPath, dbJs, 'utf8')
console.log('✓ Updated backend/db.js')
