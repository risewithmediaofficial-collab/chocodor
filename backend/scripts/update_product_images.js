import { db } from '../db.js'

const imageMappings = [
  // 1. Lalban
  { name: 'Pistachio Salankatia', image: '/images/products/Pistachio_Salankatia.jpg' },
  { name: 'Biscoff Salankatia', image: '/images/products/Biscoff_Salankatia.jpg' },
  { name: 'Nutella Salankatia', image: '/images/products/Nutella_Salankatia.jpg' },
  { name: 'Pistachio + Biscoff Salankatia', image: '/images/products/Pistachio_+_Biscoff_Salankatia.jpg' },
  { name: 'Pistachio + Nutella Salankatia', image: '/images/products/Pistachio_+_Nutella_Salankatia.jpg' },
  { name: 'Biscoff + Nutella Salankatia', image: '/images/products/Biscoff_+_Nutella_Salankatia.jpg' },
  { name: 'Pistachio + Biscoff + Nutella Salankatia', image: '/images/products/Pistachio_+_Biscoff_+_Nutella_Salankatia.jpg' },

  // 2. Waffles
  { name: 'Triple Chocolate Waffle', image: '/images/products/Triple_Chocolate_Waffle.jpg' },
  { name: 'Lotus Biscoff Waffle', image: '/images/products/Lotus_Biscoff_Waffle.jpg' },
  { name: 'Oreo Waffle', image: '/images/products/Oreo_Waffle.jpg' },
  { name: 'Kitkat Waffle', image: '/images/products/Kitkat_Waffle.jpg' },
  { name: 'Nutty Nutella Waffle', image: '/images/products/Nutty_Nutella_Waffle.jpg' },
  { name: 'Butterscotch Waffle', image: '/images/products/Butterscotch_Waffle.jpg' },
  { name: 'Dead By Chocolate', image: '/images/products/Dead_By_Chocolate.jpg' },
  { name: 'White Choco Pistachio Waffle', image: '/images/products/White_Choco_Pistachio_Waffle.jpg' },
  { name: 'Kinder Joy Waffle', image: '/images/products/Kinder_Joy_Waffle.jpg' },
  { name: 'Kiki & Oreo Cream Waffle', image: '/images/products/Kiki_&_Oreo_Cream_Waffle.jpg' },

  // 3. Mini Pancakes
  { name: 'Triple Chocolate', image: '/images/products/Triple_Chocolate.jpg' },
  { name: 'Lotus Biscoff Pancake', image: '/images/products/Lotus_Biscoff_Pancake.jpg' },
  { name: 'Kitkat Pancake', image: '/images/products/Kitkat_Pancake.jpg' },
  { name: 'Nutty Nutella Pancake', image: '/images/products/Nutty_Nutella_Pancake.jpg' },
  { name: 'Oreo Cookies Pancake', image: '/images/products/Oreo_Cookies_Pancake.jpg' },
  { name: 'Pistachio Nutella Pancake', image: '/images/products/Pistachio_Nutella_Pancake.jpg' },

  // 4. Brownies
  { name: 'Triple Chocolate Brownie', image: '/images/products/Triple_Chocolate_Brownie.jpg' },
  { name: 'Biscoff Choco Brownie', image: '/images/products/Biscoff_Choco_Brownie.jpg' },
  { name: 'Nuts Brownie', image: '/images/products/Nuts_Brownie.jpg' },
  { name: 'Kitkat Brownie', image: '/images/products/Kitkat_Brownie.jpg' },
  { name: 'Oreo Brownie', image: '/images/products/Oreo_Brownie.jpg' },
  { name: 'Kinder Joy Bowl', image: '/images/products/Kinder_Joy_Bowl.jpg' },

  // 5. Bomboloni
  { name: 'Nutella Bomboloni', image: '/images/products/Nutella_Bombolon.jpg' },
  { name: 'Biscoff Bomboloni', image: '/images/products/Biscoff_Bomboloni.jpg' },
  { name: 'Choco Bomboloni', image: '/images/products/Choco_Bomboloni.jpg' },

  // 6. Cakes
  { name: 'Matilda Cake', image: '/images/products/Matilda_Cake.jpg' },

  // 7. Cheese Cake
  { name: 'Burnt Basque Cheese Cake', image: '/images/products/Burnt_Basque_Cheese_Cake.jpg' },
  { name: 'Lotus Biscoff Cheese Cake', image: '/images/products/Lotus_Biscoff_Cheese_Cake.jpg' },
  { name: 'Blueberry Cheesecake', image: '/images/products/Blueberry_Cheesecake.jpg' },
  { name: 'Nutella Cheese Cake', image: '/images/products/Nutella_Cheese_Cake.jpg' },
  { name: 'Chocolate Cheese Cake', image: '/images/products/Chocolate_Cheese_Cake.jpg' },

  // 8. Tiramisu
  { name: 'Tiramisu', image: '/images/products/Tiramisu.jpg' },

  // 9. Buns
  { name: 'Korean Cheese Bun', image: '/images/products/Korean_Cheese_Bun.jpg' },

  // 10. Tresleches
  { name: 'Classic Tresleches', image: '/images/products/Classic_Tresleches.jpg' },
  { name: 'Pistachio Tresleches', image: '/images/products/Pistachio_Tresleches.jpg' },
  { name: 'Rose Tresleches', image: '/images/products/Rose_Tresleches.jpg' },
]

const updateStmt = db.prepare('UPDATE products SET image = ? WHERE name = ?')

let updatedCount = 0
for (const item of imageMappings) {
  const res = updateStmt.run(item.image, item.name)
  if (res.changes > 0) {
    updatedCount++
    console.log(`✓ Updated image for ${item.name} -> ${item.image}`)
  } else {
    console.log(`- Product not found by exact name: ${item.name}`)
  }
}

console.log(`\nUpdated ${updatedCount} product image paths successfully in database!`)
