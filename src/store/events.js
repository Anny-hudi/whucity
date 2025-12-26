import { defineStore } from 'pinia'
import { useNoticeStore } from './notice'

// 存储键名
const STORAGE_KEY = 'whucity_events'

export const useEventsStore = defineStore('events', {
  state: () => {
    // 从localStorage加载状态
    const savedState = localStorage.getItem(STORAGE_KEY)
    const parsedState = savedState ? JSON.parse(savedState) : {}
    
    return {
      activeEvents: parsedState.activeEvents || [],
      eventHistory: parsedState.eventHistory || [],
      isEventPanelOpen: parsedState.isEventPanelOpen || false
    }
  },
  
  getters: {
    // 获取需要响应的事件
    eventsRequiringResponse: (state) => {
      return state.activeEvents.filter(e => e.requiresResponse && !e.isResponded)
    },
  },
  
  actions: {
    // 设置自动保存
    setupAutoSave() {
      this.$subscribe(() => {
        // 当状态变化时保存到localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          activeEvents: this.activeEvents,
          eventHistory: this.eventHistory,
          isEventPanelOpen: this.isEventPanelOpen
        }))
      })
    },
    // 添加活跃事件
    addActiveEvent(event) {
      this.activeEvents.push(event)
    },
    
    // 移除活跃事件
    removeActiveEvent(eventId) {
      const index = this.activeEvents.findIndex(e => e.id === eventId)
      if (index !== -1) {
        const event = this.activeEvents[index]
        this.activeEvents.splice(index, 1)
        
        // 添加到历史记录
        this.addToHistory(event)
      }
    },
    
    // 添加到历史记录
    addToHistory(event) {
      this.eventHistory.unshift(event)
      // 限制历史记录数量
      if (this.eventHistory.length > 50) {
        this.eventHistory = this.eventHistory.slice(0, 50)
      }
    },
    
    // 添加通知 - 使用全局通知系统
    addNotification(notification) {
      const noticeStore = useNoticeStore()
      noticeStore.addNotice({
        ...notification,
        title: notification.title || '事件',
        type: notification.type || 'info'
      })
    },
    
    // 移除通知 - 使用全局通知系统
    removeNotification(notificationId) {
      const noticeStore = useNoticeStore()
      noticeStore.removeNotice(notificationId)
    },
    
    // 清除所有通知 - 使用全局通知系统
    clearNotifications() {
      const noticeStore = useNoticeStore()
      noticeStore.clearNotices()
    },
    
    // 切换事件面板
    toggleEventPanel() {
      this.isEventPanelOpen = !this.isEventPanelOpen
    },
    
    // 打开事件面板
    openEventPanel() {
      this.isEventPanelOpen = true
    },
    
    // 关闭事件面板
    closeEventPanel() {
      this.isEventPanelOpen = false
    }
  }
})

