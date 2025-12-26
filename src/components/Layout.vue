<template>
  <div class="app-layout">
    <!-- 左侧兑换面板 -->
    <ExchangePanel />

    <!-- 右侧内容区：顶部统计区 + 地图 -->
    <div class="right-container">
      <!-- 顶部统计区 -->
      <Header />

      <!-- 事件通知 -->
      <Notice 
        v-if="latestNotification"
        :notice="latestNotification"
        @close="handleNotificationClose"
        @click="handleNotificationClick"
      />

      <!-- 地图容器 -->
      <MapGrid />
    </div>
    
    <!-- 事件面板 -->
    <EventPanel 
      :is-open="eventsStore.isEventPanelOpen"
      @close="eventsStore.closeEventPanel"
    />
    
    <!-- AI 预警悬浮窗 -->
    <WarningFloatButton />
    
    <!-- SEEMORE AI 分析面板 -->
    <SeemorePanel 
      :is-open="seemoreStore.isPanelOpen"
      @toggle="seemoreStore.togglePanel"
    />
  </div>
</template>

<script setup>
import Header from './header/Header.vue'
import ExchangePanel from './exchange/ExchangePanel.vue'
import MapGrid from './map/MapGrid.vue'
import EventPanel from './events/EventPanel.vue'
import WarningFloatButton from './warning/WarningFloatButton.vue'
import SeemorePanel from './seemore/SeemorePanel.vue'
import Notice from './Notice.vue'
import { useEventSystem } from '../composables/useEventSystem'
import { useWarningSystem } from '../composables/useWarningSystem'
import { useTimeStore } from '../store/time'
import { computed, onMounted, onUnmounted } from 'vue'
import { useEventsStore } from '../store/events'
import { useNoticeStore } from '../store/notice'
import { useExchangeStore } from '../store/exchange'
import { useStatsStore } from '../store/stats'
import { useWarningStore } from '../store/warning'
import { useSeemoreStore } from '../store/seemore'

// 初始化事件系统
useEventSystem()

// 初始化预警系统
useWarningSystem()

// 初始化时间系统
const timeStore = useTimeStore()
const eventsStore = useEventsStore()
const exchangeStore = useExchangeStore()
const statsStore = useStatsStore()
const warningStore = useWarningStore()
const seemoreStore = useSeemoreStore()

timeStore.loadFromLocalStorage()

onMounted(() => {
  timeStore.start()
  eventsStore.setupAutoSave()
  exchangeStore.setupAutoSave()
  statsStore.setupAutoSave()
  
  // 启动预警系统自动更新
  warningStore.startAutoUpdate(() => ({
    carbon: statsStore.carbon,
    biodiversity: statsStore.biodiversity,
    culture: statsStore.culture,
    totalScore: statsStore.totalScore
  }))
})

onUnmounted(() => {
  warningStore.stopAutoUpdate()
})

// 通知相关
const noticeStore = useNoticeStore()

const latestNotification = computed(() => {
  // 只显示最新的事件通知
  return noticeStore.latestNotice
})

const handleNotificationClose = (notificationId) => {
  eventsStore.removeNotification(notificationId)
}

const handleNotificationClick = (notification) => {
  // 点击通知时打开事件面板
  eventsStore.openEventPanel()
}
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.right-container {
  position: relative;

  display: flex;
  flex-direction: column;
  flex: 1;
}

MapCanvas {
  flex: 1;
}


</style>