<template>
  <div 
    v-if="sprite" 
    class="sprite"
    :style="getSpriteStyle()"
  >
    <!-- 效果动画容器 -->
    <div class="effect-animations">
      <div
        v-for="animation in effectAnimations"
        :key="animation.id"
        class="effect-animation"
        :style="getEffectAnimationStyle(animation)"
      >
        <i :class="animation.icon" :style="{ color: animation.color }"></i>
        <span :style="{ color: animation.color }">+{{ animation.value }}</span>
      </div>
    </div>
    <img 
      :src="getSpriteImage()" 
      :alt="sprite.type"
      class="sprite-image"
      :style="{
        width: sprite.config.size.width + 'px',
        height: sprite.config.size.height + 'px'
      }"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMapStore } from '../../store/map'
import { useSpriteStore } from '../../store/sprite'
import { useStatsStore } from '../../store/stats'
import { mapConfig } from '../../config/map'
import { OFFSET_X, OFFSET_Y } from '../../store/map'

// Props
const props = defineProps({
  // 精灵ID（从spriteStore获取）
  id: {
    type: String,
    required: true
  }
})

// 使用地图 store
const mapStore = useMapStore()

// 使用精灵 store
const spriteStore = useSpriteStore()

// 使用统计 store
const statsStore = useStatsStore()

// 效果动画状态
const effectAnimations = ref([])
let animationId = 0

// 通过id从store获取精灵数据
const sprite = computed(() => spriteStore.getSpriteById(props.id))

// 移动定时器
let moveTimer = null
// 图片切换定时器
let frameTimer = null

// 初始化精灵
onMounted(() => {
  if (sprite.value) {
    // 开始移动逻辑
    startMoving()
    
    // 开始图片切换逻辑
    startFrameUpdate()
  }
})

// 清理定时器
onUnmounted(() => {
  if (moveTimer) {
    clearInterval(moveTimer)
  }
  if (frameTimer) {
    clearInterval(frameTimer)
  }
})

// 监听精灵数据变化
watch(sprite, (newSprite) => {
  if (newSprite) {
    // 如果精灵存在且未开始移动，开始移动
    if (!moveTimer) {
      startMoving()
    }
    
    // 如果精灵存在且未开始图片切换，开始图片切换
    if (!frameTimer) {
      startFrameUpdate()
    }
  } else {
    // 如果精灵被移除，清理定时器
    if (moveTimer) {
      clearInterval(moveTimer)
      moveTimer = null
    }
    if (frameTimer) {
      clearInterval(frameTimer)
      frameTimer = null
    }
  }
})

// 开始图片切换
const startFrameUpdate = () => {
  if (!sprite.value) return
  
  if (frameTimer) {
    clearInterval(frameTimer)
  }
  
  // 立即切换一次图片
  updateSpriteFrame()
  
  // 使用随机间隔切换图片（1-3秒）
  const minInterval = 1000
  const maxInterval = 3000
  const interval = minInterval + Math.random() * (maxInterval - minInterval)
  
  frameTimer = setInterval(() => {
    updateSpriteFrame()
  }, interval)
}

// 检查位置是否有效
const isValidPosition = (x, y) => {
  if (!sprite.value) return false
  
  const { isoMap } = mapStore
  if (!isoMap || !isoMap[x] || !isoMap[x][y]) return false
  
  const tileId = isoMap[x][y][0]
  // 使用Store中精灵配置的禁止瓦片ID
  const forbiddenTiles = new Set(sprite.value.config?.forbiddenTileIds || [])
  // 检查瓦片ID是否在禁止列表中
  return !forbiddenTiles.has(tileId)
}

// 开始移动
const startMoving = () => {
  if (!sprite.value) return
  
  if (moveTimer) {
    clearInterval(moveTimer)
  }
  
  // 立即移动一次
  moveRandomly()
  
  // 使用Store中精灵配置的移动间隔
  const interval = sprite.value.config?.moveInterval || 2000
  
  moveTimer = setInterval(() => {
    moveRandomly()
  }, interval)
}

// 检查位置是否在合法的CSS坐标范围内（根据画布大小动态计算）
const isInLegalRange = (row, col) => {
  if (!sprite.value) return false
  
  // 获取画布大小倍数
  const canvasMultiplier = mapStore.canvasSizeMultiplier || 1
  const ntiles = mapStore.ntiles
  
  // 计算等轴测坐标
  const tileX = (col - row) * (mapConfig.tileWidth / 2)
  const tileY = (row + col) * (mapConfig.tileHeight / 3.1)
  
  // 计算精灵的实际Y坐标
  const spriteY = tileY + mapConfig.tileHeight * 0.6 - sprite.value.config.size.height * 0.8
  
  // 根据画布大小动态计算菱形区域
  // 地图的实际尺寸
  const mapWidth = ntiles * mapConfig.tileWidth
  const mapHeight = ntiles * mapConfig.tileHeight * 2 / 3.1
  
  // 菱形的中心坐标（地图中心）
  const centerLeft = mapWidth / 2
  const centerTop = mapHeight / 2
  
  // 菱形的半轴长度（根据画布大小扩展）
  const halfWidth = mapWidth * 0.6  // 横向半轴，覆盖60%的地图宽度
  const halfHeight = mapHeight * 0.6  // 纵向半轴，覆盖60%的地图高度
  
  // 检查点是否在菱形内：|(x - centerLeft)/halfWidth| + |(y - centerTop)/halfHeight| <= 1
  const normalizedX = Math.abs((tileX - centerLeft) / halfWidth)
  const normalizedY = Math.abs((spriteY - centerTop) / halfHeight)
  
  // 对于大画布，放宽限制，允许更大的活动范围
  const threshold = canvasMultiplier >= 4 ? 1.5 : 1.0
  
  return normalizedX + normalizedY <= threshold
}

// 随机移动
const moveRandomly = () => {
  if (!sprite.value) return
  
  // 获取当前位置（保留小数，允许在瓦片内的任意位置）
  const currentX = sprite.value.currentRow
  const currentY = sprite.value.currentCol
  
  // 获取画布大小倍数
  const canvasMultiplier = mapStore.canvasSizeMultiplier || 1
  const ntiles = mapStore.ntiles
  
  // 可能的移动方向（上下左右，以及对角线方向，让移动更灵活）
  const directions = [
    { x: -1, y: 0 },  // 上
    { x: 1, y: 0 },   // 下
    { x: 0, y: -1 },  // 左
    { x: 0, y: 1 },   // 右
    { x: -0.7, y: -0.7 }, // 左上
    { x: -0.7, y: 0.7 },  // 右上
    { x: 0.7, y: -0.7 },  // 左下
    { x: 0.7, y: 0.7 }    // 右下
  ]
  
  // 随机打乱方向顺序
  const shuffledDirections = [...directions].sort(() => Math.random() - 0.5)
  
  // 缩短移动步长，让移动更自然，减少漂移感
  // 基础步长：0.2-0.6个瓦片单位（缩短）
  // 大画布时稍微增加步长，但不要太多：2x=0.3-0.8, 4x=0.4-1.0, 8x=0.5-1.2
  const baseStep = 0.2 + Math.random() * 0.4
  // 根据画布大小轻微调整，但不要成倍增加
  let step = baseStep * (1 + (canvasMultiplier - 1) * 0.2) // 每增加一倍画布，步长只增加20%
  
  // 偶尔进行中等距离移动（5%概率），但步长不会太大
  if (Math.random() < 0.05 && canvasMultiplier >= 2) {
    step = step * (1.5 + Math.random() * 0.5) // 中等距离移动：1.5-2倍步长（缩短）
  }
  
  // 限制最大步长，避免移动太远
  const maxStep = Math.min(ntiles * 0.15, 3) // 最多移动地图15%的距离，但不超过3个瓦片（缩短）
  step = Math.min(step, maxStep)
  
  // 寻找有效的移动位置
  for (const dir of shuffledDirections) {
    // 计算新位置
    const newX = currentX + dir.x * step
    const newY = currentY + dir.y * step
    
    // 计算精灵所在的瓦片（取整）
    const tileX = Math.floor(newX)
    const tileY = Math.floor(newY)
    
    // 检查边界：确保新位置在地图瓦片范围内（0 <= x < ntiles, 0 <= y < ntiles）
    if (newX >= 0 && newX < ntiles && newY >= 0 && newY < ntiles) {
      // 检查目标瓦片是否有效
      if (isValidPosition(tileX, tileY)) {
        // 对于大画布，放宽isInLegalRange的限制，允许更大的活动范围
        // 或者直接移除这个限制，让精灵可以在整个地图上移动
        const shouldCheckRange = canvasMultiplier === 1
        if (!shouldCheckRange || isInLegalRange(newX, newY)) {
          // 使用Store方法设置目标位置
          spriteStore.setSpriteTargetPosition(props.id, newX, newY)
          
          // 开始移动动画
          animateMove()
          break
        }
      }
    }
  }
}

// 更新精灵帧
const updateSpriteFrame = () => {
  if (!sprite.value) return
  
  const currentSprite = spriteStore.getSpriteById(props.id)
  if (!currentSprite) return
  
  // 随机选择下一帧
  const randomFrame = Math.floor(Math.random() * currentSprite.frameCount)
  
  // 更新当前帧
  currentSprite.currentFrame = randomFrame
}

// 移动动画
const animateMove = () => {
  if (!sprite.value) return
  
  const startRow = sprite.value.currentRow
  const startCol = sprite.value.currentCol
  const targetRow = sprite.value.targetRow
  const targetCol = sprite.value.targetCol
  
  // 根据移动距离计算动画持续时间，让移动更自然
  const distance = Math.sqrt(
    Math.pow(targetRow - startRow, 2) + Math.pow(targetCol - startCol, 2)
  )
  // 基础持续时间：800ms，根据距离调整（每0.5个瓦片单位增加100ms）
  const duration = 800 + distance * 200
  const startTime = Date.now()
  
  const moveStep = () => {
    const currentSprite = spriteStore.getSpriteById(props.id)
    if (!currentSprite) return
    
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // 使用缓动函数使移动更自然
    const easeProgress = easeInOutQuad(progress)
    
    // 计算新位置
    let newRow = startRow + (targetRow - startRow) * easeProgress
    let newCol = startCol + (targetCol - startCol) * easeProgress
    
    // 使用Store方法更新当前位置
    spriteStore.updateSpritePosition(props.id, newRow, newCol)
    
    if (progress < 1) {
      requestAnimationFrame(moveStep)
    } else {
      // 移动完成后，检测当前所在瓦片的id
      const currentTileX = Math.floor(newRow)
      const currentTileY = Math.floor(newCol)
      
      // 获取当前瓦片的id
      const currentTileId = mapStore.isoMap[currentTileX][currentTileY][0]
      
      // 检查是否有对应的func函数并执行
      if (currentSprite.config.func && currentSprite.config.func[currentTileId]) {
        const effectResult = currentSprite.config.func[currentTileId](statsStore)
        // 如果有效果结果，触发动画
        if (effectResult && effectResult.type && effectResult.value) {
          createEffectAnimation(effectResult)
        }
      }
    }
  }
  
  requestAnimationFrame(moveStep)
}

// 缓动函数
const easeInOutQuad = (t) => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// 获取精灵的显示样式
const getSpriteStyle = () => {
  if (!sprite.value) return {}
  
  const { currentRow, currentCol } = sprite.value
  
  // 计算等轴测坐标（使用与瓦片相同的公式）
  const tileX = (currentCol - currentRow) * (mapConfig.tileWidth / 2)
  const tileY = (currentRow + currentCol) * (mapConfig.tileHeight / 3.1)
  
  // 精灵显示在瓦片上
  const spriteY = tileY + mapConfig.tileHeight * 0.6 - sprite.value.config.size.height * 0.8
  
  // 菱形的中心坐标
  const centerLeft = 64
  const centerTop = 289.03
  
  // 菱形的半轴长度
  const halfWidth = 448 // 横向半轴
  const halfHeight = 289.03 // 纵向半轴
  
  // 计算点到菱形中心的归一化坐标
  const normalizedX = Math.abs((tileX - centerLeft) / halfWidth)
  const normalizedY = Math.abs((spriteY - centerTop) / halfHeight)
  
  let legalLeft = tileX
  let legalTop = spriteY
  
  // 如果点在菱形外，将其限制在菱形边上
  if (normalizedX + normalizedY > 1) {
    // 计算点在菱形边界上的投影
    const scaleFactor = 1 / (normalizedX + normalizedY)
    const clampedX = centerLeft + (tileX - centerLeft) * scaleFactor
    const clampedY = centerTop + (spriteY - centerTop) * scaleFactor
    
    legalLeft = clampedX
    legalTop = clampedY
  }
  
  return {
    position: 'absolute',
    left: `${legalLeft}px`,
    top: `${legalTop}px`,
    transform: 'translateX(-50%)', // 水平居中
    zIndex: 1000 + Math.floor(currentRow) + Math.floor(currentCol),
    pointerEvents: 'none'
  }
}

// 统计类型到图标的映射
const statTypeToIcon = {
  carbon: { icon: 'mdi mdi-leaf', color: '#4caf50' },
  biodiversity: { icon: 'mdi mdi-paw', color: '#8bc34a' },
  culture: { icon: 'mdi mdi-book-open-page-variant', color: '#ff9800' }
}

// 创建效果动画
const createEffectAnimation = (effect) => {
  const id = animationId++
  const statConfig = statTypeToIcon[effect.type] || statTypeToIcon.carbon
  
  // 添加动画
  effectAnimations.value.push({
    id,
    type: effect.type,
    value: effect.value,
    icon: statConfig.icon,
    color: statConfig.color,
    startTime: Date.now(),
    duration: 3000, // 3秒动画
    progress: 0
  })
  
  // 开始动画
  animateEffect(id)
  
  // 3秒后移除动画
  setTimeout(() => {
    effectAnimations.value = effectAnimations.value.filter(anim => anim.id !== id)
  }, 3000)
}

// 效果动画
const animateEffect = (id) => {
  const animation = effectAnimations.value.find(anim => anim.id === id)
  if (!animation) return
  
  const elapsed = Date.now() - animation.startTime
  animation.progress = Math.min(elapsed / animation.duration, 1)
  
  if (animation.progress < 1) {
    requestAnimationFrame(() => animateEffect(id))
  }
}

// 获取效果动画样式
const getEffectAnimationStyle = (animation) => {
  const { progress } = animation
  // 向上移动的距离
  const translateY = -60 * progress
  // 从透明到不透明再到透明
  const opacity = progress < 0.2 ? progress * 5 : (1 - progress) * 5
  // 初始缩放小，然后恢复正常
  const scale = progress < 0.2 ? 0.5 + progress * 2.5 : 1
  
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: `translate(-50%, -50%) translateY(${translateY}px) scale(${scale})`,
    opacity,
    fontSize: '1rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    pointerEvents: 'none',
    zIndex: 1100
  }
}

// 获取精灵的图片
const getSpriteImage = () => {
  if (!sprite.value) return ''
  
  if (sprite.value.config.loadedImages && sprite.value.config.loadedImages.length > 0) {
    return sprite.value.config.loadedImages[sprite.value.currentFrame]?.src || sprite.value.config.images[sprite.value.currentFrame]
  }
  return sprite.value.config.images[sprite.value.currentFrame]
}
</script>

<style scoped>
.sprite {
  position: absolute;
  pointer-events: none;
}

.sprite-image {
  display: block;
  image-rendering: pixelated; /* 保持像素风格 */
  user-select: none;
}

.effect-animations {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1100;
}

.effect-animation {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 2px;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.effect-animation i {
  font-size: 1.2rem;
}
</style>