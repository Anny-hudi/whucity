<template>
  <div class="map-container" ref="mapContainer">
    <div 
      class="map-wrapper"
      :style="{
        transform: `translate(-50%, -50%) translate(${mapStore.panX}px, ${mapStore.panY}px) scale(${mapStore.zoom})`,
        transformOrigin: 'center center'
      }"
    >
      <!-- Canvas for isometric map rendering -->
      <canvas ref="bgCanvas" id="bg" class="isometric-canvas"></canvas>
      <canvas ref="fgCanvas" id="fg" class="isometric-canvas"></canvas>
    </div>
    
    <!-- 控制按钮 -->
    <div class="map-controls">
      <button @click="mapStore.zoomIn" class="control-btn">
        <span class="control-icon mdi mdi-plus"></span>
      </button>
      <button @click="mapStore.zoomOut" class="control-btn">
        <span class="control-icon mdi mdi-minus"></span>
      </button>
      <button @click="mapStore.resetView" class="control-btn">
        <span class="control-icon mdi mdi-refresh"></span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { useMapStore } from '../../store/map'

// 使用地图 store
const mapStore = useMapStore()
const mapContainer = ref(null)
const bgCanvas = ref(null)
const fgCanvas = ref(null)

// 地图参数
const mapParams = reactive({
  canvasWidth: 910,
  canvasHeight: 666,
  texWidth: 12,
  texHeight: 6,
  tileWidth: 128,
  tileHeight: 64,
  ntiles: 7,
  w: 910,
  h: 462
})

// 画布上下文
let bg, fg, cf

// 纹理图像集合
const textures = {}

// 拖拽状态
let isDragging = false
let lastMouseX = 0
let lastMouseY = 0

// 放置状态
let isPlacing = false

// 初始化地图数据
const initMapData = () => {
  // 使用 mapStore 中的地图数据
  if (!mapStore.isoMap) {
    mapStore.isoMap = Array(mapParams.ntiles).fill().map(() => 
      Array(mapParams.ntiles).fill().map(() => [1, 0]) // 默认使用 plant-1.jpg (索引1) 作为地基
    )
  }
}

// 初始化画布
const initCanvas = () => {
  if (!bgCanvas.value || !fgCanvas.value) return

  // 背景画布
  bgCanvas.value.width = mapParams.canvasWidth
  bgCanvas.value.height = mapParams.canvasHeight
  bg = bgCanvas.value.getContext('2d')
  bg.translate(mapParams.w / 2, mapParams.h / 2)

  // 前景画布
  fgCanvas.value.width = mapParams.canvasWidth
  fgCanvas.value.height = mapParams.canvasHeight
  fg = fgCanvas.value.getContext('2d')
  cf = fg
  fg.translate(mapParams.w / 2, mapParams.h / 2)

  // 加载纹理图像
  const imageFiles = ['architecture-1.png', 'plant-1.jpg', 'plant-2.png', 'plant-3.png', 'road-1.jpg', 'road-2.jpg', 'road-3.jpg', 'road-4.png', 'road-5.png', 'sea-1.jpg']
  let loadedImages = 0
  
  imageFiles.forEach((fileName) => {
    const img = new Image()
    img.src = `/images/${fileName}`
    
    // 使用文件名（去除扩展名）作为纹理ID
    const textureId = fileName.split('.')[0]
    textures[textureId] = img
    
    img.onload = () => {
      loadedImages++
      if (loadedImages === imageFiles.length) {
        drawMap()
      }
    }
  })

  // 添加事件监听
  fgCanvas.value.addEventListener('mousemove', viz)
  fgCanvas.value.addEventListener('contextmenu', e => e.preventDefault())
  fgCanvas.value.addEventListener('mouseup', unclick)
  fgCanvas.value.addEventListener('mousedown', click)
}

// 获取鼠标在地图上的位置
const getPosition = (e) => {
  // 获取前景画布的变换后位置信息
  const rect = fgCanvas.value.getBoundingClientRect()
  
  // 计算鼠标相对于变换后画布的位置
  let mouseX = e.clientX - rect.left
  let mouseY = e.clientY - rect.top
  
  // 考虑画布的缩放（由 map-wrapper 的 scale 变换引起）
  const zoom = mapStore.zoom
  
  // 缩放还原鼠标位置
  mouseX /= zoom
  mouseY /= zoom
  
  // 应用画布上下文的平移变换（在 initCanvas 中设置的 translate）
  const translatedX = mouseX - mapParams.w / 2
  const translatedY = mouseY - mapParams.h / 2
  
  // 转换为等轴测坐标
  const _y = translatedY / mapParams.tileHeight
  const _x = translatedX / mapParams.tileWidth
  const x = Math.floor(_y - _x)
  const y = Math.floor(_x + _y)
  
  return { x, y }
}

// 绘制地图
const drawMap = () => {
  if (!bg) return
  
  bg.clearRect(-mapParams.w, -mapParams.h, mapParams.w * 2, mapParams.h * 2)
  
  for (let i = 0; i < mapParams.ntiles; i++) {
    for (let j = 0; j < mapParams.ntiles; j++) {
      drawImageTile(bg, i, j, mapStore.isoMap[i][j][0], mapStore.isoMap[i][j][1])
    }
  }
}

// 绘制图像瓦片
const drawImageTile = (c, x, y, tileId, layer) => {
  // 获取纹理ID列表
  const textureIds = Object.keys(textures)
  if (tileId >= textureIds.length) return
  
  const textureId = textureIds[tileId]
  const texture = textures[textureId]
  
  if (!texture || !texture.complete) return
  
  c.save()
  c.translate((y - x) * mapParams.tileWidth / 2, (x + y) * mapParams.tileHeight / 2)
  
  // 绘制图像，以瓦片中心为原点，匹配参考图像的等轴测透视
  // 参考图像显示菱形瓦片，顶部和侧面可见
  c.drawImage(
    texture, 
    0, 0, texture.width, texture.height, 
    -mapParams.tileWidth / 2, -mapParams.tileHeight, 
    mapParams.tileWidth, mapParams.tileHeight
  )
  
  c.restore()
}

// 绘制瓦片（用于选择效果）
const drawTile = (c, x, y, color) => {
  c.save()
  c.translate((y - x) * mapParams.tileWidth / 2, (x + y) * mapParams.tileHeight / 2)
  c.beginPath()
  c.moveTo(0, 0)
  c.lineTo(mapParams.tileWidth / 2, mapParams.tileHeight / 2)
  c.lineTo(0, mapParams.tileHeight)
  c.lineTo(-mapParams.tileWidth / 2, mapParams.tileHeight / 2)
  c.closePath()
  c.fillStyle = color
  c.fill()
  c.restore()
}

// 点击事件
const click = (e) => {
  const pos = getPosition(e)
  if (pos.x >= 0 && pos.x < mapParams.ntiles && pos.y >= 0 && pos.y < mapParams.ntiles) {
    const textureCount = Object.keys(textures).length
    
    if (e.which === 3) {
      // 右键清除瓦片
      mapStore.isoMap[pos.x][pos.y][0] = 0
      mapStore.isoMap[pos.x][pos.y][1] = 0
    } else {
      // 左键放置或循环切换瓦片
      const currentTile = mapStore.isoMap[pos.x][pos.y][0]
      // 使用选中的瓦片或循环切换
      const newTile = mapStore.selectedTile !== null ? mapStore.selectedTile : (currentTile + 1) % textureCount
      mapStore.isoMap[pos.x][pos.y][0] = newTile
      mapStore.isoMap[pos.x][pos.y][1] = 1 // 设置图层
    }
    
    isPlacing = true
    drawMap()
    cf.clearRect(-mapParams.w, -mapParams.h, mapParams.w * 2, mapParams.h * 2)
  }
}

// 释放鼠标事件
const unclick = () => {
  if (isPlacing) {
    isPlacing = false
  }
}

// 鼠标移动事件
const viz = (e) => {
  if (isPlacing) {
    click(e)
  }
  const pos = getPosition(e)
  cf.clearRect(-mapParams.w, -mapParams.h, mapParams.w * 2, mapParams.h * 2)
  if (pos.x >= 0 && pos.x < mapParams.ntiles && pos.y >= 0 && pos.y < mapParams.ntiles) {
    drawTile(cf, pos.x, pos.y, 'rgba(0,0,0,0.2)')
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
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newZoom = Math.max(0.5, Math.min(2, mapStore.zoom + delta))
  
  // 计算缩放中心点
  const rect = mapContainer.value.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  
  // 调整平移位置以保持缩放中心点不变
  const panX = mapStore.panX + mouseX * (mapStore.zoom - newZoom)
  const panY = mapStore.panY + mouseY * (mapStore.zoom - newZoom)
  
  mapStore.zoom = newZoom
  mapStore.panX = panX
  mapStore.panY = panY
}

// 事件监听
onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
  
  if (mapContainer.value) {
    mapContainer.value.addEventListener('mousedown', handleMouseDown)
    mapContainer.value.addEventListener('wheel', handleWheel)
  }

  // 初始化地图数据和画布
  initMapData()
  initCanvas()
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  
  if (mapContainer.value) {
    mapContainer.value.removeEventListener('mousedown', handleMouseDown)
    mapContainer.value.removeEventListener('wheel', handleWheel)
  }

  if (fgCanvas.value) {
    fgCanvas.value.removeEventListener('mousemove', viz)
    fgCanvas.value.removeEventListener('contextmenu', e => e.preventDefault())
    fgCanvas.value.removeEventListener('mouseup', unclick)
    fgCanvas.value.removeEventListener('mousedown', click)
  }
})
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
  cursor: grab;
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
}

.isometric-canvas {
  position: absolute;
  top: 0;
  left: 0;
  cursor: pointer;
}

#bg {
  z-index: 1;
}

#fg {
  z-index: 2;
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
</style>