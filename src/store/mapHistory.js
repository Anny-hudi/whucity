// 地图编辑历史管理（用于撤销/重做）
export class MapHistory {
  constructor(maxHistorySize = 50) {
    this.history = []
    this.currentIndex = -1
    this.maxHistorySize = maxHistorySize
  }
  
  // 添加历史记录
  addHistory(state) {
    // 如果当前不在历史末尾，删除后面的记录
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }
    
    // 添加新状态
    this.history.push(JSON.parse(JSON.stringify(state))) // 深拷贝
    this.currentIndex++
    
    // 限制历史记录数量
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
      this.currentIndex--
    }
  }
  
  // 撤销
  undo() {
    if (this.canUndo()) {
      this.currentIndex--
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]))
    }
    return null
  }
  
  // 重做
  redo() {
    if (this.canRedo()) {
      this.currentIndex++
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]))
    }
    return null
  }
  
  // 是否可以撤销
  canUndo() {
    return this.currentIndex > 0
  }
  
  // 是否可以重做
  canRedo() {
    return this.currentIndex < this.history.length - 1
  }
  
  // 清空历史
  clear() {
    this.history = []
    this.currentIndex = -1
  }
  
  // 获取当前状态
  getCurrentState() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]))
    }
    return null
  }
}

