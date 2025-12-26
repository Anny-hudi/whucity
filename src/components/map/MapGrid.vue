<template>
  <div class="map-container" ref="mapContainer">
    <div 
      class="map-wrapper" 
      :style="wrapperStyle"
    >
      <!-- 渲染所有瓦片 -->
      <template v-for="(row, x) in mapStore.isoMap" :key="`row-${x}`">
        <Tile 
          v-for="(tile, y) in row" 
          :key="`${x}-${y}`"
          :x="x"
          :y="y"
          :tileId="tile[0]"
          :height="tile[1]"
          :hover="hoveredTile?.x === x && hoveredTile?.y === y"
          :textures="mapStore.textures"
          :tileWidth="mapConfig.tileWidth"
          :tileHeight="mapConfig.tileHeight"
          @click="handleTileClick"
          @dblclick="handleTileDoubleClick"
          @mouseenter="handleTileMouseEnter"
          @mouseleave="handleTileMouseLeave"
        >
          <template #float>
            <!-- {{ x }}/{{ y }} -->
            <template v-if="exchangeStore.exchangeItems[tile[0]-1]?.func == 'timer'">
              <TimerComponent 
                :duration="exchangeStore.exchangeItems[tile[0]-1]?.change?.duration" 
              />
            </template>
            <template v-else-if="exchangeStore.exchangeItems[tile[0]-1]?.func == 'hover-tip'">
              <div class="tile-hover-tip">{{ exchangeStore.exchangeItems[tile[0]-1]?.hoverTip }}</div>
            </template>
          </template>
        </Tile>
      </template>
      
      <!--TEST-->
      <template v-if="debugFlag" v-for="(row, x) in mapStore.isoMap" :key="`row-${x}`">
        <div 
          v-for="(tile, y) in row" 
          :key="`${x}-${y}`"
          :style="{ position: 'absolute', top: `${OFFSET_Y * (y + 1 + x)}px`, left: `${OFFSET_X * (-x + 1 + y)}px`, width: '5px', height: '5px', backgroundColor: 'red', zIndex: 1000 }">
          <!-- <span style="color: red;">{{ x }}/{{ y }}</span> -->
          <span>{{ (OFFSET_Y * (y + 1 + x)).toFixed(2) }}/{{ (OFFSET_X * (-x + 1 + y)).toFixed(2) }}</span>
        </div>
      </template>

      <div v-if="debugFlag" 
        v-for="([x, y], index) in [[0, 0], [0, 6], [6, 0], [6, 6]]" 
        :key="`${x}-${y}`"
        :style="{ position: 'absolute', top: `${OFFSET_Y * (y + 1 + x)}px`, left: `${OFFSET_X * (-x + 1 + y)}px`, width: '5px', height: '5px', backgroundColor: 'blue', zIndex: 1000 }">
        <span style="color: blue;">{{ x }}/{{ y }}</span>
      </div>

      <!-- 虚拟替换瓦片 -->
      <div 
        v-if="hoveredTile.x !== -1 && hoveredTile.y !== -1 && mapStore.selectedTileId" 
        class="virtual-tile"
        :style="virtualTileStyle"
      >
        <div class="virtual-tile-image" :style="virtualTileImageStyle"></div>
      </div>
      
      <!-- 独立的精灵渲染层 -->
      <div class="sprites-layer">
        <!-- 从store中获取精灵列表并渲染 -->
        <Sprite 
          v-for="sprite in spriteStore.allSprites" 
          :key="sprite.id"
          :id="sprite.id"
        />
      </div>
    </div>
    
    <!-- 控制按钮 -->
    <div class="map-controls">
      <button @click="mapStore.zoomIn" class="control-btn" title="放大">
        <span class="control-icon mdi mdi-plus"></span>
      </button>
      <button @click="mapStore.zoomOut" class="control-btn" title="缩小">
        <span class="control-icon mdi mdi-minus"></span>
      </button>
      <button @click="mapStore.resetView" class="control-btn" title="重置视图">
        <span class="control-icon mdi mdi-refresh"></span>
      </button>
      <!-- <button @click="handleUndo" class="control-btn" :disabled="!canUndo" title="撤销 (Ctrl+Z)">
        <span class="control-icon mdi mdi-undo"></span>
      </button>
      <button @click="handleRedo" class="control-btn" :disabled="!canRedo" title="重做 (Ctrl+Y)">
        <span class="control-icon mdi mdi-redo"></span>
      </button> -->
      <button @click="handleExportMap" class="control-btn" title="导出地图">
        <span class="control-icon mdi mdi-download"></span>
      </button>
      <button @click="handleImportMap" class="control-btn" title="导入地图">
        <span class="control-icon mdi mdi-upload"></span>
      </button>
      <button @click="handleImportDefaultLayout" class="control-btn" title="导入默认布局" :disabled="![1, 2, 4, 8].includes(mapStore.canvasSizeMultiplier)">
        <span class="control-icon mdi mdi-map"></span>
      </button>
      <button @click="debugFlag = !debugFlag" class="control-btn" title="调试模式">
        <span class="control-icon mdi mdi-bug"></span>
      </button>
    </div>
    
    <!-- 画布大小选择器 -->
    <div class="canvas-size-selector">
      <div class="selector-label">画布大小</div>
      <div class="selector-buttons">
        <button 
          v-for="multiplier in [1, 2, 4, 8]" 
          :key="multiplier"
          @click="handleCanvasSizeChange(multiplier)"
          :class="['size-btn', { active: mapStore.canvasSizeMultiplier === multiplier }]"
          :title="`${multiplier}x (${mapConfig.ntiles * multiplier}×${mapConfig.ntiles * multiplier})`"
        >
          {{ multiplier }}x
        </button>
      </div>
    </div>
    
    <!-- 填充模式选择器 -->
    <div class="fill-mode-selector">
      <div class="selector-label">填充模式</div>
      <div class="selector-buttons">
        <button 
          @click="mapStore.setFillMode('single')"
          :class="['mode-btn', { active: mapStore.fillMode === 'single' }]"
          title="单个元素块"
        >
          <span class="mdi mdi-cursor-pointer"></span>
        </button>
        <button 
          @click="mapStore.setFillMode('row')"
          :class="['mode-btn', { active: mapStore.fillMode === 'row' }]"
          title="整行填充"
        >
          <span class="mdi mdi-arrow-right"></span>
        </button>
        <button 
          @click="mapStore.setFillMode('column')"
          :class="['mode-btn', { active: mapStore.fillMode === 'column' }]"
          title="整列填充"
        >
          <span class="mdi mdi-arrow-down"></span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useMapStore } from '../../store/map'
import { useStatsStore } from '../../store/stats'
import { mapConfig } from '../../config/map'
import { useExchangeStore } from '../../store/exchange'
import { useSpriteStore } from '../../store/sprite'
import Tile from './Tile.vue'
import TimerComponent from './sub/TimerComponent.vue'
import { OFFSET_X, OFFSET_Y } from '../../store/map'
import Sprite from './Sprite.vue'

// 使用地图 store
const mapStore = useMapStore()
const mapContainer = ref(null)

// 使用交易所 store
const exchangeStore = useExchangeStore()

// 使用统计 store
const statsStore = useStatsStore()

// 使用精灵 store
const spriteStore = useSpriteStore()

// 精灵系统相关代码已迁移到CatSprite组件

// 随机精灵生成定时器
let randomSpriteInterval = null

// 启动随机精灵生成
const startRandomSpriteGeneration = () => {
  if (!randomSpriteInterval) {
    // 每隔30秒尝试添加随机精灵
    randomSpriteInterval = setInterval(() => {
      spriteStore.addRandomSprites()
    }, 30 * 1000)
    
    // 初始10秒后触发首次生成
    setTimeout(() => {
      spriteStore.addRandomSprites()
    }, 10 * 1000)
  }
}

// 停止随机精灵生成
const stopRandomSpriteGeneration = () => {
  if (randomSpriteInterval) {
    clearInterval(randomSpriteInterval)
    randomSpriteInterval = null
  }
}

const debugFlag = ref(false)

// 拖拽状态
let isDragging = false
let lastMouseX = 0
let lastMouseY = 0

// 悬停状态
const hoveredTile = ref({
  x: -1,
  y: -1
})

// 计算地图容器样式
const wrapperStyle = computed(() => ({
  transform: `translate(-50%, -50%) translate(${mapStore.panX}px, ${mapStore.panY}px) scale(${mapStore.zoom})`,
  transformOrigin: 'center center'
}))

// 计算虚拟瓦片样式
const virtualTileStyle = computed(() => {
  if (!hoveredTile.value) return { display: 'none' }
  
  const { x, y } = hoveredTile.value
  // 计算等轴测坐标
  const tileX = (y - x) * (mapConfig.tileWidth / 2)
  const tileY = (x + y) * (mapConfig.tileHeight / 3.1)
  
  return {
    position: 'absolute',
    left: `${tileX}px`,
    top: `${tileY}px`,
    width: `${mapConfig.tileWidth}px`,
    height: `${mapConfig.tileHeight}px`,
    zIndex: x + y + 10, // 确保显示在原有瓦片之上
    pointerEvents: 'none' // 不影响鼠标事件
  }
})

// 计算虚拟瓦片图像样式
const virtualTileImageStyle = computed(() => {
  if (!mapStore.selectedTileId) return {}
  
  return {
    transform: 'translateY(-5px)',
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundImage: `url(${mapStore.textures[mapStore.selectedTileId]?.src || ''})`,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity: 0.7, // 设置半透明效果，区分虚拟和实际瓦片
    filter: 'brightness(1.2)' // 增加亮度，突出显示
  }
})

// 精灵系统相关方法已迁移到CatSprite组件

// INFO 瓦片点击事件
const handleTileClick = () => {
  const { x, y } = hoveredTile.value
  const ntiles = mapStore.ntiles
  if (x >= 0 && x < ntiles && y >= 0 && y < ntiles) {
    // 如果有选中的瓦片，将其放置到地图上
    if (mapStore.selectedTileId) {
      // 获取选中瓦片的数据
      const selectedTileId = mapStore.selectedTileData.id
      if (selectedTileId) {
        // 保存当前状态到历史记录
        mapStore.saveToHistory()
        
        // 根据填充模式进行填充
        if (mapStore.fillMode === 'row') {
          // 整行填充
          mapStore.fillRow(x, mapStore.selectedTileId, 1)
        } else if (mapStore.fillMode === 'column') {
          // 整列填充
          mapStore.fillColumn(y, mapStore.selectedTileId, 1)
        } else {
          // 单个元素块填充（默认）
          mapStore.updateTile(x, y, mapStore.selectedTileId, 1)
        }
      }
    }
  }
}

// 瓦片鼠标进入事件
const handleTileMouseEnter = (pos) => {
  const { x, y } = pos
  hoveredTile.value = { x, y }
}

// 瓦片鼠标离开事件
const handleTileMouseLeave = () => {
  hoveredTile.value = { x: -1, y: -1 }
}

// 瓦片双击事件处理
const handleTileDoubleClick = () => {
  const { x, y } = hoveredTile.value
  const ntiles = mapStore.ntiles
  if (x >= 0 && x < ntiles && y >= 0 && y < ntiles) {
    // 获取当前瓦片的id
    const currentTileId = mapStore.isoMap[x][y][0]
    
    // 根据瓦片id获取配置信息
    const tileConfig = mapConfig.tiles.find(tile => tile.id === currentTileId)
    
    // 检查是否是可收获的瓦片（根据配置文件中的harvest配置）
    if (tileConfig && tileConfig.harvest) {
      // 从配置中获取目标瓦片id和奖励
      const { targetId, reward } = tileConfig.harvest
      
      // 更新瓦片
      mapStore.updateTile(x, y, targetId)
      
      // 增加碳积分
      statsStore.updateCarbon(reward)
    }
  }
}

// 拖拽平移
const handleMouseDown = (e) => {
  if (e.button === 0) { // 左键拖拽
    isDragging = true
    lastMouseX = e.clientX
    lastMouseY = e.clientY
  }
}

const handleMouseMove = (e) => {
  if (isDragging) {
    const deltaX = e.clientX - lastMouseX
    const deltaY = e.clientY - lastMouseY
    
    mapStore.updatePan(deltaX, deltaY)
    
    lastMouseX = e.clientX
    lastMouseY = e.clientY
  }
}

const handleMouseUp = () => {
  if (isDragging) {
    isDragging = false
  }
}

// 滚轮缩放
const handleWheel = (e) => {
  e.preventDefault()
  
  // 根据画布大小调整缩放步长，大画布时使用更小的步长以便精细控制
  const baseStep = mapConfig.zoomStep
  const multiplier = mapStore.canvasSizeMultiplier
  // 大画布时缩小步长，但不要太小
  const adjustedStep = baseStep / Math.max(1, multiplier * 0.5)
  
  const delta = e.deltaY > 0 ? -adjustedStep : adjustedStep
  const minZoom = mapStore.minZoom
  const maxZoom = mapStore.maxZoom
  const newZoom = Math.max(minZoom, Math.min(maxZoom, mapStore.zoom + delta))
  
  // 如果缩放没有变化，直接返回
  if (newZoom === mapStore.zoom) return
  
  // 计算缩放中心点
  const rect = mapContainer.value.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  
  // 考虑容器中心到鼠标位置的偏移
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  // 计算鼠标相对于容器中心的偏移量
  const offsetX = mouseX - centerX
  const offsetY = mouseY - centerY
  
  // 调整平移位置以保持缩放中心点不变
  // 公式：新平移 = 旧平移 + (鼠标偏移量) * (旧缩放 - 新缩放)
  const panX = mapStore.panX + offsetX * (mapStore.zoom - newZoom)
  const panY = mapStore.panY + offsetY * (mapStore.zoom - newZoom)
  
  // 更新状态并保存到localStorage
  mapStore.zoom = newZoom
  mapStore.panX = panX
  mapStore.panY = panY
  mapStore.saveState()
}

// 键盘事件处理
const handleKeyDown = (event) => {
  // Esc 键取消选中的 tile
  if (event.key === 'Escape') {
    if (mapStore.selectedTileId !== null) {
      mapStore.selectTile(null)
    }
    // 退出选择模式
    if (mapStore.selectionMode) {
      mapStore.setSelectionMode(false)
    }
  }
  
  // Ctrl+Z 撤销
  if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    handleUndo()
  }
  
  // Ctrl+Y 或 Ctrl+Shift+Z 重做
  if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'z')) {
    event.preventDefault()
    handleRedo()
  }
}

// 撤销/重做
const canUndo = computed(() => {
  return mapStore.mapHistory && mapStore.mapHistory.canUndo()
})

const canRedo = computed(() => {
  return mapStore.mapHistory && mapStore.mapHistory.canRedo()
})

const handleUndo = () => {
  mapStore.undo()
}

const handleRedo = () => {
  mapStore.redo()
}

// 导出地图
const handleExportMap = () => {
  const mapData = mapStore.exportMap()
  const blob = new Blob([mapData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `map_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 导入地图
const handleImportMap = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const success = mapStore.importMap(e.target.result)
        if (success) {
          alert('地图导入成功！')
          // 重新加载纹理
          mapStore.loadTextures()
        } else {
          alert('地图导入失败，请检查文件格式')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

// 处理画布大小变化
const handleCanvasSizeChange = (multiplier) => {
  if (mapStore.canvasSizeMultiplier !== multiplier) {
    // 弹出确认对话框
    if (confirm(`确定要切换画布大小为 ${multiplier}x 吗？\n当前地图数据将被保留并居中放置，视图将自动调整以适应新画布。`)) {
      // setCanvasSizeMultiplier 内部已经处理了缩放和视图调整
      mapStore.setCanvasSizeMultiplier(multiplier)
      // 等待地图更新完成后再重新初始化精灵
      nextTick(() => {
        // 重新初始化精灵以适应新的画布大小
        initSprites()
      })
    }
  }
}

// 处理导入默认布局
const handleImportDefaultLayout = () => {
  // 检查当前画布大小是否支持默认布局
  if (![1, 2, 4, 8].includes(mapStore.canvasSizeMultiplier)) {
    alert('当前画布大小不支持默认布局')
    return
  }
  
  // 弹出确认对话框
  if (confirm(`确定要导入 ${mapStore.canvasSizeMultiplier}x 画布的默认布局吗？\n这将覆盖当前地图数据，且无法撤销。`)) {
    const success = mapStore.importDefaultLayout()
    if (success) {
      alert('默认布局导入成功！')
    } else {
      alert('默认布局导入失败，请检查画布大小')
    }
  }
}

// 事件监听
onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('keydown', handleKeyDown)
  
  if (mapContainer.value) {
    mapContainer.value.addEventListener('mousedown', handleMouseDown)
    mapContainer.value.addEventListener('wheel', handleWheel)
  }

  // 初始化地图数据和纹理
  mapStore.initMapData()
  mapStore.loadTextures()
  
  // 如果画布大小不是默认值，且缩放还是默认值1，自动调整缩放以适应画布
  if (mapStore.canvasSizeMultiplier !== 1 && mapStore.zoom === 1) {
    const fitZoom = mapStore.calculateFitZoom()
    mapStore.zoom = fitZoom
    mapStore.saveState()
  }
  
  // 等待地图完全初始化后再初始化精灵，确保能获取到完整的地图尺寸
  nextTick(() => {
    // 初始化精灵
    initSprites()
    
    // 启动随机精灵生成
    startRandomSpriteGeneration()
  })
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('keydown', handleKeyDown)
  
  if (mapContainer.value) {
    mapContainer.value.removeEventListener('mousedown', handleMouseDown)
    mapContainer.value.removeEventListener('wheel', handleWheel)
  }
  
  // 停止随机精灵生成
  stopRandomSpriteGeneration()
})

// 初始化精灵
const initSprites = () => {
  // 清除现有的精灵
  spriteStore.clearAllSprites()
  
  // 根据画布大小添加基础精灵
  const multiplier = mapStore.canvasSizeMultiplier || 1
  
  // 基础精灵数量：1x=1个，2x=2个，4x=4个，8x=8个
  const baseCount = multiplier
  
  // 添加猫
  for (let i = 0; i < baseCount; i++) {
    spriteStore.addSprite('cat')
  }
  
  // 添加人物（数量是猫的1.5倍，向上取整）
  const peopleCount = Math.ceil(baseCount * 1.5)
  for (let i = 0; i < peopleCount; i++) {
    spriteStore.addSprite('people')
  }
  
  // 如果画布较大（4x或8x），也添加一些狐狸
  if (multiplier >= 4) {
    const foxCount = Math.floor(multiplier / 2)
    for (let i = 0; i < foxCount; i++) {
      spriteStore.addSprite('fox')
    }
  }
}

</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
  cursor: grab;
  overflow: hidden;
}

.map-container:active {
  cursor: grabbing;
}

.map-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(1);
  transition: transform 0.1s ease;
  transform-origin: center center;
}

.map-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
}

.control-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 30px;
  background-color: white;
  color: #333;
  font-size: bold;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  background-color: #f0f0f0;
  transform: scale(1.1);
}

.control-icon {
  font-size: 1.5rem;
  font-weight: bold;
}

.sprites-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.sprite {
  position: absolute;
  pointer-events: none;
}

.sprite-image {
  display: block;
  image-rendering: pixelated; /* 保持像素风格 */
  user-select: none;
}

.tile-hover-tip {
  background-color: rgba(0, 0, 0, 0.7);
  color: #cdcdcd;
  border-radius: 5px;
  font-size: 8px;
  padding: 2px 5px;
}

.canvas-size-selector {
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 10;
  min-width: 140px;
}

.fill-mode-selector {
  position: absolute;
  top: 120px;
  right: 20px;
  background-color: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 10;
  min-width: 140px;
}

.selector-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.selector-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.size-btn {
  flex: 1;
  min-width: 50px;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f5f5f5;
  color: #333;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.size-btn:hover {
  background-color: #e0e0e0;
  transform: translateY(-1px);
}

.size-btn.active {
  background-color: #4caf50;
  color: white;
  border-color: #4caf50;
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
}

.mode-btn {
  flex: 1;
  min-width: 40px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f5f5f5;
  color: #333;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-btn:hover {
  background-color: #e0e0e0;
  transform: translateY(-1px);
}

.mode-btn.active {
  background-color: #2196f3;
  color: white;
  border-color: #2196f3;
  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);
}

</style>