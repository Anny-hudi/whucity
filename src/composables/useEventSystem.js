import { ref, onMounted, onUnmounted } from 'vue'
import { EventSystem } from '../systems/EventSystem'
import { useMapStore } from '../store/map'
import { useStatsStore } from '../store/stats'
import { useEventsStore } from '../store/events'

export function useEventSystem() {
  const eventSystem = ref(null)
  const eventsStore = useEventsStore()
  const mapStore = useMapStore()
  const statsStore = useStatsStore()
  
  const initEventSystem = () => {
    if (eventSystem.value) return
    
    console.log('🎲 初始化事件系统...')
    
    // 创建事件系统实例（传入 eventsStore）
    eventSystem.value = new EventSystem(mapStore, statsStore, eventsStore)
    
    // 设置事件回调
    eventSystem.value.setEventCallbacks({
      onEventTriggered: (event) => {
        // 添加到活跃事件列表
        eventsStore.addActiveEvent(event)
        
        // 添加通知
        eventsStore.addNotification({
          type: 'event',
          event: event,
          message: `${event.icon} ${event.name}: ${event.description}`
        })
        
        console.log('🎲 事件触发回调:', event)
      },
      
      onEventEnded: (event) => {
        // 从活跃事件列表移除
        eventsStore.removeActiveEvent(event.id)
        
        console.log('🎲 事件结束回调:', event)
      },
      
      onEventResponded: (event, response) => {
        // 更新事件状态
        const activeEvent = eventsStore.activeEvents.find(e => e.id === event.id)
        if (activeEvent) {
          activeEvent.isResponded = true
          // 更新效果
          Object.assign(activeEvent.effects, response.effects)
        }
        
        console.log('🎲 事件响应回调:', event, response)
      }
    })
    
    // 启动事件系统
    eventSystem.value.start()
    
    console.log('✅ 事件系统初始化完成')
  }
  
  const cleanupEventSystem = () => {
    if (eventSystem.value) {
      eventSystem.value.cleanup()
      eventSystem.value = null
    }
  }
  
  // 定期同步事件状态
  const syncEventState = () => {
    if (eventSystem.value) {
      const activeEvents = eventSystem.value.getActiveEvents()
      // 更新store中的活跃事件（移除已结束的）
      eventsStore.activeEvents = activeEvents
      
      // 清理旧事件
      eventSystem.value.cleanupOldEvents()
    }
  }
  
  // 定期同步（每5秒）
  let syncInterval = null
  
  onMounted(() => {
    initEventSystem()
    syncInterval = setInterval(syncEventState, 5000)
  })
  
  onUnmounted(() => {
    cleanupEventSystem()
    if (syncInterval) {
      clearInterval(syncInterval)
    }
  })
  
  return {
    eventSystem,
    initEventSystem,
    cleanupEventSystem
  }
}

