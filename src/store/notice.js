import { defineStore } from 'pinia'

export const useNoticeStore = defineStore('notice', {
  state: () => ({
    notices: [], // 待显示的通知列表
    noticeHistory: [] // 通知历史记录
  }),
  
  getters: {
    // 获取最新通知
    latestNotice: (state) => {
      return state.notices.length > 0 
        ? state.notices[state.notices.length - 1]
        : null
    },
    
    // 获取未处理的通知数量
    unhandledNoticeCount: (state) => {
      return state.notices.filter(notice => notice.requiresAction && !notice.isHandled).length
    }
  },
  
  actions: {
    // 添加通知
    addNotice(notice) {
      const newNotice = {
        id: Date.now(),
        title: notice.title || '通知',
        message: notice.message || '',
        type: notice.type || 'info',
        icon: notice.icon,
        requiresAction: notice.requiresAction || false,
        isHandled: notice.isHandled || false,
        duration: notice.duration || 5000, // 默认5秒自动关闭
        timestamp: Date.now(),
        ...notice
      }
      
      this.notices.push(newNotice)
      
      // 如果设置了自动关闭且不需要手动处理，添加自动关闭定时器
      if (newNotice.duration > 0 && !newNotice.requiresAction) {
        setTimeout(() => {
          this.removeNotice(newNotice.id)
        }, newNotice.duration)
      }
      
      // 限制通知数量
      if (this.notices.length > 10) {
        this.notices.shift()
      }
    },
    
    // 添加信息通知
    info(message, options = {}) {
      this.addNotice({
        ...options,
        message,
        type: 'info'
      })
    },
    
    // 添加成功通知
    success(message, options = {}) {
      this.addNotice({
        ...options,
        message,
        type: 'success'
      })
    },
    
    // 添加警告通知
    warning(message, options = {}) {
      this.addNotice({
        ...options,
        message,
        type: 'warning'
      })
    },
    
    // 添加错误通知
    error(message, options = {}) {
      this.addNotice({
        ...options,
        message,
        type: 'error'
      })
    },
    
    // 移除通知
    removeNotice(noticeId) {
      const index = this.notices.findIndex(n => n.id === noticeId)
      if (index !== -1) {
        const notice = this.notices[index]
        this.notices.splice(index, 1)
        
        // 添加到历史记录
        this.addToHistory(notice)
      }
    },
    
    // 添加到历史记录
    addToHistory(notice) {
      this.noticeHistory.unshift(notice)
      // 限制历史记录数量
      if (this.noticeHistory.length > 50) {
        this.noticeHistory = this.noticeHistory.slice(0, 50)
      }
    },
    
    // 标记通知为已处理
    markAsHandled(noticeId) {
      const notice = this.notices.find(n => n.id === noticeId)
      if (notice) {
        notice.isHandled = true
      }
    },
    
    // 清除所有通知
    clearNotices() {
      // 将所有当前通知添加到历史记录
      this.notices.forEach(notice => {
        this.addToHistory(notice)
      })
      this.notices = []
    },
    
    // 清除通知历史
    clearNoticeHistory() {
      this.noticeHistory = []
    }
  }
})