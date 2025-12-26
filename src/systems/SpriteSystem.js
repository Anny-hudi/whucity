// 精灵系统管理类
export class SpriteSystem {
  constructor(mapGrid) {
    this.mapGrid = mapGrid
    this.sprites = []
    this.spriteId = 0
    this.animationFrameId = null
    
    // 精灵配置
    this.spriteConfig = {
      fox: {
        name: '小狐狸',
        images: [
          '/images/pet/processed/fox/fox1.png',
          '/images/pet/processed/fox/fox2.png',
          '/images/pet/processed/fox/fox3.png',
          '/images/pet/processed/fox/fox4.png',
          '/images/pet/processed/fox/fox5.png'
        ],
        size: { width: 40, height: 33 },
        spawnCondition: 'plant3_surrounded_plant1', // 8块植物3围绕植物1
        activityRange: 3, // 3x3区域
        animationSpeed: 800, // 动画帧间隔（毫秒）
        moveSpeed: 2000, // 移动速度（毫秒）
        spawnChance: 0.8 // 提高到80%刷新概率，便于调试
      },
      cat: {
        name: '小猫',
        images: [
          '/images/pet/processed/cat/cat1.png',
          '/images/pet/processed/cat/cat2.png',
          '/images/pet/processed/cat/cat3.png',
          '/images/pet/processed/cat/cat4.png',
          '/images/pet/processed/cat/cat5.png'
        ],
        size: { width: 32, height: 28 },
        spawnCondition: 'random_plant', // 随机出现在植物1或植物2上
        activityRange: 1, // 在两个临近单元格间来回走
        animationSpeed: 600,
        moveSpeed: 3000, // 移动速度较慢（3秒）
        spawnChance: 1.0 // 每次刷新都会生成（数量1-3只）
      }
    }
    
    // 注意：preloadImages 需要在外部显式调用并等待
  }
  
  // 预加载所有精灵图片
  async preloadImages() {
    console.log('🎮 开始预加载精灵图片...')
    
    for (const [type, config] of Object.entries(this.spriteConfig)) {
      config.loadedImages = []
      
      for (const imagePath of config.images) {
        try {
          const img = new Image()
          img.src = imagePath
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              config.loadedImages.push(img)
              resolve()
            }
            img.onerror = () => {
              console.warn(`⚠️ 无法加载图片: ${imagePath}`)
              reject()
            }
          })
        } catch (error) {
          console.warn(`⚠️ 加载图片失败: ${imagePath}`, error)
        }
      }
      
      console.log(`✅ ${type} 图片加载完成: ${config.loadedImages.length}/${config.images.length}`)
    }
    
    console.log('🎮 精灵图片预加载完成')
  }
  
  // 检查小狐狸刷新条件：8块植物3围绕植物1
  checkFoxSpawnCondition(row, col) {
    const mapData = this.mapGrid.mapData
    const ntiles = this.mapGrid.ntiles
    
    // 检查边界
    if (row < 0 || row >= ntiles || col < 0 || col >= ntiles) {
      return false
    }
    
    // 检查mapData结构
    if (!mapData || !mapData[row] || !mapData[row][col]) {
      return false
    }
    
    const centerTile = mapData[row][col]
    const centerTileId = Array.isArray(centerTile) ? centerTile[0] : centerTile.tileId || centerTile
    
    // 检查中心是否为植物1 (id: 1)
    if (centerTileId !== 1) {
      return false
    }
    
    // 检查周围8个位置是否都是植物3 (id: 3)
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ]
    
    let plant3Count = 0
    
    for (const [dr, dc] of directions) {
      const newRow = row + dr
      const newCol = col + dc
      
      // 检查边界
      if (newRow < 0 || newRow >= ntiles || newCol < 0 || newCol >= ntiles) {
        return false
      }
      
      // 检查是否存在瓦片数据
      if (!mapData[newRow] || !mapData[newRow][newCol]) {
        return false
      }
      
      const surroundTile = mapData[newRow][newCol]
      const surroundTileId = Array.isArray(surroundTile) ? surroundTile[0] : surroundTile.tileId || surroundTile
      
      // 检查是否为植物3
      if (surroundTileId === 3) {
        plant3Count++
      } else {
        return false
      }
    }
    
    // 只有当所有条件都满足时才返回true，不输出日志（避免重复）
    return plant3Count === 8
  }
  
  // 获取指定位置的 tileId
  getTileId(row, col) {
    const mapData = this.mapGrid.mapData
    const ntiles = this.mapGrid.ntiles
    
    if (row < 0 || row >= ntiles || col < 0 || col >= ntiles) {
      return null
    }
    
    if (!mapData || !mapData[row] || !mapData[row][col]) {
      return null
    }
    
    const tile = mapData[row][col]
    return Array.isArray(tile) ? tile[0] : (tile.tileId || tile)
  }
  
  // 检查格子是否可通行（不是水、不是教学楼、不是商店）
  isWalkable(row, col) {
    const tileId = this.getTileId(row, col)
    if (tileId === null) return false
    
    // 不能通行的 tileId：水(10)、教学楼(4)、武大商店(12)
    const blockedIds = [4, 10, 12]
    return !blockedIds.includes(tileId)
  }
  
  // 检查格子是否适合猫生成和移动（必须是植物1、植物2，不能是任何建筑）
  isCatSpawnable(row, col) {
    const tileId = this.getTileId(row, col)
    if (tileId === null) return false
    
    // 猫只能生成/移动到：植物1(1)、植物2(2)
    // 明确排除所有建筑类型：
    // - 建筑1/教学楼(4)
    // - 武大宿舍(11)
    // - 武大商店(12)
    // - 水(10)
    // - 以及其他所有非植物1、植物2的格子
    const allowedIds = [1, 2]
    const blockedIds = [4, 10, 11, 12] // 明确列出所有不能通行的建筑
    
    // 双重检查：必须在允许列表中，且不在禁止列表中
    return allowedIds.includes(tileId) && !blockedIds.includes(tileId)
  }
  
  // 检查小猫刷新条件：是否是教学楼（建筑1，id: 4）周围四个方向的可通行格子
  checkCatSpawnCondition(row, col) {
    // 检查当前位置是否可通行
    if (!this.isWalkable(row, col)) {
      return false
    }
    
    // 检查周围四个方向（上下左右）是否有教学楼
    const directions = [
      [-1, 0], // 上
      [1, 0],  // 下
      [0, -1], // 左
      [0, 1]   // 右
    ]
    
    for (const [dr, dc] of directions) {
      const adjacentRow = row + dr
      const adjacentCol = col + dc
      const tileId = this.getTileId(adjacentRow, adjacentCol)
      
      // 如果相邻格子是教学楼（id: 4），则当前位置符合条件
      if (tileId === 4) {
        return true
      }
    }
    
    return false
  }
  
  // 扫描地图并刷新精灵
  scanAndSpawnSprites() {
    const mapData = this.mapGrid.mapData
    const ntiles = this.mapGrid.ntiles
    
    console.log('🔍 开始扫描地图刷新精灵...')
    console.log('地图数据结构:', mapData)
    console.log('地图尺寸:', ntiles)
    console.log('精灵配置:', this.spriteConfig)
    
    if (!mapData) {
      console.log('❌ 地图数据为空')
      return
    }
    
    // 防止无限循环，添加扫描计数器
    let foxChecked = 0
    let catChecked = 0
    
    for (let row = 0; row < ntiles; row++) {
      for (let col = 0; col < ntiles; col++) {
        // 检查小狐狸刷新条件
        if (this.checkFoxSpawnCondition(row, col)) {
          foxChecked++
          
          // 检查该位置是否已有小狐狸
          const existingFox = this.sprites.find(sprite => 
            sprite.type === 'fox' && 
            sprite.centerRow === row && 
            sprite.centerCol === col
          )
          
          if (!existingFox) {
            console.log(`✅ 狐狸刷新条件满足 (${row}, ${col})！植物1被8个植物3围绕`)
            const spawnChance = Math.random()
            console.log(`🎲 狐狸刷新概率检查 (${row}, ${col}): ${spawnChance.toFixed(3)} < ${this.spriteConfig.fox.spawnChance}`)
            
            if (spawnChance < this.spriteConfig.fox.spawnChance) {
              const newSprite = this.spawnSprite('fox', row, col)
              if (newSprite) {
                console.log(`🦊 小狐狸在 (${row}, ${col}) 刷新成功！`)
              } else {
                console.log(`❌ 小狐狸在 (${row}, ${col}) 刷新失败`)
              }
            } else {
              console.log(`🎲 狐狸刷新概率不满足 (${row}, ${col})`)
            }
          } else {
            console.log(`🦊 位置 (${row}, ${col}) 已有小狐狸`)
          }
        }
        
        // 小猫刷新逻辑会在下面单独处理
      }
    }
    
    // 处理小猫刷新：在地图上随机生成1-3只猫
    // 先清理现有的猫
    const oldCatCount = this.sprites.filter(s => s.type === 'cat').length
    this.sprites = this.sprites.filter(s => s.type !== 'cat')
    
    // 找到地图上所有可生成猫的位置（植物1、植物2）
    const allValidSpots = []
    for (let row = 0; row < ntiles; row++) {
      for (let col = 0; col < ntiles; col++) {
        if (this.isCatSpawnable(row, col)) {
          allValidSpots.push({ row, col })
        }
      }
    }
    
    console.log(`📊 地图上可生成猫的位置数量: ${allValidSpots.length}`)
    
    if (allValidSpots.length === 0) {
      console.log(`⚠️ 地图上没有可生成猫的位置（需要植物1或植物2）`)
    } else {
      // 随机生成1-3只猫
      const catCount = Math.floor(Math.random() * 3) + 1 // 1-3只
      const targetCount = Math.min(catCount, allValidSpots.length) // 不超过可用位置数
      
      console.log(`🐱 准备生成 ${targetCount} 只猫`)
      
      // 随机打乱位置列表
      const shuffledSpots = [...allValidSpots].sort(() => Math.random() - 0.5)
      
      // 生成指定数量的猫
      for (let i = 0; i < targetCount; i++) {
        const spot = shuffledSpots[i]
        const newSprite = this.spawnSprite('cat', spot.row, spot.col)
        if (newSprite) {
          console.log(`🐱 小猫在地图位置 (${spot.row}, ${spot.col}) 刷新成功！`)
          catChecked++
        }
      }
    }
    
    console.log(`📊 扫描统计: 狐狸检查点 ${foxChecked} 个，猫咪刷新点 ${catChecked} 个`)
    console.log(`✅ 扫描完成，当前精灵数量: ${this.sprites.length}`)
    
    // 输出当前所有精灵信息
    if (this.sprites.length > 0) {
      console.log('🎮 当前精灵列表:')
      this.sprites.forEach(sprite => {
        console.log(`  - ${sprite.type} #${sprite.id} 在 (${sprite.centerRow}, ${sprite.centerCol})`)
      })
    }
  }
  
  // 刷新指定类型的精灵
  spawnSprite(type, centerRow, centerCol) {
    const config = this.spriteConfig[type]
    if (!config || !config.loadedImages || config.loadedImages.length === 0) {
      console.warn(`⚠️ 精灵类型 ${type} 配置或图片未加载`)
      console.log('可用配置:', Object.keys(this.spriteConfig))
      console.log(`${type} 配置:`, config)
      return null
    }
    
    const sprite = {
      id: ++this.spriteId,
      type: type,
      centerRow: centerRow,
      centerCol: centerCol,
      currentRow: centerRow,
      currentCol: centerCol,
      x: 0, // 像素坐标，稍后计算
      y: 0,
      config: config,
      currentFrame: 0,
      lastFrameTime: Date.now(),
      lastMoveTime: Date.now(),
      isMoving: false,
      targetRow: centerRow,
      targetCol: centerCol,
      moveStartTime: 0,
      moveStartX: 0,
      moveStartY: 0,
      moveTargetX: 0,
      moveTargetY: 0,
      // 猫的特殊属性：移动目标位置
      alternateRow: null, // 第二个可移动的位置（来回走）
      alternateCol: null,
      movingToAlternate: false // 是否正在移动到第二个位置
    }
    
    // 计算初始像素位置
    this.updateSpritePixelPosition(sprite)
    
    this.sprites.push(sprite)
    console.log(`✨ 精灵创建成功: ${type} #${sprite.id} 在 (${centerRow}, ${centerCol})`)
    
    // 开始动画循环
    if (!this.animationFrameId) {
      this.startAnimation()
    }
    
    return sprite
  }
  
  // 更新精灵的像素位置 - 现在只需要更新网格坐标，不需要像素坐标
  updateSpritePixelPosition(sprite) {
    // 精灵现在通过瓦片相对定位，不需要计算全局像素坐标
    // 只需要确保网格坐标是正确的
    
    // 只在精灵刚创建时输出一次调试信息
    if (sprite.id <= 2 && !sprite.debugLogged) {
      console.log(`🐾 精灵 #${sprite.id} (${sprite.type}) 网格位置:`)
      console.log(`  网格坐标: (${sprite.currentRow}, ${sprite.currentCol})`)
      console.log(`  中心坐标: (${sprite.centerRow}, ${sprite.centerCol})`)
      console.log(`  精灵尺寸: ${sprite.config.size.width}x${sprite.config.size.height}`)
      sprite.debugLogged = true
    }
  }
  
  // 开始动画循环
  startAnimation() {
    if (this.animationFrameId) return
    
    const animate = () => {
      this.updateSprites()
      this.animationFrameId = requestAnimationFrame(animate)
    }
    
    this.animationFrameId = requestAnimationFrame(animate)
  }
  
  // 停止动画循环
  stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }
  
  // 更新所有精灵
  updateSprites() {
    const currentTime = Date.now()
    
    for (const sprite of this.sprites) {
      // 更新动画帧
      if (currentTime - sprite.lastFrameTime >= sprite.config.animationSpeed) {
        sprite.currentFrame = (sprite.currentFrame + 1) % sprite.config.loadedImages.length
        sprite.lastFrameTime = currentTime
      }
      
      // 更新移动逻辑
      if (sprite.type === 'cat') {
        // 猫在两个临近单元格间来回走
        if (!sprite.isMoving && currentTime - sprite.lastMoveTime >= sprite.config.moveSpeed) {
          this.startCatMovement(sprite)
        }
        
        if (sprite.isMoving) {
          this.updateSpriteMovement(sprite, currentTime)
        } else {
          // 如果不在移动，确保精灵保持在整数坐标
          sprite.currentRow = sprite.centerRow
          sprite.currentCol = sprite.centerCol
        }
      } else {
        // 其他精灵的移动逻辑
        if (!sprite.isMoving && currentTime - sprite.lastMoveTime >= sprite.config.moveSpeed) {
          this.startSpriteMovement(sprite)
        }
        
        if (sprite.isMoving) {
          this.updateSpriteMovement(sprite, currentTime)
        } else {
          // 如果不在移动，确保精灵保持在整数坐标
          sprite.currentRow = sprite.centerRow
          sprite.currentCol = sprite.centerCol
        }
      }
      
      // 更新像素位置
      this.updateSpritePixelPosition(sprite)
    }
    
    // 清理不应该存在的精灵 - 但不要频繁清理，避免重复刷新
    // 只有当精灵数量变化时才清理
    const shouldClean = this.sprites.some(sprite => !this.shouldSpriteExist(sprite))
    if (shouldClean) {
      const oldCount = this.sprites.length
      this.sprites = this.sprites.filter(sprite => this.shouldSpriteExist(sprite))
      if (this.sprites.length !== oldCount) {
        console.log(`🧹 清理精灵: ${oldCount} -> ${this.sprites.length}`)
      }
    }
  }
  
  // 开始精灵移动
  startSpriteMovement(sprite) {
    if (sprite.type === 'cat') {
      // 猫的移动逻辑：在教学楼周围移动，避开建筑
      this.startCatMovement(sprite)
    } else {
      // 其他精灵的原始移动逻辑
      const range = sprite.config.activityRange
      const minRow = Math.max(0, sprite.centerRow - Math.floor(range / 2))
      const maxRow = Math.min(this.mapGrid.ntiles - 1, sprite.centerRow + Math.floor(range / 2))
      const minCol = Math.max(0, sprite.centerCol - Math.floor(range / 2))
      const maxCol = Math.min(this.mapGrid.ntiles - 1, sprite.centerCol + Math.floor(range / 2))
      
      // 随机选择目标位置
      sprite.targetRow = Math.floor(Math.random() * (maxRow - minRow + 1)) + minRow
      sprite.targetCol = Math.floor(Math.random() * (maxCol - minCol + 1)) + minCol
      
      sprite.isMoving = true
      sprite.moveStartTime = Date.now()
      sprite.moveStartX = sprite.currentRow
      sprite.moveStartY = sprite.currentCol
      sprite.moveTargetX = sprite.targetRow
      sprite.moveTargetY = sprite.targetCol
    }
  }
  
  // 猫的移动逻辑：在当前位置周围的植物1、植物2格子间随机移动
  startCatMovement(sprite) {
    // 如果还没有设置第二个位置，找到当前位置周围的另一个可通行位置
    if (sprite.alternateRow === null || sprite.alternateCol === null) {
      const directions = [
        [-1, 0], // 上
        [1, 0],  // 下
        [0, -1], // 左
        [0, 1]   // 右
      ]
      
      // 找到当前位置周围的所有可通行位置（必须是植物1、植物2）
      const validSpots = []
      for (const [dr, dc] of directions) {
        const spotRow = sprite.centerRow + dr
        const spotCol = sprite.centerCol + dc
        
        // 使用 isCatSpawnable 检查：必须是植物1、植物2
        if (this.isCatSpawnable(spotRow, spotCol)) {
          validSpots.push({ row: spotRow, col: spotCol })
        }
      }
      
      // 找到除了当前位置之外的另一个位置
      const otherSpots = validSpots.filter(spot => 
        !(spot.row === sprite.centerRow && spot.col === sprite.centerCol)
      )
      
      if (otherSpots.length > 0) {
        // 随机选择一个作为第二个位置
        const randomSpot = otherSpots[Math.floor(Math.random() * otherSpots.length)]
        sprite.alternateRow = randomSpot.row
        sprite.alternateCol = randomSpot.col
      } else {
        // 如果没有其他位置，就不移动
        sprite.alternateRow = sprite.centerRow
        sprite.alternateCol = sprite.centerCol
      }
    }
    
    // 在两个位置间来回走
    if (sprite.movingToAlternate) {
      // 当前在第二个位置，移动到初始位置
      sprite.targetRow = sprite.centerRow
      sprite.targetCol = sprite.centerCol
      sprite.movingToAlternate = false
    } else {
      // 当前在初始位置，移动到第二个位置
      sprite.targetRow = sprite.alternateRow
      sprite.targetCol = sprite.alternateCol
      sprite.movingToAlternate = true
    }
    
    sprite.isMoving = true
    sprite.moveStartTime = Date.now()
    sprite.moveStartX = sprite.currentRow
    sprite.moveStartY = sprite.currentCol
    sprite.moveTargetX = sprite.targetRow
    sprite.moveTargetY = sprite.targetCol
  }
  
  // 找到指定位置附近最近的指定类型的建筑
  findNearbyBuilding(row, col, buildingId, maxRange = 5) {
    const mapData = this.mapGrid.mapData
    const ntiles = this.mapGrid.ntiles
    
    let closestBuilding = null
    let minDistance = Infinity
    
    for (let dr = -maxRange; dr <= maxRange; dr++) {
      for (let dc = -maxRange; dc <= maxRange; dc++) {
        const checkRow = row + dr
        const checkCol = col + dc
        
        if (checkRow < 0 || checkRow >= ntiles || checkCol < 0 || checkCol >= ntiles) {
          continue
        }
        
        const tileId = this.getTileId(checkRow, checkCol)
        if (tileId === buildingId) {
          const distance = Math.abs(dr) + Math.abs(dc)
          if (distance < minDistance) {
            minDistance = distance
            closestBuilding = { row: checkRow, col: checkCol, distance }
          }
        }
      }
    }
    
    return closestBuilding
  }
  
  // 更新精灵移动
  updateSpriteMovement(sprite, currentTime) {
    const moveDuration = sprite.config.moveSpeed
    const elapsed = currentTime - sprite.moveStartTime
    const progress = Math.min(elapsed / moveDuration, 1)
    
    if (progress >= 1) {
      // 移动完成 - 确保使用整数坐标
      const targetRow = Math.round(sprite.targetRow)
      const targetCol = Math.round(sprite.targetCol)
      
      // 对于猫，检查目标位置是否可通行（不能是任何建筑）
      if (sprite.type === 'cat') {
        if (this.isCatSpawnable(targetRow, targetCol)) {
          sprite.currentRow = targetRow
          sprite.currentCol = targetCol
          sprite.centerRow = targetRow // 更新中心位置
          sprite.centerCol = targetCol
        } else {
          // 如果目标位置不可通行（是建筑或其他禁止区域），保持在原位置
          sprite.currentRow = sprite.centerRow
          sprite.currentCol = sprite.centerCol
          sprite.targetRow = sprite.centerRow
          sprite.targetCol = sprite.centerCol
        }
      } else {
        sprite.currentRow = targetRow
        sprite.currentCol = targetCol
      }
      
      sprite.isMoving = false
      sprite.lastMoveTime = currentTime
    } else {
      // 插值移动 - 在整数坐标之间平滑移动
      sprite.currentRow = sprite.moveStartX + (sprite.moveTargetX - sprite.moveStartX) * progress
      sprite.currentCol = sprite.moveStartY + (sprite.moveTargetY - sprite.moveStartY) * progress
    }
  }
  
  // 检查精灵是否应该存在
  shouldSpriteExist(sprite) {
    if (sprite.type === 'fox') {
      return this.checkFoxSpawnCondition(sprite.centerRow, sprite.centerCol)
    } else if (sprite.type === 'cat') {
      // 猫只要还在植物1或植物2上就可以存在
      return this.isCatSpawnable(sprite.centerRow, sprite.centerCol)
    }
    return false
  }
  
  // 精灵现在通过瓦片直接渲染，不需要Canvas渲染函数
  // render 函数已被移除，精灵通过 Tile.vue 组件渲染

  // 清理所有精灵
  cleanup() {
    this.stopAnimation()
    this.sprites = []
  }
}