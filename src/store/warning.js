import { defineStore } from 'pinia'
import { getCityWarning } from '../services/warningApi'

export const useWarningStore = defineStore('warning', {
  state: () => ({
    // 预警数据
    warnings: [],
    suggestions: [],
    summary: '',
    trend: 'stable', // improving, stable, declining
    nextSteps: [],
    lastUpdate: null,
    dataSnapshot: {},
    
    // 状态
    isLoading: false,
    error: null,
    apiAvailable: true,
    isPanelOpen: false,
    
    // 配置
    autoUpdateInterval: 30000, // 30秒自动更新
    updateTimer: null,
  }),

  getters: {
    // 按级别分组的预警
    warningsByLevel: (state) => {
      const grouped = {
        critical: [],
        high: [],
        medium: [],
        low: []
      }
      state.warnings.forEach(warning => {
        if (grouped[warning.level]) {
          grouped[warning.level].push(warning)
        }
      })
      return grouped
    },

    // 是否有严重预警
    hasCriticalWarnings: (state) => {
      return state.warnings.some(w => w.level === 'critical' || w.level === 'high')
    },

    // 按优先级分组的建议
    suggestionsByPriority: (state) => {
      const grouped = {
        high: [],
        medium: [],
        low: []
      }
      state.suggestions.forEach(suggestion => {
        if (grouped[suggestion.priority]) {
          grouped[suggestion.priority].push(suggestion)
        }
      })
      return grouped
    },
  },

  actions: {
    /**
     * 更新预警数据
     * @param {Object} statsData - 城市统计数据
     */
    async updateWarnings(statsData) {
      if (this.isLoading) return

      this.isLoading = true
      this.error = null

      try {
        const result = await getCityWarning(statsData)
        
        this.warnings = result.warnings || []
        this.suggestions = result.suggestions || []
        this.summary = result.summary || ''
        this.trend = result.trend || 'stable'
        this.nextSteps = result.nextSteps || []
        this.dataSnapshot = result.dataSnapshot || {}
        this.lastUpdate = new Date().toISOString()
        this.apiAvailable = true

        return result
      } catch (error) {
        console.error('更新预警失败:', error)
        this.error = error.message
        this.apiAvailable = false
        
        // 如果 API 不可用，生成基础预警
        this._generateBasicWarnings(statsData)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 生成基础预警（当 API 不可用时）
     */
    _generateBasicWarnings(statsData) {
      const warnings = []
      const suggestions = []

      const { carbon = 0, biodiversity = 0, culture = 0, totalScore = 0 } = statsData

      if (carbon < 500) {
        warnings.push({
          level: 'high',
          type: 'ecology',
          title: '碳积分不足',
          message: `当前碳积分为 ${carbon}，建议增加绿化建设`,
          metric: 'carbon'
        })
        suggestions.push({
          priority: 'high',
          category: 'ecology',
          title: '增加绿化建设',
          description: '通过种植树木、建设公园等方式提升碳积分',
          action: '在空地上建设更多绿化设施'
        })
      }

      if (biodiversity < 50) {
        warnings.push({
          level: 'medium',
          type: 'ecology',
          title: '生物多样性偏低',
          message: `当前生物多样性为 ${biodiversity}，建议增加生态多样性`,
          metric: 'biodiversity'
        })
      }

      if (culture < 50) {
        warnings.push({
          level: 'medium',
          type: 'humanistic',
          title: '人文值偏低',
          message: `当前人文值为 ${culture}，建议增加文化设施建设`,
          metric: 'culture'
        })
      }

      this.warnings = warnings
      this.suggestions = suggestions
      this.summary = `城市当前状态：碳积分 ${carbon}，生物多样性 ${biodiversity}，人文值 ${culture}，总评分 ${totalScore}`
      this.trend = 'stable'
      this.nextSteps = ['提升碳积分', '增加生物多样性', '建设文化设施']
      this.lastUpdate = new Date().toISOString()
    },

    /**
     * 启动自动更新
     * @param {Function} getStatsData - 获取统计数据的方法
     */
    startAutoUpdate(getStatsData) {
      this.stopAutoUpdate()
      
      this.updateTimer = setInterval(() => {
        const statsData = getStatsData()
        if (statsData) {
          this.updateWarnings(statsData)
        }
      }, this.autoUpdateInterval)
    },

    /**
     * 停止自动更新
     */
    stopAutoUpdate() {
      if (this.updateTimer) {
        clearInterval(this.updateTimer)
        this.updateTimer = null
      }
    },

    /**
     * 清除所有预警数据
     */
    clearWarnings() {
      this.warnings = []
      this.suggestions = []
      this.summary = ''
      this.trend = 'stable'
      this.nextSteps = []
      this.lastUpdate = null
      this.dataSnapshot = {}
      this.error = null
      this.stopAutoUpdate()
    },

    /**
     * 切换面板显示状态
     */
    togglePanel() {
      this.isPanelOpen = !this.isPanelOpen
    },

    /**
     * 打开面板
     */
    openPanel() {
      this.isPanelOpen = true
    },

    /**
     * 关闭面板
     */
    closePanel() {
      this.isPanelOpen = false
    },
  },
})

