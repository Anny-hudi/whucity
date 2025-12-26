// 事件系统管理类
export class EventSystem {
  constructor(mapStore, statsStore, eventsStore = null) {
    this.mapStore = mapStore
    this.statsStore = statsStore
    this.eventsStore = eventsStore
    this.events = []
    this.eventId = 0
    this.eventInterval = null
    this.lastEventTime = Date.now()
    
    // 精简事件配置（5个核心事件）
    this.eventConfig = [
      {
        id: 'eco_restoration',
        name: '生态修复',
        description: '校园生态修复项目启动，生物多样性和碳积分得到提升',
        icon: '🌱',
        type: 'nature',
        effects: { carbon: -25, biodiversity: 20, culture: 5 },
        duration: 45000,
        probability: 0.25
      },
      {
        id: 'campus_activity',
        name: '校园活动',
        description: '举办校园文化节，吸引了众多师生参与，文化值大幅提升',
        icon: '🎭',
        type: 'culture',
        effects: { carbon: -10, biodiversity: 5, culture: 30 },
        duration: 45000,
        probability: 0.25
      },
      {
        id: 'green_investment',
        name: '绿色投资',
        description: '引入绿色投资项目，短期投入换取长期收益',
        icon: '💰',
        type: 'economy',
        effects: { carbon: 10, biodiversity: 15, culture: 10 },
        duration: 60000,
        probability: 0.2
      },
      {
        id: 'extreme_weather',
        name: '极端天气',
        description: '极端天气来袭，对校园环境造成负面影响',
        icon: '⛈️',
        type: 'disaster',
        effects: { carbon: 50, biodiversity: -15, culture: -10 },
        duration: 60000,
        probability: 0.15,
        requiresResponse: true,
        responseOptions: [
          { 
            text: '紧急应对', 
            cost: { type: 'carbon', amount: 120 }, 
            effects: { carbon: -30, biodiversity: -5, culture: -5 } 
          },
          { 
            text: '自然恢复', 
            cost: { type: 'carbon', amount: 0 }, 
            effects: { carbon: 0, biodiversity: -10, culture: -15 } 
          }
        ]
      },
      {
        id: 'special_visitor',
        name: '访客到来',
        description: '知名环保专家来访，带来了新的环保理念和技术',
        icon: '👨‍🔬',
        type: 'special',
        effects: { carbon: -15, biodiversity: 25, culture: 20 },
        duration: 30000,
        probability: 0.15
      }
    ]
    
    // 事件触发间隔（毫秒）
    this.eventIntervalMs = 60000 // 1分钟触发一次事件
  }
  
  // 开始事件系统
  start() {
    if (this.eventInterval) return
    
    console.log('🎲 事件系统启动')
    
    // 定期触发事件
    this.eventInterval = setInterval(() => {
      this.triggerRandomEvent()
    }, this.eventIntervalMs)
    
    // 立即触发一个初始事件
    setTimeout(() => {
      this.triggerRandomEvent()
    }, 5000) // 5秒后触发第一个事件
  }
  
  // 停止事件系统
  stop() {
    if (this.eventInterval) {
      clearInterval(this.eventInterval)
      this.eventInterval = null
      console.log('🎲 事件系统停止')
    }
  }
  
  // 触发随机事件
  triggerRandomEvent() {
    const currentTime = Date.now()
    
    // 检查是否距离上次事件太近（至少间隔30秒）
    if (currentTime - this.lastEventTime < 30000) {
      return
    }
    
    // 收集所有可能的事件
    const allEvents = this.eventConfig
    
    // 根据概率筛选可能触发的事件
    const possibleEvents = allEvents.filter(event => {
      return Math.random() < event.probability
    })
    
    if (possibleEvents.length === 0) {
      return // 没有事件触发
    }
    
    // 随机选择一个事件
    const selectedEvent = possibleEvents[Math.floor(Math.random() * possibleEvents.length)]
    
    // 创建事件实例
    const eventInstance = {
      id: ++this.eventId,
      name: selectedEvent.name,
      description: selectedEvent.description,
      icon: selectedEvent.icon,
      image: selectedEvent.image,
      effects: { ...selectedEvent.effects },
      duration: selectedEvent.duration,
      type: selectedEvent.type,
      requiresResponse: selectedEvent.requiresResponse || false,
      responseOptions: selectedEvent.responseOptions || [],
      startTime: currentTime,
      endTime: currentTime + selectedEvent.duration,
      isActive: true,
      isResponded: false
    }
    
    // 添加到事件列表
    this.events.push(eventInstance)
    
    // 应用事件效果
    this.applyEventEffects(eventInstance)
    
    // 触发事件通知（通过回调）
    if (this.onEventTriggered) {
      this.onEventTriggered(eventInstance)
    }
    
    this.lastEventTime = currentTime
    
    // 设置事件结束定时器
    setTimeout(() => {
      this.endEvent(eventInstance.id)
    }, selectedEvent.duration)
  }
  
  // 应用事件效果
  applyEventEffects(event) {
    if (event.effects.carbon) {
      this.statsStore.updateCarbon(event.effects.carbon)
    }
    if (event.effects.biodiversity) {
      this.statsStore.updateBiodiversity(event.effects.biodiversity)
    }
    if (event.effects.culture) {
      this.statsStore.updateCulture(event.effects.culture)
    }
  }
  
  // 结束事件
  endEvent(eventId) {
    const event = this.events.find(e => e.id === eventId)
    if (event && event.isActive) {
      event.isActive = false
      
      // 触发事件结束通知
      if (this.onEventEnded) {
        this.onEventEnded(event)
      }
    }
  }
  
  // 响应事件（用于需要应对的事件）
  respondToEvent(eventId, responseIndex) {
    // 优先从 eventsStore 中查找（因为事件可能已经被添加到store中）
    let event = null
    if (this.eventsStore) {
      const activeEvent = this.eventsStore.activeEvents.find(e => e.id === eventId)
      if (activeEvent) {
        event = activeEvent
      }
    }
    
    // 如果没找到，从本地 events 中查找
    if (!event) {
      event = this.events.find(e => e.id === eventId)
    }
    
    if (!event) {
      console.warn('⚠️ 事件不存在:', eventId)
      return false
    }
    
    // 检查事件状态（从 store 中的事件可能没有 isActive 属性，需要检查其他条件）
    if (event.isResponded) {
      console.warn('⚠️ 事件已响应')
      return false
    }
    
    // 检查事件是否还在有效期内（如果有 endTime）
    if (event.endTime && Date.now() > event.endTime) {
      console.warn('⚠️ 事件已过期')
      return false
    }
    
    if (!event.requiresResponse || !event.responseOptions || event.responseOptions.length === 0) {
      console.warn('⚠️ 事件不需要响应或没有响应选项')
      return false
    }
    
    const response = event.responseOptions[responseIndex]
    if (!response) {
      console.warn('⚠️ 响应选项不存在:', responseIndex)
      return false
    }
    
    // 处理成本（支持不同类型的指标扣减）
    let costAmount = 0
    let costType = 'carbon'
    
    if (typeof response.cost === 'object' && response.cost !== null) {
      // 新格式：{ type: 'carbon', amount: 120 }
      costType = response.cost.type || 'carbon'
      costAmount = response.cost.amount || 0
    } else {
      // 兼容旧格式：直接是数字
      costAmount = response.cost || 0
      costType = 'carbon'
    }
    
    // 检查是否有足够的资源
    let hasEnough = false
    if (costType === 'carbon') {
      hasEnough = this.statsStore.carbon >= costAmount
    } else if (costType === 'biodiversity') {
      hasEnough = this.statsStore.biodiversity >= costAmount
    } else if (costType === 'culture') {
      hasEnough = this.statsStore.culture >= costAmount
    }
    
    if (!hasEnough) {
      console.warn(`⚠️ ${costType === 'carbon' ? '碳积分' : costType === 'biodiversity' ? '生物多样性' : '人文值'}不足，无法响应事件`)
      return false
    }
    
    // 扣除资源
    if (costType === 'carbon') {
      this.statsStore.updateCarbon(-costAmount)
    } else if (costType === 'biodiversity') {
      this.statsStore.updateBiodiversity(-costAmount)
    } else if (costType === 'culture') {
      this.statsStore.updateCulture(-costAmount)
    }
    
    // 应用响应效果
    if (response.effects) {
      if (response.effects.carbon) {
        this.statsStore.updateCarbon(response.effects.carbon)
      }
      if (response.effects.biodiversity) {
        this.statsStore.updateBiodiversity(response.effects.biodiversity)
      }
      if (response.effects.culture) {
        this.statsStore.updateCulture(response.effects.culture)
      }
    }
    
    // 标记为已响应（同时更新 store 中的事件）
    event.isResponded = true
    
    // 如果事件在 store 中，也要更新
    if (this.eventsStore) {
      const storeEvent = this.eventsStore.activeEvents.find(e => e.id === eventId)
      if (storeEvent) {
        storeEvent.isResponded = true
        // 更新事件效果（响应后的效果会覆盖原效果）
        if (response.effects) {
          Object.assign(storeEvent.effects, response.effects)
        }
      }
    }
    
    // 修改事件效果（响应后效果会改变）
    if (response.effects) {
      // 更新事件效果（响应后的效果会覆盖原效果）
      Object.assign(event.effects, response.effects)
    }
    
    console.log(`✅ 事件响应: ${event.name} - ${response.text}`)
    
    // 触发响应通知
    if (this.onEventResponded) {
      this.onEventResponded(event, response)
    }
    
    return true
  }
  
  // 获取当前活跃事件
  getActiveEvents() {
    return this.events.filter(e => e.isActive)
  }
  
  // 获取事件历史
  getEventHistory(limit = 10) {
    return this.events
      .filter(e => !e.isActive)
      .sort((a, b) => b.endTime - a.endTime)
      .slice(0, limit)
  }
  
  // 清理旧事件
  cleanupOldEvents() {
    const oneHourAgo = Date.now() - 3600000 // 1小时前
    this.events = this.events.filter(e => e.endTime > oneHourAgo)
  }
  
  // 设置事件触发回调
  setEventCallbacks(callbacks) {
    if (callbacks.onEventTriggered) {
      this.onEventTriggered = callbacks.onEventTriggered
    }
    if (callbacks.onEventEnded) {
      this.onEventEnded = callbacks.onEventEnded
    }
    if (callbacks.onEventResponded) {
      this.onEventResponded = callbacks.onEventResponded
    }
  }
  
  // 清理
  cleanup() {
    this.stop()
    this.events = []
    this.eventId = 0
  }
}

