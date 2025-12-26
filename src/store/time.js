import { defineStore } from 'pinia'

export const useTimeStore = defineStore('time', {
  state: () => {
    return {
      gameTime: 0, // 游戏时间（秒）
      gameSpeed: 1.0, // 游戏速度倍数
      isPaused: false,
      timeInterval: null,
      lastUpdateTime: Date.now(),
      lastSavedTime: Date.now(), // 上一次保存到本地存储的时间
      listeners: {
        onDayChange: []
      },
      // 定时任务列表
      tasks: [],
      taskIdCounter: 0,
      // 时间相关配置
      config: {
        updateInterval: 1000, // 每秒更新一次
        dayDuration: 24 * 60, // 游戏内一天 (1秒对应游戏世界的一分钟）
        saveInterval: 5 * 1000 // 自动保存间隔（5秒）
      }
    }
  },

  getters: {
    // 获取当前天数
    currentDay: (state) => {
      return Math.floor(state.gameTime / state.config.dayDuration) + 1
    },

    currentTime: (state) => {
      const hours = Math.floor(state.gameTime % state.config.dayDuration / 60)
      const minutes = Math.floor(state.gameTime % state.config.dayDuration % 60)
      // 补零逻辑，确保格式为 00:00
      const formattedHours = hours.toString().padStart(2, '0')
      const formattedMinutes = minutes.toString().padStart(2, '0')
      return `${formattedHours}:${formattedMinutes}`
    },

    // 格式化时间显示
    formattedTime: (state) => {
      return `第 ${Math.floor(state.gameTime / state.config.dayDuration) + 1} 天`
    },

    // 获取时间信息
    timeInfo: (state) => {
      const day = Math.floor(state.gameTime / state.config.dayDuration)
      return {
        totalSeconds: state.gameTime,
        day: day + 1,
        isPaused: state.isPaused,
        speed: state.gameSpeed
      }
    }
  },

  actions: {
    // 开始时间系统
    start() {
      if (this.timeInterval) return

      console.log('⏰ 时间系统启动')
      this.isPaused = false
      this.lastUpdateTime = Date.now()

      this.timeInterval = setInterval(() => {
        if (!this.isPaused) {
          this.update()
        }
      }, this.config.updateInterval)
    },

    // 停止时间系统
    stop() {
      if (this.timeInterval) {
        clearInterval(this.timeInterval)
        this.timeInterval = null
        console.log('⏰ 时间系统停止')
      }
    },

    // 暂停/恢复
    pause() {
      this.isPaused = true
    },

    resume() {
      this.isPaused = false
      this.lastUpdateTime = Date.now()
    },

    // 设置游戏速度
    setSpeed(speed) {
      this.gameSpeed = Math.max(0.5, Math.min(5.0, speed)) // 限制在0.5x到5x之间
      console.log(`⏰ 游戏速度设置为: ${this.gameSpeed}x`)
    },

    // 更新游戏时间
    update() {
      const currentTime = Date.now()
      const deltaTime = (currentTime - this.lastUpdateTime) / 1000 // 转换为秒
      const gameDeltaTime = deltaTime * this.gameSpeed

      const oldGameTime = this.gameTime
      this.gameTime += gameDeltaTime
      this.lastUpdateTime = currentTime

      // 检查时间变化事件
      this.checkTimeEvents(oldGameTime, this.gameTime)
      
      // 执行到期的定时任务
      this.executeTasks()
      
      // 自动保存（每5秒）
      if (currentTime - this.lastSavedTime > this.config.saveInterval) {
        this.saveToLocalStorage()
        this.lastSavedTime = currentTime
      }
    },

    // 检查时间变化事件
    checkTimeEvents(oldTime, newTime) {
      const oldDay = Math.floor(oldTime / this.config.dayDuration)
      const newDay = Math.floor(newTime / this.config.dayDuration)

      // 日期变化
      if (newDay > oldDay) {
        this.triggerListeners('onDayChange', newDay + 1)
      }
    },

    // 触发监听器
    triggerListeners(eventType, value) {
      if (this.listeners[eventType]) {
        this.listeners[eventType].forEach(listener => {
          try {
            listener(value)
          } catch (error) {
            console.error(`⏰ 时间监听器错误 (${eventType}):`, error)
          }
        })
      }
    },

    // 添加时间监听器
    addListener(eventType, callback) {
      if (this.listeners[eventType]) {
        this.listeners[eventType].push(callback)
      }
    },

    // 移除时间监听器
    removeListener(eventType, callback) {
      if (this.listeners[eventType]) {
        const index = this.listeners[eventType].indexOf(callback)
        if (index !== -1) {
          this.listeners[eventType].splice(index, 1)
        }
      }
    },

    // 添加定时任务
    scheduleTask(delay, callback, data = null) {
      const taskId = this.taskIdCounter++
      const executeTime = this.gameTime + delay
      
      const task = {
        id: taskId,
        executeTime,
        callback,
        data
      }
      
      this.tasks.push(task)
      return taskId
    },
    
    // 取消定时任务
    cancelTask(taskId) {
      const index = this.tasks.findIndex(task => task.id === taskId)
      if (index !== -1) {
        this.tasks.splice(index, 1)
        return true
      }
      return false
    },
    
    // 取消特定数据的所有任务
    cancelTasksByData(data) {
      this.tasks = this.tasks.filter(task => JSON.stringify(task.data) !== JSON.stringify(data))
    },
    
    // 执行到期的任务
    executeTasks() {
      const currentTime = this.gameTime
      const expiredTasks = this.tasks.filter(task => task.executeTime <= currentTime)
      
      // 先移除所有到期任务，避免回调中添加的新任务被重复执行
      this.tasks = this.tasks.filter(task => task.executeTime > currentTime)
      
      // 执行到期任务
      expiredTasks.forEach(task => {
        try {
          task.callback(task.data)
        } catch (error) {
          console.error(`⏰ 定时任务执行错误 (ID: ${task.id}):`, error)
        }
      })
    },
    
    // 从本地存储恢复
    loadFromLocalStorage() {
      try {
        const savedData = localStorage.getItem('whucity_time')
        if (savedData) {
          const timeData = JSON.parse(savedData)
          
          this.gameTime = timeData.gameTime || 0
          this.gameSpeed = timeData.gameSpeed || 1.0
          this.isPaused = timeData.isPaused || false
          this.lastUpdateTime = Date.now() // 使用当前时间作为新的基准时间
          this.taskIdCounter = timeData.taskIdCounter || 0
          
          return true
        }
      } catch (error) {
        console.error('⏰ 从本地存储恢复时间数据失败:', error)
      }
      
      return false
    },

    // 保存到本地存储
    saveToLocalStorage() {
      const timeData = {
        gameTime: this.gameTime,
        gameSpeed: this.gameSpeed,
        isPaused: this.isPaused,
        lastUpdateTime: this.lastUpdateTime,
        taskIdCounter: this.taskIdCounter,
        savedAt: Date.now()
      }
      
      try {
        localStorage.setItem('whucity_time', JSON.stringify(timeData))
      } catch (error) {
        console.error('⏰ 保存时间数据到本地存储失败:', error)
      }
    },

    // 清理
    cleanup() {
      this.stop()
      this.gameTime = 0
      this.listeners = {
        onDayChange: []
      }
      this.tasks = []
      this.taskIdCounter = 0
    }
  }
})