import { defineStore } from 'pinia'
import { mapConfig } from '../config/map'
import { useStatsStore } from './stats'
import { useExchangeStore } from './exchange'
import { MapHistory } from './mapHistory'

const DEFAULT_PAN_X = -100
const DEFAULT_PAN_Y = -250

// 每个瓦片的中心点是 x
export const OFFSET_X = 128 / 2
export const OFFSET_Y = 128 / 3.1


export const useMapStore = defineStore('map', {
  state: () => {
    // 从localStorage加载状态，如果没有则使用默认值
    const savedState = localStorage.getItem(mapConfig.storageKey)
    const parsedState = savedState ? JSON.parse(savedState) : {}
    
    return {
      tiles: mapConfig.tiles,
      selectedTileId: parsedState.selectedTileId || null,
      zoom: parsedState.zoom || 1,
      panX: parsedState.panX || DEFAULT_PAN_X,
      panY: parsedState.panY || DEFAULT_PAN_Y,
      mapSize: parsedState.mapSize || {
        width: 20,
        height: 20
      },
      // Isometric map data - 2D array of [textureY, textureX] pairs
      isoMap: parsedState.isoMap || null,
      // 纹理图像集合
      textures: {},
      // 纹理透明度数据，存储每个纹理的像素透明度信息
      textureTransparency: {},
      // 地图编辑历史（用于撤销/重做）
      mapHistory: null,
      // 批量选择状态
      selectionMode: false,
      selectedTiles: [] // [{x, y}, ...]
    }
  },
  
  getters: {
    // 获取选中的瓦片
    selectedTileData: (state) => {
      return state.selectedTileId !== null ? state.tiles.find(tile => tile.id === state.selectedTileId) : null
    },
    // 计算id为4的方块数量
    tile4Count: (state) => {
      if (!state.isoMap) return 0
      let count = 0
      for (let x = 0; x < state.isoMap.length; x++) {
        for (let y = 0; y < state.isoMap[x].length; y++) {
          if (state.isoMap[x][y] && state.isoMap[x][y][0] === 4) {
            count++
          }
        }
      }
      return count
    }
  },
  
  actions: {
    // 保存状态到localStorage
    saveState() {
      localStorage.setItem(mapConfig.storageKey, JSON.stringify({
        selectedTileId: this.selectedTileId,
        zoom: this.zoom,
        panX: this.panX,
        panY: this.panY,
        mapSize: this.mapSize,
        isoMap: this.isoMap
      }))
    },
    
    // 选择瓦片
    selectTile(tileId) {
      this.selectedTileId = tileId
      this.saveState()
    },
    
    // 放大地图
    zoomIn() {
      if (this.zoom < 3) {
        this.zoom += 0.2
        this.saveState()
      }
    },
    
    // 缩小地图
    zoomOut() {
      if (this.zoom > 0.5) {
        this.zoom -= 0.2
        this.saveState()
      }
    },
    
    // 重置视图
    resetView() {
      this.zoom = 1
      this.panX = DEFAULT_PAN_X
      this.panY = DEFAULT_PAN_Y
      this.selectedTileId = null
      this.saveState()
    },
    
    // 更新平移位置
    updatePan(x, y) {
      this.panX += x
      this.panY += y
      this.saveState()
    },
    
    // 添加新瓦片到地图
    addTile(tile) {
      this.tiles.push({
        id: Date.now(),
        ...tile
      })
      this.saveState()
    },
    
    // 清除地图缓存
    clearCache() {
      localStorage.removeItem(mapConfig.storageKey)
      this.selectedTileId = null
      this.zoom = 1
      this.panX = 0
      this.panY = 0
      this.isoMap = null
    },
    
    // 更新瓦片
    updateTile(x, y, tileId, height = 1) {
      if (this.isoMap && this.isoMap[x] && this.isoMap[x][y]) {
        // 获取旧的瓦片ID
        const oldTileId = this.isoMap[x][y][0]
        
        // 更新地图瓦片
        this.isoMap[x][y][0] = tileId
        this.isoMap[x][y][1] = height
        
        // 应用物品效果
        const statsStore = useStatsStore()
        const exchangeStore = useExchangeStore()
        
        // 如果替换了旧瓦片，先移除旧瓦片的效果和value
        if (oldTileId > 0) {
          const oldItem = exchangeStore.exchangeItems.find(item => item.id === oldTileId)
          if (oldItem) {
            // 移除旧value
            if (oldItem.value) {
              if (oldItem.value.biodiversity) statsStore.updateBiodiversity(-oldItem.value.biodiversity)
              if (oldItem.value.culture) statsStore.updateCulture(-oldItem.value.culture)
            }
          }
        }
        
        // 应用新瓦片的效果和value
        if (tileId > 0) {
          const newItem = exchangeStore.exchangeItems.find(item => item.id === tileId)
          if (newItem) {
            // 应用新value
            if (newItem.value) {
              if (newItem.value.biodiversity) statsStore.updateBiodiversity(newItem.value.biodiversity)
              if (newItem.value.culture) statsStore.updateCulture(newItem.value.culture)
            }
            // 扣掉新物品的价格
            statsStore.updateCarbon(-newItem.price)
          }
        }
        
        this.saveState()
      }
    },
    
    // 初始化地图数据
    initMapData() {
      // 使用 mapStore 中的地图数据
      if (!this.isoMap) {
        this.isoMap = Array(mapConfig.ntiles).fill().map(() => 
          Array(mapConfig.ntiles).fill().map(() => [1, 0]) // 默认使用 plant-1.jpg (索引1) 作为地基，初始未翻转
        )
        // 保存初始地图数据到localStorage
        this.saveState()
      }
      
      // 初始化地图历史
      if (!this.mapHistory) {
        this.mapHistory = new MapHistory(50)
        // 添加初始状态到历史
        this.mapHistory.addHistory({ isoMap: JSON.parse(JSON.stringify(this.isoMap)) })
      }
      
      // 重新计算所有瓦片的效果
      this.recalculateEffects()
    },
    
    // 保存当前状态到历史
    saveToHistory() {
      if (this.mapHistory) {
        this.mapHistory.addHistory({ isoMap: JSON.parse(JSON.stringify(this.isoMap)) })
      }
    },
    
    // 计算所有瓦片的效果
    recalculateEffects() {
      const statsStore = useStatsStore()
      const exchangeStore = useExchangeStore()
      
      // 重置所有统计值
      statsStore.resetStats()
      
      // 重新计算所有瓦片的效果
      for (let x = 0; x < this.isoMap.length; x++) {
          for (let y = 0; y < this.isoMap[x].length; y++) {
            const tileId = this.isoMap[x][y][0]
            if (tileId > 0) {
              const item = exchangeStore.exchangeItems.find(item => item.id === tileId)
              if (item) {
                // 应用value
                if (item.value) {
                  if (item.value.biodiversity) statsStore.updateBiodiversity(item.value.biodiversity)
                  if (item.value.culture) statsStore.updateCulture(item.value.culture)
                }
              }
            }
          }
        }
    },
    
    // 撤销
    undo() {
      if (this.mapHistory && this.mapHistory.canUndo()) {
        const state = this.mapHistory.undo()
        if (state) {
          this.isoMap = state.isoMap
          this.saveState()
          // 重新计算所有瓦片的效果
          this.recalculateEffects()
          return true
        }
      }
      return false
    },
    
    // 重做
    redo() {
      if (this.mapHistory && this.mapHistory.canRedo()) {
        const state = this.mapHistory.redo()
        if (state) {
          this.isoMap = state.isoMap
          this.saveState()
          // 重新计算所有瓦片的效果
          this.recalculateEffects()
          return true
        }
      }
      return false
    },
    
    // 批量更新瓦片
    batchUpdateTiles(tiles, tileId, height = 1) {
      // 保存到历史
      this.saveToHistory()
      
      // 获取统计和兑换物品数据
      const statsStore = useStatsStore()
      const exchangeStore = useExchangeStore()
      
      tiles.forEach(({ x, y }) => {
        if (this.isoMap && this.isoMap[x] && this.isoMap[x][y]) {
          // 获取旧的瓦片ID
          const oldTileId = this.isoMap[x][y][0]
          
          // 更新地图瓦片
          this.isoMap[x][y][0] = tileId
          this.isoMap[x][y][1] = height
          
          // 如果替换了旧瓦片，先移除旧瓦片的效果和value
          if (oldTileId > 0) {
            const oldItem = exchangeStore.exchangeItems.find(item => item.id === oldTileId)
            if (oldItem) {
              // 移除旧效果
              if (oldItem.effects) {
                if (oldItem.effects.carbon) statsStore.updateCarbon(-oldItem.effects.carbon)
                if (oldItem.effects.biodiversity) statsStore.updateBiodiversity(-oldItem.effects.biodiversity)
                if (oldItem.effects.culture) statsStore.updateCulture(-oldItem.effects.culture)
              }
              // 移除旧value
              if (oldItem.value) {
                if (oldItem.value.biodiversity) statsStore.updateBiodiversity(-oldItem.value.biodiversity)
                if (oldItem.value.culture) statsStore.updateCulture(-oldItem.value.culture)
              }
            }
          }
          
          // 应用新瓦片的效果和value
          if (tileId > 0) {
            const newItem = exchangeStore.exchangeItems.find(item => item.id === tileId)
            if (newItem) {
              // 应用新效果
              if (newItem.effects) {
                if (newItem.effects.carbon) statsStore.updateCarbon(newItem.effects.carbon)
                if (newItem.effects.biodiversity) statsStore.updateBiodiversity(newItem.effects.biodiversity)
                if (newItem.effects.culture) statsStore.updateCulture(newItem.effects.culture)
              }
              // 应用新value
              if (newItem.value) {
                if (newItem.value.biodiversity) statsStore.updateBiodiversity(newItem.value.biodiversity)
                if (newItem.value.culture) statsStore.updateCulture(newItem.value.culture)
              }
            }
          }
        }
      })
      
      this.saveState()
    },
    
    // 批量清除瓦片
    batchClearTiles(tiles) {
      // 保存到历史
      this.saveToHistory()
      
      // 获取统计和兑换物品数据
      const statsStore = useStatsStore()
      const exchangeStore = useExchangeStore()
      
      tiles.forEach(({ x, y }) => {
        if (this.isoMap && this.isoMap[x] && this.isoMap[x][y]) {
          // 获取旧的瓦片ID
          const oldTileId = this.isoMap[x][y][0]
          
          // 清除瓦片
          this.isoMap[x][y][0] = 0
          this.isoMap[x][y][1] = 0
          
          // 移除旧瓦片的效果和value
          if (oldTileId > 0) {
            const oldItem = exchangeStore.exchangeItems.find(item => item.id === oldTileId)
            if (oldItem) {
              // 移除效果
              if (oldItem.effects) {
                if (oldItem.effects.carbon) statsStore.updateCarbon(-oldItem.effects.carbon)
                if (oldItem.effects.biodiversity) statsStore.updateBiodiversity(-oldItem.effects.biodiversity)
                if (oldItem.effects.culture) statsStore.updateCulture(-oldItem.effects.culture)
              }
              // 移除value
              if (oldItem.value) {
                if (oldItem.value.biodiversity) statsStore.updateBiodiversity(-oldItem.value.biodiversity)
                if (oldItem.value.culture) statsStore.updateCulture(-oldItem.value.culture)
              }
            }
          }
        }
      })
      
      this.saveState()
    },
    
    // 设置选择模式
    setSelectionMode(enabled) {
      this.selectionMode = enabled
      if (!enabled) {
        this.selectedTiles = []
      }
    },
    
    // 添加选中的瓦片
    addSelectedTile(x, y) {
      if (!this.selectedTiles.find(t => t.x === x && t.y === y)) {
        this.selectedTiles.push({ x, y })
      }
    },
    
    // 移除选中的瓦片
    removeSelectedTile(x, y) {
      const index = this.selectedTiles.findIndex(t => t.x === x && t.y === y)
      if (index !== -1) {
        this.selectedTiles.splice(index, 1)
      }
    },
    
    // 清空选择
    clearSelection() {
      this.selectedTiles = []
    },
    
    // 导出地图数据
    exportMap() {
      return JSON.stringify({
        isoMap: this.isoMap,
        mapSize: this.mapSize,
        version: '1.0',
        exportTime: new Date().toISOString()
      }, null, 2)
    },
    
    // 导入地图数据
    importMap(mapDataString) {
      try {
        const data = JSON.parse(mapDataString)
        if (data.isoMap) {
          // 保存到历史
          this.saveToHistory()
          
          this.isoMap = data.isoMap
          if (data.mapSize) {
            this.mapSize = data.mapSize
          }
          this.saveState()
          
          // 重新计算所有瓦片的效果
          this.recalculateEffects()
          return true
        }
      } catch (error) {
        console.error('导入地图失败:', error)
        return false
      }
      return false
    },
    
    // 加载纹理
    loadTextures() {
      // 创建临时canvas用于处理纹理透明度
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      mapConfig.tiles.forEach((tile) => {
        const img = new Image()
        img.src = tile.image
        
        // 使用瓦片ID作为纹理ID
        this.textures[tile.id] = img
        
        // 处理纹理透明度
        const processTexture = () => {
          // 设置canvas大小为纹理大小
          canvas.width = img.width
          canvas.height = img.height
          
          // 清空画布
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // 绘制纹理到canvas
          ctx.drawImage(img, 0, 0)
          
          // 获取像素数据
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          
          // 存储透明度数据（只存储alpha通道）
          const alphaData = new Uint8Array(canvas.width * canvas.height)
          for (let i = 0; i < data.length; i += 4) {
            alphaData[i / 4] = data[i + 3] // 只存储alpha通道值
          }
          
          // 存储纹理透明度数据，包含原始图像尺寸
          this.textureTransparency[tile.id] = {
            width: canvas.width,
            height: canvas.height,
            alphaData: alphaData
          }
        }
        
        if (img.complete) {
          processTexture()
        } else {
          img.onload = processTexture
        }
      })
    },
    
    // 判断指定位置的像素是否为非透明像素
    isPixelNonTransparent(tileId, mouseX, mouseY, tileWidth, tileHeight, isFlipped = false) {
      // 获取纹理透明度数据
      const textureData = this.textureTransparency[tileId]
      if (!textureData) {
        return false
      }
      
      const { width: texWidth, height: texHeight, alphaData } = textureData
      
      // 计算纹理在瓦片上的绘制区域（居中、等比例缩放）
      const scale = Math.max(tileWidth / texWidth, tileHeight / texHeight)
      const drawWidth = texWidth * scale
      const drawHeight = texHeight * scale
      const offsetX = (tileWidth - drawWidth) / 2
      const offsetY = (tileHeight - drawHeight) / 2
      
      // 将鼠标坐标转换为纹理上的相对坐标
      let texX = (mouseX - offsetX) / scale
      let texY = (mouseY - offsetY) / scale
      
      // 应用翻转
      if (isFlipped) {
        texX = texWidth - texX
      }
      
      // 确保坐标在有效范围内
      if (texX < 0 || texY < 0 || texX >= texWidth || texY >= texHeight) {
        return false
      }
      
      // 计算数组索引
      const x = Math.round(texX)
      const y = Math.round(texY)
      const index = y * texWidth + x
      
      // 检查透明度（大于100视为非透明）
      return alphaData[index] > 100
    }
  }
})