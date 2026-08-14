import fs from 'fs'
import path from 'path'

const sourceDir = path.resolve('frontend/src/assets/website')
const destDir = path.resolve('frontend/public/images/products')

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true })
}

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    if (entry.isDirectory()) {
      copyRecursive(srcPath, dest)
    } else if (/\.(jpg|jpeg|png|jfif|webp)$/i.test(entry.name)) {
      // Normalize filename for public URL
      const cleanName = entry.name.replace(/\.jfif$/i, '.jpg').replace(/\s+/g, '_')
      const destPath = path.join(dest, cleanName)
      fs.copyFileSync(srcPath, destPath)
      console.log(`Copied: ${entry.name} -> /images/products/${cleanName}`)
    }
  }
}

copyRecursive(sourceDir, destDir)
console.log('Done copying all website product images!')
