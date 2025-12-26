import { defineStore } from 'pinia'
import { getCityAnalysis } from '../services/warningApi'

export const useSeemoreStore = defineStore('seemore', {
  state: () => ({
    // 分析结果
    analysisResult: null,
    currentData: {},
    
    // 状态
    isAnalyzing: false,
    error: null,
    isPanelOpen: false,
  }),

  getters: {
    hasAnalysis: (state) => {
      return state.analysisResult !== null
    },
  },

  actions: {
    /**
     * 分析城市数据
     * @param {Object} data - 城市数据（包括余额等）
     */
    async analyzeCity(data) {
      this.isAnalyzing = true
      this.error = null
      this.currentData = { ...data }

      try {
        const result = await getCityAnalysis(data)
        this.analysisResult = result
        return result
      } catch (error) {
        console.error('AI 分析失败:', error)
        this.error = error.message || '分析失败，请稍后重试'
        throw error
      } finally {
        this.isAnalyzing = false
      }
    },

    /**
     * 清除分析结果
     */
    clearAnalysis() {
      this.analysisResult = null
      this.currentData = {}
      this.error = null
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

