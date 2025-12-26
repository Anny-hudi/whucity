import { ref, onMounted, onUnmounted } from 'vue'
import { AIDecisionSystem } from '../systems/AIDecisionSystem'
import { useMapStore } from '../store/map'
import { useStatsStore } from '../store/stats'

export function useAISystem(eventSystem) {
  const aiSystem = ref(null)
  const mapStore = useMapStore()
  const statsStore = useStatsStore()
  
  const initAISystem = () => {
    if (aiSystem.value) return
    
    console.log('🤖 初始化AI决策系统...')
    
    // 创建AI系统实例
    aiSystem.value = new AIDecisionSystem(mapStore, statsStore, eventSystem.value)
    
    // 设置回调
    aiSystem.value.setCallbacks({
      onSuggestionGenerated: (suggestion) => {
        console.log('🤖 AI建议生成:', suggestion)
        // 可以在这里添加通知逻辑
      },
      onSuggestionExecuted: (suggestion) => {
        console.log('🤖 AI建议执行:', suggestion)
      }
    })
    
    // 默认启用AI系统（但不自动执行）
    // aiSystem.value.enable()
    
    console.log('✅ AI决策系统初始化完成')
  }
  
  const cleanupAISystem = () => {
    if (aiSystem.value) {
      aiSystem.value.cleanup()
      aiSystem.value = null
    }
  }
  
  onMounted(() => {
    initAISystem()
  })
  
  onUnmounted(() => {
    cleanupAISystem()
  })
  
  return {
    aiSystem,
    initAISystem,
    cleanupAISystem
  }
}

