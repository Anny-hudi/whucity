import { defineStore } from 'pinia'
import { useStatsStore } from './stats'
import { mapConfig } from '../config/map'

// 存储键名
const STORAGE_KEY = 'whucity_exchange'

export const useExchangeStore = defineStore('exchange', {
  state: () => {
    // 从localStorage加载状态
    const savedState = localStorage.getItem(STORAGE_KEY)
    const parsedState = savedState ? JSON.parse(savedState) : {}
    
    return {
      isPanelOpen: parsedState.isPanelOpen || false,
      exchangeItems: mapConfig.tiles.map(tile => tile)
    }
  },
  
  getters: {
    // 获取可用的兑换物品
    availableItems: (state) => {
      const statsStore = useStatsStore()
      return state.exchangeItems.filter(item => statsStore.carbon >= item.price)
    },
    
    // 获取锁定的兑换物品
    lockedItems: (state) => {
      const statsStore = useStatsStore()
      return state.exchangeItems.filter(item => statsStore.carbon < item.price)
    }
  },
  
  actions: {
    // 设置自动保存
    setupAutoSave() {
      this.$subscribe(() => {
        // 当状态变化时保存到localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          isPanelOpen: this.isPanelOpen
        }))
      })
    },
    
    // 切换面板状态
    togglePanel() {
      this.isPanelOpen = !this.isPanelOpen
    },
    
    // 打开面板
    openPanel() {
      this.isPanelOpen = true
    },
    
    // 关闭面板
    closePanel() {
      this.isPanelOpen = false
    },
    
    // 兑换物品
    exchangeItem(itemId) {
      const statsStore = useStatsStore()
      const item = this.exchangeItems.find(item => item.id === itemId)
      
      if (!item) return false
      
      // 检查是否有足够的碳积分
      if (statsStore.carbon < item.price) return false
      
      // 扣除碳积分
      statsStore.updateCarbon(-item.price)
      
      // 应用物品效果
      if (item.effects) {
        if (item.effects.carbon) statsStore.updateCarbon(item.effects.carbon)
        if (item.effects.biodiversity) statsStore.updateBiodiversity(item.effects.biodiversity)
        if (item.effects.culture) statsStore.updateCulture(item.effects.culture)
      }
      
      return true
    },
  }
})