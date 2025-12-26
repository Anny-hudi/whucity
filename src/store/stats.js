import { defineStore } from 'pinia'

// 存储键名
const STORAGE_KEY = 'whucity_stats'

export const useStatsStore = defineStore('stats', {
  state: () => {
    // 从localStorage加载状态
    const savedState = localStorage.getItem(STORAGE_KEY)
    console.log('从localStorage加载状态:', savedState)

    const parsedState = savedState ? JSON.parse(savedState) : {}
    
    return {
      carbon: parsedState.carbon || 1000,       // 碳积分
      biodiversity: parsedState.biodiversity || 0,   // 生物多样性
      culture: parsedState.culture || 0         // 人文值
    }
  },
  
  getters: {
    // 计算总评分
    totalScore: (state) => {
      return Math.round((state.carbon * 0.4 + state.biodiversity * 0.3 + state.culture * 0.3) / 10)
    }
  },
  
  actions: {
    // 设置自动保存
    setupAutoSave() {
      this.$subscribe(() => {
        console.log('状态变化:', this.$state)
        // 当状态变化时保存到localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          carbon: this.carbon,
          biodiversity: this.biodiversity,
          culture: this.culture
        }))
      })
    },
    
    // 更新碳积分
    updateCarbon(amount) {
      this.carbon += amount
      if (this.carbon < 0) return false // 相当于购买失败
      return true
    },
    
    // 更新生物多样性
    updateBiodiversity(amount) {
      this.biodiversity += amount
    },
    
    // 更新人文值
    updateCulture(amount) {
      this.culture += amount
    },

    // 重置统计数据
    resetStats() {
      // this.carbon = 1000 // 在 restart-btn 中单独清理
      this.biodiversity = 0
      this.culture = 0
      // 清除localStorage中的缓存
      localStorage.removeItem(STORAGE_KEY)
    }
  }
})