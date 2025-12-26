// generate-favicon.js
import { mdiCity } from '@mdi/js'
import fs from 'fs'

// 创建透明背景的 SVG favicon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
  <path fill="#ffffff" d="${mdiCity}"/>
</svg>`

// 创建不同尺寸的 SVG favicon
const sizes = [16, 32, 48, 64, 128, 256]

sizes.forEach((size) => {
  const svgWithSize = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
  <path fill="#ffffff" d="${mdiCity}"/>
</svg>`

  fs.writeFileSync(`public/favicon-${size}x${size}.svg`, svgWithSize)
})

// 主 favicon
fs.writeFileSync('public/favicon.svg', svgContent)

console.log('✅ Favicon generated successfully!')
console.log('📁 Generated files:')
console.log('  - public/favicon.svg (main)')
sizes.forEach((size) => {
  console.log(`  - public/favicon-${size}x${size}.svg`)
})
