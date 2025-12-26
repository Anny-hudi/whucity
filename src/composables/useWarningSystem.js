/**
 * 预警系统 Composable
 */
import { ref } from 'vue'
import { useWarningStore } from '../store/warning'
import { useStatsStore } from '../store/stats'

export function useWarningSystem() {
  const warningStore = useWarningStore()
  const statsStore = useStatsStore()
  
  // 初始化时获取一次预警
  const initWarning = async () => {
    const statsData = {
      carbon: statsStore.carbon,
      biodiversity: statsStore.biodiversity,
      culture: statsStore.culture,
      totalScore: statsStore.totalScore
    }
    
    await warningStore.updateWarnings(statsData)
  }
  
  // 立即初始化
  initWarning()
  
  return {
    warningStore,
    initWarning
  }
}

