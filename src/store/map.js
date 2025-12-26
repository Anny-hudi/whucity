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
    
    // 检查保存的地图大小是否与保存的画布倍数匹配
    const savedMultiplier = parsedState.canvasSizeMultiplier || 1
    const expectedSize = mapConfig.ntiles * savedMultiplier
    const savedMapSize = parsedState.isoMap?.length || 0
    
    // 如果保存的地图大小与期望大小不匹配，不加载isoMap（让initMapData重新初始化）
    const isoMap = (savedMapSize === expectedSize && parsedState.isoMap) ? parsedState.isoMap : null
    
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
      // 画布大小倍数：1（默认）、2、4、8
      canvasSizeMultiplier: parsedState.canvasSizeMultiplier || 1,
      // 填充模式：'single'（单个）、'row'（整行）、'column'（整列）
      fillMode: parsedState.fillMode || 'single',
      // Isometric map data - 2D array of [textureY, textureX] pairs
      // 如果大小不匹配，设为null，让initMapData重新初始化
      isoMap: isoMap,
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
    },
    // 动态计算地图瓦片数量（基于倍数）
    ntiles: (state) => {
      return mapConfig.ntiles * state.canvasSizeMultiplier
    },
    // 动态计算最小缩放级别（根据画布大小调整）
    minZoom: (state) => {
      const { tileWidth, tileHeight, containerWidth, containerHeight } = mapConfig
      const ntiles = mapConfig.ntiles * state.canvasSizeMultiplier
      
      // 计算地图的实际尺寸（等轴测投影）
      const mapWidth = ntiles * tileWidth
      const mapHeight = ntiles * tileHeight * 2 / 3.1
      
      // 计算能够完整显示整个地图的缩放比例（不留边距，确保能看到全部）
      const scaleX = containerWidth / mapWidth
      const scaleY = containerHeight / mapHeight
      
      // 选择较小的缩放比例，确保地图完全可见
      const fitZoom = Math.min(scaleX, scaleY)
      
      // 最小缩放应该是 fitZoom 的 60%，允许用户缩得更小一点以便看到更多细节
      // 但不要小于 0.05（对于超大画布），也不要小于配置的最小值（对于小画布）
      const calculatedMinZoom = fitZoom * 0.6
      // 对于大画布，允许更小的缩放；对于小画布，使用配置的最小值
      const baseMinZoom = state.canvasSizeMultiplier >= 4 ? 0.05 : mapConfig.minZoom
      return Math.max(baseMinZoom, calculatedMinZoom)
    },
    // 动态计算最大缩放级别（根据画布大小调整）
    maxZoom: (state) => {
      // 基础最大缩放
      const baseMaxZoom = mapConfig.maxZoom
      // 大画布时允许放得更大，但不要超过 3
      return Math.min(baseMaxZoom * (1 + state.canvasSizeMultiplier * 0.1), 3)
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
        canvasSizeMultiplier: this.canvasSizeMultiplier,
        fillMode: this.fillMode,
        isoMap: this.isoMap
      }))
    },
    
    // 选择瓦片
    selectTile(tileId) {
      this.selectedTileId = tileId
      this.saveState()
    },
    
    // 设置填充模式
    setFillMode(mode) {
      if (['single', 'row', 'column'].includes(mode)) {
        this.fillMode = mode
        this.saveState()
      }
    },
    
    // 填充整行
    fillRow(row, tileId, height = 1) {
      if (!this.isoMap || row < 0 || row >= this.isoMap.length) return
      
      const ntiles = this.ntiles
      const tiles = []
      for (let y = 0; y < ntiles; y++) {
        tiles.push({ x: row, y })
      }
      this.batchUpdateTiles(tiles, tileId, height)
    },
    
    // 填充整列
    fillColumn(col, tileId, height = 1) {
      if (!this.isoMap || col < 0 || col >= (this.isoMap[0]?.length || 0)) return
      
      const ntiles = this.ntiles
      const tiles = []
      for (let x = 0; x < ntiles; x++) {
        tiles.push({ x, y: col })
      }
      this.batchUpdateTiles(tiles, tileId, height)
    },
    
    // 放大地图
    zoomIn() {
      const maxZoom = this.maxZoom
      if (this.zoom < maxZoom) {
        // 根据画布大小调整缩放步长
        const baseStep = mapConfig.zoomStep
        const multiplier = this.canvasSizeMultiplier
        const adjustedStep = baseStep / Math.max(1, multiplier * 0.5)
        this.zoom = Math.min(this.zoom + adjustedStep, maxZoom)
        this.saveState()
      }
    },
    
    // 缩小地图
    zoomOut() {
      const minZoom = this.minZoom
      if (this.zoom > minZoom) {
        // 根据画布大小调整缩放步长
        const baseStep = mapConfig.zoomStep
        const multiplier = this.canvasSizeMultiplier
        const adjustedStep = baseStep / Math.max(1, multiplier * 0.5)
        this.zoom = Math.max(this.zoom - adjustedStep, minZoom)
        this.saveState()
      }
    },
    
    // 计算适合的缩放级别（使地图适应容器）
    calculateFitZoom() {
      const { tileWidth, tileHeight, containerWidth, containerHeight } = mapConfig
      const ntiles = this.ntiles
      
      // 计算地图的实际尺寸（等轴测投影）
      // 在等轴测投影中，地图的边界计算：
      // 最左点：x = -(ntiles-1) * (tileWidth/2)
      // 最右点：x = (ntiles-1) * (tileWidth/2)
      // 地图宽度 = ntiles * tileWidth
      const mapWidth = ntiles * tileWidth
      
      // 最上点：y = 0
      // 最下点：y = (ntiles-1 + ntiles-1) * (tileHeight/3.1) = 2*(ntiles-1) * (tileHeight/3.1)
      // 地图高度 ≈ ntiles * tileHeight * 2 / 3.1
      const mapHeight = ntiles * tileHeight * 2 / 3.1
      
      // 计算缩放比例，留出一些边距（15%），让地图不会紧贴边缘
      const margin = 0.15
      const scaleX = (containerWidth * (1 - margin)) / mapWidth
      const scaleY = (containerHeight * (1 - margin)) / mapHeight
      
      // 选择较小的缩放比例，确保地图完全可见
      const fitZoom = Math.min(scaleX, scaleY)
      
      // 确保缩放级别在允许范围内，并且不小于最小缩放
      return Math.max(this.minZoom, Math.min(fitZoom, this.maxZoom))
    },
    
    // 重置视图
    resetView() {
      // 根据画布大小计算合适的缩放级别
      const fitZoom = this.calculateFitZoom()
      this.zoom = fitZoom
      
      // 重置平移位置到中心
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
        
        // 创建新的数组对象，而不是直接修改现有数组元素
        // 这样可以确保 Vue 响应式系统正确追踪变化，避免引用共享问题
        this.isoMap[x][y] = [tileId, height]
        
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
    
    // 获取默认地图布局（根据画布大小返回不同的布局）
    getDefaultMapLayout() {
      const multiplier = this.canvasSizeMultiplier
      const ntiles = this.ntiles
      
      if (multiplier === 1) {
        return this.getDefaultLayout1x()
      } else if (multiplier === 2) {
        return this.getDefaultLayout2x()
      } else if (multiplier === 4) {
        return this.getDefaultLayout4x()
      } else if (multiplier === 8) {
        return this.getDefaultLayout8x()
      }
      
      // 默认返回空草坪
      return Array(ntiles).fill().map(() => 
        Array(ntiles).fill().map(() => [1, 0])
      )
    },
    
    // 1x画布布局 (7x7)
    getDefaultLayout1x() {
      return [
        [[1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0]],
        [[1, 0], [4, 0], [1, 0], [1, 0], [1, 0], [4, 0], [1, 0]],
        [[1, 0], [1, 0], [10, 0], [13, 0], [12, 0], [1, 0], [1, 0]],
        [[1, 0], [1, 0], [13, 0], [11, 0], [13, 0], [1, 0], [1, 0]],
        [[1, 0], [1, 0], [12, 0], [13, 0], [10, 0], [1, 0], [1, 0]],
        [[1, 0], [4, 0], [1, 0], [1, 0], [1, 0], [4, 0], [1, 0]],
        [[1, 0], [1, 0], [1, 0], [8, 0], [1, 0], [1, 0], [1, 0]]
      ]
    },
    
    // 2x画布布局 (14x14) - 更丰富的布局
    getDefaultLayout2x() {
      const size = 14
      // 使用植物1作为基础填充，而不是草坪1
      const map = Array(size).fill().map(() => Array(size).fill().map(() => [4, 0]))
      
      // 中心区域 - 建筑群
      // 第一排建筑
      map[5][5] = [10, 0]  // 宿舍
      map[5][6] = [13, 0]  // 道路
      map[5][7] = [11, 0]  // 商店
      map[5][8] = [15, 0]  // 道路2-1
      map[5][9] = [12, 0]  // 教学楼
      
      // 第二排建筑
      map[6][5] = [13, 0]  // 道路
      map[6][6] = [6, 0]   // 石路1
      map[6][7] = [6, 0]   // 石路1
      map[6][8] = [7, 0]   // 石路2
      map[6][9] = [16, 0]  // 道路2-2
      
      map[7][5] = [12, 0]  // 教学楼
      map[7][6] = [6, 0]   // 石路1
      map[7][7] = [11, 0]  // 商店
      map[7][8] = [7, 0]   // 石路2
      map[7][9] = [10, 0]  // 宿舍
      
      map[8][5] = [17, 0]  // 道路2-3
      map[8][6] = [6, 0]   // 石路1
      map[8][7] = [7, 0]   // 石路2
      map[8][8] = [6, 0]   // 石路1
      map[8][9] = [13, 0]  // 道路
      
      map[9][5] = [10, 0]  // 宿舍
      map[9][6] = [19, 0]  // 道路3-1
      map[9][7] = [12, 0]  // 教学楼
      map[9][8] = [13, 0]  // 道路
      map[9][9] = [11, 0]  // 商店
      
      // 水域区域 - 左下角（扩大）
      map[10][0] = [8, 0]   // 水域1
      map[10][1] = [9, 0]   // 水域2
      map[10][2] = [8, 0]   // 水域1
      map[10][3] = [9, 0]   // 水域2
      map[11][0] = [9, 0]  // 水域2
      map[11][1] = [8, 0]  // 水域1
      map[11][2] = [9, 0]  // 水域2
      map[11][3] = [8, 0]  // 水域1
      map[12][0] = [8, 0]  // 水域1
      map[12][1] = [9, 0]  // 水域2
      map[12][2] = [8, 0]  // 水域1
      map[13][0] = [9, 0]  // 水域2
      map[13][1] = [8, 0]  // 水域1
      map[13][2] = [9, 0]  // 水域2
      
      // 水域区域 - 右上角（扩大）
      map[0][11] = [9, 0]   // 水域2
      map[0][12] = [8, 0]  // 水域1
      map[0][13] = [9, 0]  // 水域2
      map[1][10] = [8, 0]   // 水域1
      map[1][11] = [9, 0]   // 水域2
      map[1][12] = [8, 0]  // 水域1
      map[1][13] = [9, 0]  // 水域2
      map[2][11] = [8, 0]  // 水域1
      map[2][12] = [9, 0]  // 水域2
      map[2][13] = [8, 0]  // 水域1
      map[3][12] = [9, 0]  // 水域2
      map[3][13] = [8, 0]  // 水域1
      
      // 道路网络 - 连接各个区域（使用多种道路变体）
      // 横向主干道
      for (let i = 0; i < size; i++) {
        if (map[6][i][0] === 4) {
          map[6][i] = [i % 3 === 0 ? 13 : (i % 3 === 1 ? 15 : 17), 0]  // 交替使用不同道路
        }
        if (map[8][i][0] === 4) {
          map[8][i] = [i % 3 === 0 ? 16 : (i % 3 === 1 ? 18 : 19), 0]
        }
      }
      
      // 纵向主干道
      for (let i = 0; i < size; i++) {
        if (map[i][6][0] === 4) {
          map[i][6] = [i % 3 === 0 ? 13 : (i % 3 === 1 ? 20 : 21), 0]
        }
        if (map[i][8][0] === 4) {
          map[i][8] = [i % 3 === 0 ? 22 : (i % 3 === 1 ? 23 : 14), 0]
        }
      }
      
      // 更多绿化区域（使用植物1和草路1）
      map[0][0] = [4, 0]   // 植物1
      map[0][6] = [5, 0]  // 草路1
      map[1][1] = [4, 0]   // 植物1
      map[1][5] = [5, 0]  // 草路1
      map[2][2] = [4, 0]   // 植物1
      map[2][4] = [5, 0]  // 草路1
      map[3][3] = [4, 0]   // 植物1
      map[3][5] = [5, 0]  // 草路1
      map[4][4] = [4, 0]   // 植物1
      map[4][6] = [5, 0]  // 草路1
      
      map[10][4] = [5, 0]  // 草路1
      map[10][5] = [4, 0]  // 植物1
      map[10][10] = [4, 0] // 植物1
      map[10][11] = [5, 0] // 草路1
      map[11][5] = [5, 0]  // 草路1
      map[11][6] = [4, 0]  // 植物1
      map[11][11] = [4, 0] // 植物1
      map[11][12] = [5, 0] // 草路1
      map[12][6] = [4, 0]  // 植物1
      map[12][7] = [5, 0]  // 草路1
      map[12][12] = [4, 0] // 植物1
      map[13][7] = [5, 0]  // 草路1
      map[13][8] = [4, 0]  // 植物1
      map[13][13] = [4, 0] // 植物1
      
      // 田地区域
      map[0][3] = [2, 0]   // 田地1
      map[0][4] = [2, 0]   // 田地1
      map[1][2] = [2, 0]   // 田地1
      map[1][3] = [2, 0]   // 田地1
      map[2][0] = [2, 0]   // 田地1
      map[2][1] = [2, 0]   // 田地1
      
      map[11][9] = [2, 0]  // 田地1
      map[11][10] = [2, 0] // 田地1
      map[12][9] = [2, 0]  // 田地1
      map[12][10] = [2, 0] // 田地1
      map[13][9] = [2, 0]  // 田地1
      map[13][10] = [2, 0] // 田地1
      
      // 石路装饰区域（扩大）
      map[3][6] = [6, 0]   // 石路1
      map[3][7] = [7, 0]   // 石路2
      map[3][8] = [6, 0]   // 石路1
      map[4][6] = [7, 0]   // 石路2
      map[4][7] = [6, 0]   // 石路1
      map[4][8] = [7, 0]   // 石路2
      
      map[10][6] = [7, 0]  // 石路2
      map[10][7] = [6, 0]  // 石路1
      map[10][8] = [7, 0]  // 石路2
      map[11][7] = [6, 0]  // 石路1
      map[11][8] = [7, 0]  // 石路2
      
      return map
    },
    
    // 4x画布布局 (28x28) - 非常丰富的布局
    getDefaultLayout4x() {
      const size = 28
      // 使用植物1作为基础填充，而不是草坪1
      const map = Array(size).fill().map(() => Array(size).fill().map(() => [4, 0]))
      
      // 中心区域 - 大型建筑群
      const centerStart = 10
      const centerEnd = 17
      
      // 中心建筑群 - 第一排
      map[centerStart][centerStart] = [10, 0]  // 宿舍
      map[centerStart][centerStart + 1] = [13, 0]
      map[centerStart][centerStart + 2] = [11, 0]  // 商店
      map[centerStart][centerStart + 3] = [13, 0]
      map[centerStart][centerStart + 4] = [12, 0]  // 教学楼
      map[centerStart][centerStart + 5] = [13, 0]
      map[centerStart][centerStart + 6] = [10, 0]  // 宿舍
      map[centerStart][centerStart + 7] = [13, 0]
      map[centerStart][centerStart + 8] = [11, 0]  // 商店
      
      // 中心建筑群 - 石路广场
      for (let i = centerStart + 1; i <= centerStart + 2; i++) {
        for (let j = centerStart + 1; j <= centerStart + 6; j++) {
          map[i][j] = [i % 2 === 0 ? 6 : 7, 0]  // 交替使用石路1和石路2
        }
      }
      
      // 中心建筑群 - 第二排建筑
      map[centerStart + 3][centerStart] = [12, 0]  // 教学楼
      map[centerStart + 3][centerStart + 1] = [6, 0]
      map[centerStart + 3][centerStart + 2] = [11, 0]  // 商店
      map[centerStart + 3][centerStart + 3] = [7, 0]
      map[centerStart + 3][centerStart + 4] = [11, 0]  // 商店
      map[centerStart + 3][centerStart + 5] = [6, 0]
      map[centerStart + 3][centerStart + 6] = [12, 0]  // 教学楼
      map[centerStart + 3][centerStart + 7] = [7, 0]
      map[centerStart + 3][centerStart + 8] = [10, 0]  // 宿舍
      
      // 中心建筑群 - 第三排
      map[centerStart + 4][centerStart] = [13, 0]
      map[centerStart + 4][centerStart + 1] = [7, 0]
      map[centerStart + 4][centerStart + 2] = [6, 0]
      map[centerStart + 4][centerStart + 3] = [11, 0]  // 商店
      map[centerStart + 4][centerStart + 4] = [6, 0]
      map[centerStart + 4][centerStart + 5] = [7, 0]
      map[centerStart + 4][centerStart + 6] = [13, 0]
      map[centerStart + 4][centerStart + 7] = [6, 0]
      map[centerStart + 4][centerStart + 8] = [13, 0]
      
      // 中心建筑群 - 第四排
      map[centerStart + 5][centerStart] = [10, 0]  // 宿舍
      map[centerStart + 5][centerStart + 1] = [13, 0]
      map[centerStart + 5][centerStart + 2] = [12, 0]  // 教学楼
      map[centerStart + 5][centerStart + 3] = [13, 0]
      map[centerStart + 5][centerStart + 4] = [10, 0]  // 宿舍
      map[centerStart + 5][centerStart + 5] = [13, 0]
      map[centerStart + 5][centerStart + 6] = [11, 0]  // 商店
      map[centerStart + 5][centerStart + 7] = [13, 0]
      map[centerStart + 5][centerStart + 8] = [12, 0]  // 教学楼
      
      // 大型水域区域 - 左下角
      for (let i = 20; i < size; i++) {
        for (let j = 0; j < 8; j++) {
          if (i + j < size + 5) {
            map[i][j] = [(i + j) % 2 === 0 ? 8 : 9, 0]  // 交替使用水域1和水域2
          }
        }
      }
      
      // 大型水域区域 - 右上角
      for (let i = 0; i < 8; i++) {
        for (let j = 20; j < size; j++) {
          if (i + j < size + 5) {
            map[i][j] = [(i + j) % 2 === 0 ? 9 : 8, 0]  // 交替使用水域2和水域1
          }
        }
      }
      
      // 道路网络 - 主干道（使用多种道路变体）
      // 横向主干道
      for (let i = 0; i < size; i++) {
        if (map[9][i][0] === 4) {
          map[9][i] = [i % 4 === 0 ? 13 : (i % 4 === 1 ? 15 : (i % 4 === 2 ? 17 : 19)), 0]
        }
        if (map[13][i][0] === 4) {
          map[13][i] = [i % 4 === 0 ? 14 : (i % 4 === 1 ? 16 : (i % 4 === 2 ? 18 : 20)), 0]
        }
        if (map[18][i][0] === 4) {
          map[18][i] = [i % 4 === 0 ? 21 : (i % 4 === 1 ? 22 : (i % 4 === 2 ? 23 : 13)), 0]
        }
      }
      
      // 纵向主干道
      for (let i = 0; i < size; i++) {
        if (map[i][9][0] === 4) {
          map[i][9] = [i % 4 === 0 ? 13 : (i % 4 === 1 ? 15 : (i % 4 === 2 ? 17 : 19)), 0]
        }
        if (map[i][13][0] === 4) {
          map[i][13] = [i % 4 === 0 ? 14 : (i % 4 === 1 ? 16 : (i % 4 === 2 ? 18 : 20)), 0]
        }
        if (map[i][18][0] === 4) {
          map[i][18] = [i % 4 === 0 ? 21 : (i % 4 === 1 ? 22 : (i % 4 === 2 ? 23 : 13)), 0]
        }
      }
      
      // 石路装饰区域（扩大）
      for (let i = 5; i < 9; i++) {
        for (let j = 5; j < 9; j++) {
          if (map[i][j][0] === 4) {
            map[i][j] = [(i + j) % 2 === 0 ? 6 : 7, 0]
          }
        }
      }
      
      for (let i = 19; i < 23; i++) {
        for (let j = 19; j < 23; j++) {
          if (map[i][j][0] === 4) {
            map[i][j] = [(i + j) % 2 === 0 ? 7 : 6, 0]
          }
        }
      }
      
      // 更多石路区域
      for (let i = 2; i < 5; i++) {
        for (let j = 2; j < 5; j++) {
          if (map[i][j][0] === 4) {
            map[i][j] = [(i + j) % 2 === 0 ? 6 : 7, 0]
          }
        }
      }
      
      for (let i = 23; i < 26; i++) {
        for (let j = 23; j < 26; j++) {
          if (map[i][j][0] === 4) {
            map[i][j] = [(i + j) % 2 === 0 ? 7 : 6, 0]
          }
        }
      }
      
      // 草路装饰区域
      for (let i = 0; i < size; i += 3) {
        for (let j = 0; j < size; j += 3) {
          if (map[i][j][0] === 4 && (i + j) % 6 === 0) {
            map[i][j] = [5, 0]  // 草路1
          }
        }
      }
      
      // 田地区域（多个区域）
      // 左上角田地
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          if (map[i][j][0] === 4 && (i + j) % 2 === 0) {
            map[i][j] = [2, 0]  // 田地1
          }
        }
      }
      
      // 右下角田地
      for (let i = 22; i < size; i++) {
        for (let j = 22; j < size; j++) {
          if (map[i][j][0] === 4 && (i + j) % 2 === 0) {
            map[i][j] = [2, 0]  // 田地1
          }
        }
      }
      
      // 右上角田地
      for (let i = 0; i < 6; i++) {
        for (let j = 22; j < size; j++) {
          if (map[i][j][0] === 4 && (i + j) % 2 === 0) {
            map[i][j] = [2, 0]  // 田地1
          }
        }
      }
      
      // 左下角田地（部分区域，因为左下角是水域）
      for (let i = 22; i < size; i++) {
        for (let j = 0; j < 6; j++) {
          if (map[i][j][0] === 4 && i < 24 && j < 4 && (i + j) % 2 === 0) {
            map[i][j] = [2, 0]  // 田地1
          }
        }
      }
      
      return map
    },
    
    // 8x画布布局 (56x56) - 超大型丰富布局
    getDefaultLayout8x() {
      const size = 56
      const map = Array(size).fill().map(() => Array(size).fill().map(() => [1, 0]))
      
      // 多个建筑群区域
      const buildingGroups = [
        { startX: 20, startY: 20, size: 8 },  // 中心建筑群
        { startX: 5, startY: 5, size: 6 },    // 左上建筑群
        { startX: 45, startY: 5, size: 6 },    // 右上建筑群
        { startX: 5, startY: 45, size: 6 },  // 左下建筑群
        { startX: 45, startY: 45, size: 6 }  // 右下建筑群
      ]
      
      buildingGroups.forEach((group, index) => {
        const { startX, startY, size: groupSize } = group
        // 创建建筑群
        for (let i = 0; i < groupSize; i++) {
          for (let j = 0; j < groupSize; j++) {
            const x = startX + i
            const y = startY + j
            
            if (x < size && y < size) {
              // 建筑位置
              if ((i === 1 || i === groupSize - 2) && (j === 1 || j === groupSize - 2)) {
                const buildingType = (i + j + index) % 3
                if (buildingType === 0) map[x][y] = [10, 0]  // 宿舍
                else if (buildingType === 1) map[x][y] = [11, 0]  // 商店
                else map[x][y] = [12, 0]  // 教学楼
              }
              // 道路
              else if (i === 0 || i === groupSize - 1 || j === 0 || j === groupSize - 1) {
                map[x][y] = [13, 0]
              }
              // 石路广场
              else if (i === Math.floor(groupSize / 2) || j === Math.floor(groupSize / 2)) {
                map[x][y] = [(x + y) % 2 === 0 ? 6 : 7, 0]
              }
            }
          }
        }
      })
      
      // 大型水域区域 - 四个角落
      const waterAreas = [
        { startX: 0, startY: 0, width: 12, height: 12 },      // 左上
        { startX: 44, startY: 0, width: 12, height: 12 },   // 右上
        { startX: 0, startY: 44, width: 12, height: 12 },   // 左下
        { startX: 44, startY: 44, width: 12, height: 12 }  // 右下
      ]
      
      waterAreas.forEach((area, index) => {
        for (let i = 0; i < area.height && area.startX + i < size; i++) {
          for (let j = 0; j < area.width && area.startY + j < size; j++) {
            const x = area.startX + i
            const y = area.startY + j
            if (x < size && y < size && map[x][y][0] === 1) {
              map[x][y] = [(x + y + index) % 2 === 0 ? 8 : 9, 0]
            }
          }
        }
      })
      
      // 大型道路网络 - 网格状
      // 横向主干道
      for (let row = 0; row < size; row += 7) {
        for (let col = 0; col < size; col++) {
          if (map[row][col][0] === 1) {
            map[row][col] = [13, 0]
          }
        }
      }
      
      // 纵向主干道
      for (let col = 0; col < size; col += 7) {
        for (let row = 0; row < size; row++) {
          if (map[row][col][0] === 1) {
            map[row][col] = [13, 0]
          }
        }
      }
      
      // 石路装饰区域 - 多个广场
      const stonePlazas = [
        { x: 14, y: 14, size: 4 },
        { x: 38, y: 14, size: 4 },
        { x: 14, y: 38, size: 4 },
        { x: 38, y: 38, size: 4 },
        { x: 26, y: 26, size: 6 }  // 中心大广场
      ]
      
      stonePlazas.forEach(plaza => {
        for (let i = 0; i < plaza.size; i++) {
          for (let j = 0; j < plaza.size; j++) {
            const x = plaza.x + i
            const y = plaza.y + j
            if (x < size && y < size && map[x][y][0] === 1) {
              map[x][y] = [(x + y) % 2 === 0 ? 6 : 7, 0]
            }
          }
        }
      })
      
      // 大量绿化区域
      for (let i = 0; i < size; i += 4) {
        for (let j = 0; j < size; j += 4) {
          if (map[i][j][0] === 1 && Math.random() > 0.3) {
            map[i][j] = [4, 0]  // 植物1
          }
        }
      }
      
      return map
    },
    
    // 初始化地图数据
    initMapData() {
      // 使用动态计算的 ntiles
      const currentNtiles = this.ntiles
      
      // 检查是否是首次初始化（检查localStorage中是否有保存的地图数据）
      const savedState = localStorage.getItem(mapConfig.storageKey)
      let parsedState = null
      if (savedState) {
        try {
          parsedState = JSON.parse(savedState)
        } catch (e) {
          console.warn('解析保存的地图状态失败:', e)
        }
      }
      
      // 检查保存的地图大小是否与当前画布大小匹配
      const savedMapSize = parsedState?.isoMap?.length || 0
      const savedMultiplier = parsedState?.canvasSizeMultiplier || 1
      
      // 判断是否是首次初始化该画布大小：
      // 1. 没有保存的状态
      // 2. 保存的状态中没有isoMap
      // 3. 保存的地图大小与当前画布大小不匹配（说明切换了画布大小）
      // 4. 保存的画布倍数与当前倍数不匹配
      const isFirstInit = !parsedState || 
                         !parsedState.isoMap || 
                         savedMapSize !== currentNtiles || 
                         savedMultiplier !== this.canvasSizeMultiplier
      
      // 如果地图不存在或大小不匹配，重新初始化
      if (!this.isoMap || this.isoMap.length !== currentNtiles || (this.isoMap[0] && this.isoMap[0].length !== currentNtiles)) {
        // 始终使用默认的草坪填充，不再自动使用默认布局
        // 用户可以通过"导入默认布局"按钮手动导入
        this.isoMap = Array(currentNtiles).fill().map(() => 
          Array(currentNtiles).fill().map(() => [1, 0]) // 默认使用 plant-1.jpg (索引1) 作为地基
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
    
    // 导入默认布局
    importDefaultLayout() {
      // 检查当前画布大小是否支持默认布局
      if (![1, 2, 4, 8].includes(this.canvasSizeMultiplier)) {
        console.warn('当前画布大小不支持默认布局')
        return false
      }
      
      // 保存当前状态到历史
      this.saveToHistory()
      
      // 获取默认布局
      const defaultLayout = this.getDefaultMapLayout()
      
      // 检查布局大小是否匹配
      const currentNtiles = this.ntiles
      if (defaultLayout.length !== currentNtiles || (defaultLayout[0] && defaultLayout[0].length !== currentNtiles)) {
        console.warn('默认布局大小与当前画布大小不匹配')
        return false
      }
      
      // 应用默认布局
      this.isoMap = defaultLayout
      
      // 保存状态
      this.saveState()
      
      // 重新计算所有瓦片的效果
      this.recalculateEffects()
      
      // 重置地图历史，添加新状态
      if (this.mapHistory) {
        this.mapHistory = new MapHistory(50)
        this.mapHistory.addHistory({ isoMap: JSON.parse(JSON.stringify(this.isoMap)) })
      }
      
      console.log(`已导入默认布局 (${this.canvasSizeMultiplier}x画布)`)
      return true
    },
    
    // 设置画布大小倍数
    setCanvasSizeMultiplier(multiplier) {
      // 验证倍数是否有效
      if (![1, 2, 4, 8].includes(multiplier)) {
        console.warn('无效的画布大小倍数，使用默认值 1')
        multiplier = 1
      }
      
      // 如果倍数改变，需要重新初始化地图
      if (this.canvasSizeMultiplier !== multiplier) {
        // 检查localStorage中是否有该画布大小的数据
        const savedState = localStorage.getItem(mapConfig.storageKey)
        let parsedState = null
        if (savedState) {
          try {
            parsedState = JSON.parse(savedState)
          } catch (e) {
            console.warn('解析保存的地图状态失败:', e)
          }
        }
        
        // 检查是否是首次使用该画布大小
        const savedMultiplier = parsedState?.canvasSizeMultiplier
        const isFirstTimeForThisSize = savedMultiplier !== multiplier
        
        // 保存当前地图数据（如果存在且不是首次使用该大小）
        const oldMap = (!isFirstTimeForThisSize && this.isoMap) ? JSON.parse(JSON.stringify(this.isoMap)) : null
        const oldSize = oldMap ? oldMap.length : 0
        
        // 更新倍数
        this.canvasSizeMultiplier = multiplier
        
        // 计算新的地图大小
        const newSize = this.ntiles
        
        // 不再自动使用默认布局，用户需要手动导入
        // 如果有旧地图数据，复制到新地图中心
        if (oldMap && oldSize > 0) {
          // 如果有旧地图数据，先创建空地图，然后复制旧数据
          this.isoMap = Array(newSize).fill().map(() => 
            Array(newSize).fill().map(() => [1, 0])
          )
          
          // 复制旧地图数据到新地图中心
          const offset = Math.floor((newSize - oldSize) / 2)
          for (let x = 0; x < oldSize && x + offset < newSize; x++) {
            for (let y = 0; y < oldSize && y + offset < newSize; y++) {
              if (x + offset >= 0 && y + offset >= 0) {
                this.isoMap[x + offset][y + offset] = oldMap[x][y]
              }
            }
          }
        } else {
          // 否则创建空地图
          this.isoMap = Array(newSize).fill().map(() => 
            Array(newSize).fill().map(() => [1, 0])
          )
        }
        
        // 重置地图历史
        if (this.mapHistory) {
          this.mapHistory = new MapHistory(50)
          this.mapHistory.addHistory({ isoMap: JSON.parse(JSON.stringify(this.isoMap)) })
        }
        
        // 自动调整缩放和视图位置以适应新画布大小
        const fitZoom = this.calculateFitZoom()
        this.zoom = fitZoom
        this.panX = DEFAULT_PAN_X
        this.panY = DEFAULT_PAN_Y
        
        this.saveState()
        // 重新计算所有瓦片的效果
        this.recalculateEffects()
      }
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
          
          // 创建新的数组对象，而不是直接修改现有数组元素
          this.isoMap[x][y] = [tileId, height]
          
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
          
          // 清除瓦片 - 创建新的数组对象
          this.isoMap[x][y] = [0, 0]
          
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
        canvasSizeMultiplier: this.canvasSizeMultiplier,
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
          
          // 如果导入的数据包含画布大小倍数，使用它；否则保持当前倍数
          if (data.canvasSizeMultiplier && [1, 2, 4, 8].includes(data.canvasSizeMultiplier)) {
            this.canvasSizeMultiplier = data.canvasSizeMultiplier
          }
          
          // 如果导入的地图大小与当前倍数不匹配，需要调整
          const importedSize = data.isoMap.length
          const expectedSize = this.ntiles
          
          if (importedSize !== expectedSize) {
            // 如果导入的地图大小与预期不匹配，需要调整地图数据
            // 如果导入的地图更大，截取中心部分
            // 如果导入的地图更小，居中放置并填充
            const newMap = Array(expectedSize).fill().map(() => 
              Array(expectedSize).fill().map(() => [1, 0])
            )
            
            const offset = Math.floor((expectedSize - importedSize) / 2)
            
            for (let x = 0; x < importedSize && x + offset < expectedSize; x++) {
              for (let y = 0; y < importedSize && y + offset < expectedSize; y++) {
                if (x + offset >= 0 && y + offset >= 0) {
                  newMap[x + offset][y + offset] = data.isoMap[x][y]
                }
              }
            }
            
            this.isoMap = newMap
          } else {
            this.isoMap = data.isoMap
          }
          
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