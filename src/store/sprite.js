import { defineStore } from 'pinia'
import { spriteConfig, getSpriteConfig } from '../config/spriteConfig'
import { useMapStore } from './map'
import { useStatsStore } from './stats'

export const useSpriteStore = defineStore('sprite', {
  state: () => ({
    // 精灵列表
    spriteList: [],
    // 自增ID
    nextId: 1
  }),

  getters: {
    // 获取所有精灵
    allSprites: (state) => state.spriteList,

    // 根据类型获取精灵
    spritesByType: (state) => (type) => {
      return state.spriteList.filter(sprite => sprite.type === type)
    },

    // 获取特定ID的精灵
    getSpriteById: (state) => (id) => {
      return state.spriteList.find(sprite => sprite.id === id)
    }
  },

  actions: {
    // 获取随机有效位置
    getRandomValidPosition(type) {
      const mapStore = useMapStore()
      const config = getSpriteConfig(type)
      const forbiddenTileIds = config.forbiddenTileIds || []
      
      // 获取地图尺寸
      const mapWidth = mapStore.isoMap?.length || 0
      const mapHeight = mapStore.isoMap?.[0]?.length || 0
      
      if (mapWidth === 0 || mapHeight === 0) return null
      
      const maxAttempts = 100
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // 生成随机坐标
        const x = Math.floor(Math.random() * mapWidth)
        const y = Math.floor(Math.random() * mapHeight)
        
        // 检查该位置的瓦片ID是否被允许
        const tileData = mapStore.isoMap[x][y]
        if (tileData) {
          const tileId = tileData[0]
          if (!forbiddenTileIds.includes(tileId)) {
            return { x, y }
          }
        }
      }
      
      // 如果尝试多次都没有找到有效位置，返回null
      return null
    },
    
    // 添加精灵
    addSprite(type, position = null) {
      const config = getSpriteConfig(type)

      console.log(type, config)
      
      // 如果没有提供位置，生成随机有效位置
      if (!position) {
        position = this.getRandomValidPosition(type)
        // 如果没有找到有效位置，使用默认位置
        if (!position) {
          position = { x: 0, y: 0 }
        }
      }
      
      const newSprite = {
        id: `${type}-${this.nextId++}`,
        type,
        currentRow: position.x,
        currentCol: position.y,
        targetRow: position.x,
        targetCol: position.y,
        config,
        currentFrame: 0,
        frameCount: config.images.length
      }

      this.spriteList.push(newSprite)
      return newSprite
    },

    // 移除精灵
    removeSprite(id) {
      const index = this.spriteList.findIndex(sprite => sprite.id === id)
      if (index !== -1) {
        return this.spriteList.splice(index, 1)[0]
      }
      return null
    },

    // 更新精灵位置
    updateSpritePosition(id, row, col) {
      const sprite = this.getSpriteById(id)
      if (sprite) {
        sprite.currentRow = row
        sprite.currentCol = col
      }
    },

    // 设置精灵目标位置
    setSpriteTargetPosition(id, row, col) {
      const sprite = this.getSpriteById(id)
      if (sprite) {
        sprite.targetRow = row
        sprite.targetCol = col
      }
    },

    // 批量添加精灵
    addMultipleSprites(spriteDataArray) {
      spriteDataArray.forEach(data => {
        this.addSprite(data.type, data.position)
      })
    },

    // 清空所有精灵
    clearAllSprites() {
      this.spriteList = []
      this.nextId = 1
    },

    // 从配置加载精灵
    loadSpritesFromConfig(spriteConfigs) {
      this.clearAllSprites()
      spriteConfigs.forEach(config => {
        this.addSprite(config.type, config.position)
      })
    },

    // 随机添加精灵（参考EventSystem.js的随机性发生机制）
    addRandomSprites() {
      // 1. 获取当前统计值和地图数据
      const mapStore = useMapStore()
      const statsStore = useStatsStore()
      const { tile4Count } = mapStore
      const { biodiversity, culture } = statsStore
      
      // 2. 定义精灵配置（含概率、最大数量约束）
      const spriteTypes = {
        fox: {
          probability: 0.3, // 生成概率
          maxCount: Math.floor(tile4Count / 3), // 受id4方块数量限制
          type: 'fox'
        },
        cat: {
          probability: 0.2, // 生成概率
          maxCount: Math.floor(biodiversity / 200), // 受生态值/200限制
          type: 'cat'
        },
        people: {
          probability: 1, // 生成概率
          maxCount: Math.floor(culture / 200), // 受人文值/200限制
          type: 'people'
        }
      }
      
      // 3. 收集所有可能的精灵类型（根据概率和数量约束筛选）
      const possibleSprites = []
      for (const [type, config] of Object.entries(spriteTypes)) {
        const currentCount = this.spritesByType(config.type).length
        // 检查概率和数量约束
        if (Math.random() < config.probability && currentCount < config.maxCount) {
          possibleSprites.push(config.type)
        }
      }
      
      // 4. 随机选择并添加精灵
      if (possibleSprites.length > 0) {
        const selectedType = possibleSprites[Math.floor(Math.random() * possibleSprites.length)]
        const newSprite = this.addSprite(selectedType)
        console.log(`🎲 随机添加精灵: ${selectedType}`, newSprite)
        return newSprite
      }
      
      return null
    }
  }
})
