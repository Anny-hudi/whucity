// AI决策系统管理类
export class AIDecisionSystem {
  constructor(mapStore, statsStore, eventSystem) {
    this.mapStore = mapStore
    this.statsStore = statsStore
    this.eventSystem = eventSystem
    this.decisions = []
    this.decisionId = 0
    this.isEnabled = false
    this.autoExecute = false // 是否自动执行决策
    
    // 决策配置
    this.decisionConfig = {
      // 优化建议
      optimization: {
        checkInterval: 30000, // 30秒检查一次
        suggestions: []
      },
      
      // 自动响应事件
      eventResponse: {
        enabled: true,
        autoRespond: false // 是否自动响应事件
      },
      
      // 资源分配
      resourceAllocation: {
        enabled: true,
        priority: {
          carbon: 1.0,
          biodiversity: 0.8,
          culture: 0.6
        }
      }
    }
  }
  
  // 启用AI系统
  enable() {
    this.isEnabled = true
    console.log('🤖 AI决策系统已启用')
    this.startDecisionLoop()
  }
  
  // 禁用AI系统
  disable() {
    this.isEnabled = false
    console.log('🤖 AI决策系统已禁用')
  }
  
  // 设置自动执行
  setAutoExecute(enabled) {
    this.autoExecute = enabled
    console.log(`🤖 AI自动执行: ${enabled ? '开启' : '关闭'}`)
  }
  
  // 开始决策循环
  startDecisionLoop() {
    if (!this.isEnabled) return
    
    // 定期生成建议
    setInterval(() => {
      if (this.isEnabled) {
        this.generateSuggestions()
      }
    }, this.decisionConfig.optimization.checkInterval)
    
    // 监听事件系统，自动响应事件
    if (this.decisionConfig.eventResponse.enabled && this.eventSystem) {
      this.eventSystem.setEventCallbacks({
        ...this.eventSystem.onEventTriggered ? { onEventTriggered: this.eventSystem.onEventTriggered } : {},
        onEventTriggered: (event) => {
          // 调用原有回调
          if (this.eventSystem.onEventTriggered) {
            this.eventSystem.onEventTriggered(event)
          }
          
          // AI自动响应
          if (this.autoExecute && event.requiresResponse) {
            this.autoRespondToEvent(event)
          }
        }
      })
    }
  }
  
  // 生成优化建议
  generateSuggestions() {
    const suggestions = []
    
    // 1. 检查统计数据，给出优化建议
    if (this.statsStore.carbon < 500) {
      suggestions.push({
        id: ++this.decisionId,
        type: 'optimization',
        priority: 'high',
        title: '碳积分不足',
        description: '建议增加更多植物和绿色建筑来提升碳积分',
        action: 'suggest_plants',
        icon: '🌱',
        image: null // 占位符
      })
    }
    
    if (this.statsStore.biodiversity < 50) {
      suggestions.push({
        id: ++this.decisionId,
        type: 'optimization',
        priority: 'medium',
        title: '生物多样性偏低',
        description: '建议增加更多植物和生态区域',
        action: 'suggest_ecology',
        icon: '🌳',
        image: null
      })
    }
    
    if (this.statsStore.culture < 60) {
      suggestions.push({
        id: ++this.decisionId,
        type: 'optimization',
        priority: 'medium',
        title: '人文值需要提升',
        description: '建议增加更多文化建筑和活动区域',
        action: 'suggest_culture',
        icon: '🏛️',
        image: null
      })
    }
    
    // 2. 检查地图布局，给出布局建议
    const mapData = this.mapStore.isoMap
    if (mapData) {
      // 检查是否有足够的道路连接
      const roadCount = this.countTilesByType(mapData, [5, 6, 7, 8, 9]) // 道路类型
      const buildingCount = this.countTilesByType(mapData, [4, 11, 12]) // 建筑类型
      
      if (buildingCount > 0 && roadCount === 0) {
        suggestions.push({
          id: ++this.decisionId,
          type: 'optimization',
          priority: 'low',
          title: '缺少道路连接',
          description: '建议添加道路来连接建筑，提高通行效率',
          action: 'suggest_roads',
          icon: '🛣️',
          image: null
        })
      }
    }
    
    // 添加建议到决策列表
    suggestions.forEach(suggestion => {
      this.decisions.push({
        ...suggestion,
        timestamp: Date.now(),
        isExecuted: false
      })
    })
    
    // 触发建议回调
    if (this.onSuggestionGenerated) {
      suggestions.forEach(suggestion => {
        this.onSuggestionGenerated(suggestion)
      })
    }
    
    return suggestions
  }
  
  // 自动响应事件
  autoRespondToEvent(event) {
    if (!event.requiresResponse || !event.responseOptions || event.responseOptions.length === 0) {
      return
    }
    
    // 选择最优响应（优先选择效果最好的）
    let bestResponse = null
    let bestScore = -Infinity
    
    event.responseOptions.forEach((option, index) => {
      // 计算响应得分（效果越好，得分越高）
      // 处理成本（支持新格式）
      let costValue = 0
      if (typeof option.cost === 'object' && option.cost !== null) {
        costValue = option.cost.amount || 0
      } else {
        costValue = option.cost || 0
      }
      
      const score = (option.effects?.carbon || 0) * -1 + 
                   (option.effects?.biodiversity || 0) * 1.2 + 
                   (option.effects?.culture || 0) * 1.0 -
                   costValue * 0.1
      
      if (score > bestScore) {
        bestScore = score
        bestResponse = { option, index }
      }
    })
    
    if (bestResponse && this.eventSystem) {
      // 检查资源是否足够
      if (bestResponse.option.cost <= this.statsStore.carbon) {
        const success = this.eventSystem.respondToEvent(event.id, bestResponse.index)
        if (success) {
          console.log(`🤖 AI自动响应事件: ${event.name} - ${bestResponse.option.text}`)
          
          // 记录决策
          this.decisions.push({
            id: ++this.decisionId,
            type: 'event_response',
            priority: 'high',
            title: `自动响应: ${event.name}`,
            description: `AI自动选择了: ${bestResponse.option.text}`,
            action: 'auto_respond',
            icon: '🤖',
            image: null,
            timestamp: Date.now(),
            isExecuted: true
          })
        }
      }
    }
  }
  
  // 统计指定类型的瓦片数量
  countTilesByType(mapData, tileIds) {
    if (!mapData) return 0
    
    let count = 0
    for (let row = 0; row < mapData.length; row++) {
      if (!mapData[row]) continue
      for (let col = 0; col < mapData[row].length; col++) {
        if (!mapData[row][col]) continue
        const tileId = Array.isArray(mapData[row][col]) ? mapData[row][col][0] : mapData[row][col]
        if (tileIds.includes(tileId)) {
          count++
        }
      }
    }
    return count
  }
  
  // 获取所有建议
  getSuggestions() {
    return this.decisions.filter(d => d.type === 'optimization' && !d.isExecuted)
  }
  
  // 获取决策历史
  getDecisionHistory(limit = 20) {
    return this.decisions
      .filter(d => d.isExecuted)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }
  
  // 执行建议
  executeSuggestion(suggestionId) {
    const suggestion = this.decisions.find(d => d.id === suggestionId)
    if (!suggestion || suggestion.isExecuted) {
      return false
    }
    
    // 标记为已执行
    suggestion.isExecuted = true
    
    // 触发执行回调
    if (this.onSuggestionExecuted) {
      this.onSuggestionExecuted(suggestion)
    }
    
    return true
  }
  
  // 设置回调
  setCallbacks(callbacks) {
    if (callbacks.onSuggestionGenerated) {
      this.onSuggestionGenerated = callbacks.onSuggestionGenerated
    }
    if (callbacks.onSuggestionExecuted) {
      this.onSuggestionExecuted = callbacks.onSuggestionExecuted
    }
  }
  
  // 清理
  cleanup() {
    this.disable()
    this.decisions = []
    this.decisionId = 0
  }
}

