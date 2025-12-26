<template>
  <header class="header" :class="{ 'header-collapsed': !isExpanded }" >
    <!-- 兑换面板按钮 -->
    <PanelButton type="exchange" >
      <template #float-window>
        <div v-if="selectedExchangeItem" class="selected-tile-info">
          <div class="selected-tile-image-container">
            <img :src="selectedExchangeItem.image" :alt="selectedExchangeItem.name" class="selected-tile-image">
          </div>
          <div class="selected-tile-info-container">
            <div class="selected-tile-name">{{ selectedExchangeItem.name }}</div>
            <div>{{ selectedExchangeItem.price }} <i class="mdi mdi-leaf" style="color: #4caf50;"></i></div>
          </div>
          <span class="comment-text">esc 退出</span>
        </div>
      </template>
    </PanelButton>

    <div class="stats-container" :class="{ 'stats-container-collapsed': !isExpanded }" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
      <!-- 碳积分统计项 -->
      <StatItem 
        :value="statsStore.carbon" 
        label="碳积分" 
        icon="mdi mdi-leaf" 
        icon-color="#4caf50" 
        :is-expanded="isExpanded"
        :enable-animation="true"
      />
      <StatItem 
        :value="statsStore.biodiversity" 
        label="生物多样性" 
        icon="mdi mdi-paw" 
        icon-color="#8bc34a" 
        :is-expanded="isExpanded"
        :enable-animation="true"
      />
      <StatItem 
        :value="statsStore.culture" 
        label="人文值" 
        icon="mdi mdi-book-open-page-variant" 
        icon-color="#ff9800" 
        :is-expanded="isExpanded"
        :enable-animation="true"
      />
      <StatItem 
        :value="statsStore.totalScore" 
        label="总评分" 
        icon="mdi mdi-star-circle" 
        icon-color="#ffeb3b" 
        :is-expanded="isExpanded"
        :enable-animation="true"
      />
      
      <!-- 时间显示 -->
      <StatItem 
        v-if="timeInfo"
        :value="timeInfo.format" 
        :label="timeInfo.time" 
        icon="mdi mdi-clock-outline" 
        icon-color="#9c27b0" 
        :is-expanded="isExpanded"
        :enable-animation="true"
      />
    </div>

    <!-- 重启游戏按钮 -->
    <PanelButton type="restart" @click="restartGame" />

    <!-- 充值按钮 -->
    <button class="recharge-btn" @click="openRechargeDialog">
      <i class="mdi mdi-wallet"></i>
      充值
    </button>

    <!-- 事件面板按钮 -->
    <PanelButton type="event" />
    
    <!-- SEEMORE AI 分析按钮 -->
    <PanelButton type="seemore" />
    
    <!-- 充值对话框 -->
    <RechargeDialog :is-open="isRechargeDialogOpen" @close="closeRechargeDialog" />
  </header>
</template>

<script setup>
import { useStatsStore } from '../../store/stats'
import { ref, computed } from 'vue'
import { useTimeStore } from '../../store/time'
import { useEventsStore } from '../../store/events'
import { useMapStore } from '../../store/map'
import { useExchangeStore } from '../../store/exchange'
import { useWarningStore } from '../../store/warning'
import StatItem from './StatItem.vue'
import PanelButton from './PanelButton.vue'
import RechargeDialog from '../recharge/RechargeDialog.vue'

// 使用统计数据 store
const statsStore = useStatsStore()
// 使用事件数据 store
const eventsStore = useEventsStore()
// 使用地图数据 store
const mapStore = useMapStore()
// 使用兑换商店 store
const exchangeStore = useExchangeStore()
// 使用预警 store
const warningStore = useWarningStore()

// 获取选中的瓦片数据
const selectedTile = computed(() => {
  return mapStore.selectedTileData
})

// 获取选中瓦片在兑换商店中的对应项
const selectedExchangeItem = computed(() => {
  if (!selectedTile.value) return null
  return exchangeStore.exchangeItems.find(item => item.id === selectedTile.value.id)
})

// 使用时间系统 store
const timeStore = useTimeStore()

// 计算时间信息
const timeInfo = computed(() => {
  return {
    format: timeStore.formattedTime,
    time: timeStore.currentTime
  }
})

// 控制展开/收起状态的响应式变量
const isExpanded = ref(false)
// 控制是否允许鼠标事件自动改变状态的标志
const allowMouseToggle = ref(true)
// 充值对话框状态
const isRechargeDialogOpen = ref(false)

// 处理鼠标进入事件的函数
const handleMouseEnter = () => {
  if (allowMouseToggle.value) {
    isExpanded.value = true
  }
}

// 处理鼠标离开事件的函数
const handleMouseLeave = () => {
  if (allowMouseToggle.value) {
    isExpanded.value = false
  }
}

// 打开充值对话框
const openRechargeDialog = () => {
  isRechargeDialogOpen.value = true
}

// 关闭充值对话框
const closeRechargeDialog = () => {
  isRechargeDialogOpen.value = false
}

// 重启游戏函数
const restartGame = () => {
  // 弹出确认对话框
  if (confirm('确定要重启游戏吗？所有进度将丢失！')) {
    // 重置各个store的状态
    statsStore.carbon = 1000
    
    // 重置地图数据 > 重置统计数据
    mapStore.clearCache()
    mapStore.initMapData()
    mapStore.resetView()
    
    // 重置时间系统
    timeStore.cleanup()
    timeStore.start()
    
    // 重置事件系统
    eventsStore.activeEvents = []
    eventsStore.eventHistory = []
    eventsStore.isEventPanelOpen = false
    localStorage.removeItem('whucity_events')
    
    // 重置兑换系统
    exchangeStore.isPanelOpen = false
    localStorage.removeItem('whucity_exchange')

    // 重置通知系统
    eventsStore.clearNotifications()
  }
}
</script>

<style scoped>
.header {
  z-index: 1000;
  position: relative;

  width: 100%;
  padding: 1.5rem 2rem;

  display: flex;
  justify-content: center;
  align-items: center;

  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.4s ease;
  background-color: var(--color-primary-transparent-50);
}

.stats-container {
  display: flex;
  justify-content: center;
  gap: 1rem;
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
  height: 100%;
  align-items: center;
  transition: all 0.4s ease;
}

/* 收起状态样式 */
.header-collapsed {
  padding: 0.5rem 1rem;
}

.stats-container-collapsed {
  gap: 0.5rem;
}

/* 切换按钮样式 */
.toggle-button {
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  margin-left: 1rem;
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50px;
  transition: all 0.4s ease;
  background: var(--color-primary-transparent-20);
  border: 1px solid var(--color-primary-transparent-20);
}

.toggle-button:hover {
  background: var(--color-primary-transparent-20);
  transform: scale(1.1);
}

.toggle-button-collapsed {
  margin-left: 0.5rem;
  padding: 0.25rem;
}

/* 重启游戏按钮样式 */
.restart-button {
  position: absolute;
  right: 5rem;

  border: none;
  cursor: pointer;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50px;
  transition: all 0.4s ease;
  background: var(--color-primary-transparent-20);
  border: 1px solid var(--color-primary-transparent-20);
}

.restart-button:hover {
  background: var(--color-primary-transparent-40);
}

/* 收起状态下的样式 */
.header-collapsed .restart-button {
  margin-left: 0.5rem;
  padding: 0.25rem;
  font-size: 1rem;
}

/* 充值按钮样式 */
.recharge-btn {
  position: absolute;
  right: 13rem;
  border: none;
  cursor: pointer;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 50px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  font-weight: 500;
}

.recharge-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

/* 选中瓦片信息样式 */
:deep(.float-window-container) .selected-tile-info {
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background-color: #f5f5f5;
}

:deep(.float-window-container) .selected-tile-image-container {
  width: 80px;
  height: 80px;
  overflow: hidden;
  border-radius: 8px;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.float-window-container) .selected-tile-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

:deep(.float-window-container) .selected-tile-info-container {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  font-size: 14px;
}

:deep(.float-window-container) .selected-tile-name {
  font-weight: 500;
  color: #333;
  text-align: center;
}

:deep(.float-window-container) .no-selection {
  padding: 12px;
  font-size: 14px;
  color: #666;
  text-align: center;
}

:deep(.float-window-container) .comment-text {
  font-size: 12px;
  color: #999;
  display: block;
  text-align: center;
}

/* 事件通知样式调整 */
:deep(.event-notification) {
  position: absolute;
  top: 50%;
  right: calc(100% + 1rem); /* 在事件按钮的左侧 */
  transform: translateY(-50%);
  min-width: 320px;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  z-index: 2000;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid #4caf50;
}

/* 调整过渡动画方向 */
:deep(.event-notification-enter-from) {
  opacity: 0;
  transform: translateY(-50%) translateX(100%);
}

:deep(.event-notification-leave-to) {
  opacity: 0;
  transform: translateY(-50%) translateX(100%);
}
</style>