<template>
  <div class="event-panel-container" :class="{ 'panel-open': isOpen }">
    <!-- 面板开关; fixed -->
    <div class="panel-toggle" :class="{'panel-open': !isOpen}" @click="togglePanel">
      <span class="toggle-icon"><i class="mdi" :class="!isOpen ? 'mdi-chevron-left' : 'mdi-chevron-right'"></i></span>
    </div>
    
    <!-- 事件面板 -->
    <div class="event-panel">
      <div class="panel-header">
        <h3>事件</h3>
        <div class="panel-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'active' }"
            @click="activeTab = 'active'"
          >
            <i class="mdi mdi-bell" :style="{'color': activeTab === 'active' ? '#fff' : '#666'}"></i> 进行中 ({{ activeEvents.length }})
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'history' }"
            @click="activeTab = 'history'"
          >
            <i class="mdi mdi-history" :style="{'color': activeTab === 'history' ? '#fff' : '#666'}"></i> 历史记录 ({{ eventHistory.length }})
          </button>
        </div>
      </div>
        
      <div class="panel-content">
        <!-- 活跃事件 -->
        <div v-if="activeTab === 'active'" class="events-list">
          <div v-if="activeEvents.length === 0" class="empty-state">
            <div class="empty-icon"><i class="mdi mdi-bell-outline"></i></div>
            <div class="empty-text">当前没有进行中的事件</div>
          </div>
          
          <div 
            v-for="event in activeEvents" 
            :key="event.id"
            class="event-item"
            :class="getEventTypeClass(event.type)"
          >
            <div class="event-item-icon">{{ event.icon || '🎲' }}</div>
            <div class="event-item-content">
              <div class="event-item-title">{{ event.name }}</div>
              <div class="event-item-description">{{ event.description }}</div>
              <div class="event-item-effects">
                <span v-if="event.effects.carbon" :class="event.effects.carbon > 0 ? 'negative' : 'positive'">
                  碳积分: {{ event.effects.carbon > 0 ? '+' : '' }}{{ event.effects.carbon }}
                </span>
                <span v-if="event.effects.biodiversity" :class="event.effects.biodiversity > 0 ? 'positive' : 'negative'">
                  生物多样性: {{ event.effects.biodiversity > 0 ? '+' : '' }}{{ event.effects.biodiversity }}
                </span>
                <span v-if="event.effects.culture" :class="event.effects.culture > 0 ? 'positive' : 'negative'">
                  人文值: {{ event.effects.culture > 0 ? '+' : '' }}{{ event.effects.culture }}
                </span>
              </div>
              <div v-if="event.requiresResponse && !event.isResponded" class="event-response-section">
                <div class="response-label">需要响应：</div>
                <div class="response-options">
                  <button
                    v-for="(option, index) in event.responseOptions"
                    :key="index"
                    class="response-btn"
                    @click="handleResponse(event.id, index)"
                  >
                    {{ option.text }} (消耗: {{ formatCost(option.cost) }})
                  </button>
                </div>
              </div>
              <div v-else-if="event.isResponded" class="event-responded">
                ✅ 已响应
              </div>
              <div class="event-time">
                剩余时间: {{ formatTimeRemaining(event.endTime) }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- 历史记录 -->
        <div v-if="activeTab === 'history'" class="events-list">
          <div v-if="eventHistory.length === 0" class="empty-state">
            <div class="empty-icon"><i class="mdi mdi-history"></i></div>
            <div class="empty-text">暂无历史记录</div>
          </div>
          
          <div 
            v-for="event in eventHistory" 
            :key="event.id"
            class="event-item event-item-history"
            :class="getEventTypeClass(event.type)"
          >
            <div class="event-item-icon">{{ event.icon || '🎲' }}</div>
            <div class="event-item-content">
              <div class="event-item-title">{{ event.name }}</div>
              <div class="event-item-description">{{ event.description }}</div>
              <div class="event-item-time">
                {{ formatEventTime(event.endTime) }}
              </div>
              <div v-if="event.isResponded" class="event-responded">
                ✅ 已响应
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useEventsStore } from '../../store/events'
import { useEventSystem } from '../../composables/useEventSystem'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const eventsStore = useEventsStore()
const { eventSystem } = useEventSystem()

const activeTab = ref('active')

const activeEvents = computed(() => eventsStore.activeEvents)
const eventHistory = computed(() => eventsStore.eventHistory.slice(0, 20)) // 只显示最近20条

const getEventTypeClass = (type) => {
  const typeMap = {
    weather: 'event-weather',
    ecology: 'event-ecology',
    culture: 'event-culture',
    disaster: 'event-disaster'
  }
  return typeMap[type] || 'event-default'
}

const formatTimeRemaining = (endTime) => {
  const remaining = Math.max(0, endTime - Date.now())
  const seconds = Math.floor(remaining / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formatEventTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatCost = (cost) => {
  if (typeof cost === 'object' && cost !== null) {
    const typeMap = {
      carbon: '碳积分',
      biodiversity: '生物多样性',
      culture: '人文值'
    }
    const typeName = typeMap[cost.type] || cost.type
    return `${cost.amount} ${typeName}`
  }
  // 兼容旧格式
  return `${cost} 碳积分`
}

const handleResponse = (eventId, responseIndex) => {
  if (eventSystem.value) {
    const success = eventSystem.value.respondToEvent(eventId, responseIndex)
    if (!success) {
      alert('资源不足或事件已失效')
    }
  }
}

const togglePanel = () => {
  eventsStore.toggleEventPanel()
}

const closePanel = () => {
  emit('close')
}

// 键盘事件处理
const handleKeyPress = (event) => {
  // Ctrl + E 切换面板
  if (event.ctrlKey && event.key === 'e') {
    event.preventDefault()
    togglePanel()
  }
}

// 添加和移除键盘事件监听
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.event-panel-container {
  position: fixed;
  right: 0;
  top: 0;
  width: 350px;
  height: 100vh;
  z-index: 100;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.event-panel-container:not(.panel-open) {
  transform: translateX(100%);
}

.panel-toggle {
  position: absolute;
  top: 50%;
  left: -30px;
  transform: translateY(-50%);
  width: 30px;
  height: 60px;
  background-color: white;
  border-radius: 5px 0 0 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 101;
  transition: all 0.3s ease;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.panel-toggle:hover {
  background-color: #f5f5f5;
}

.panel-toggle:hover {
  background-color: #f5f5f5;
}

.toggle-icon {
  font-size: 1.5rem;
  color: #3498db;
}

.event-panel {
  height: 100%;
  width: 100%;
  background-color: #f0f0f0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
}

.panel-header {
  z-index: 10;
  width: 100%;
  position: sticky;
  top: 0;
  padding: 15px;
  height: 55px;
  border-bottom: 2px solid #eee;
  background-color: #fff;
  display: flex;
  gap: 4px;
  justify-content: space-between;
  text-wrap: nowrap;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.panel-tabs {
  display: flex;
  gap: 4px;
  border-radius: 8px;
}

.tab-btn {
  flex: 1;
  padding: 2px 6px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.3s ease;
  gap: 4px;
}

.tab-btn:hover {
  background: rgba(52, 152, 219, 0.1);
  color: var(--color-primary);
}

.tab-btn.active {
  color: #fff;
  background: var(--color-primary);
  font-weight: bold;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Collapsed state styles */
.event-panel-container:not(.panel-open) .event-panel {
  overflow: hidden;
}

.event-panel-container:not(.panel-open) .panel-header {
  padding: 10px;
}

.event-panel-container:not(.panel-open) .panel-header h3,
.event-panel-container:not(.panel-open) .panel-tabs,
.event-panel-container:not(.panel-open) .panel-content {
  display: none;
}

.events-list {
  display: grid;
  gap: 20px;
  padding: 10px;
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 为tab内容区域添加过渡效果 */
.panel-content > div {
  animation: tabFadeIn 0.3s ease-out;
}

@keyframes tabFadeIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-icon .mdi {
  color: var(--color-text-secondary);
}

.empty-text {
  font-size: 14px;
}

.event-item {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 12px;
  border: 1px solid #eee;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.event-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.event-item.event-weather {
  border-color: #3498db;
}

.event-item.event-ecology {
  border-color: #27ae60;
}

.event-item.event-culture {
  border-color: #f39c12;
}

.event-item.event-disaster {
  border-color: #e74c3c;
}

.event-item-history {
  opacity: 0.7;
}

.event-item-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.event-item-content {
  flex: 1;
  min-width: 0;
}

.event-item-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.event-item-description {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.4;
}

.event-item-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.event-item-effects .positive {
  color: #4caf50;
}

.event-item-effects .negative {
  color: #f44336;
}

.event-response-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #eee;
}

.response-label {
  font-size: 12px;
  color: #f44336;
  font-weight: bold;
  margin-bottom: 8px;
}

.response-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.response-btn {
  padding: 8px 12px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s ease;
}

.response-btn:hover {
  background: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
}

.event-responded {
  color: #27ae60;
  font-size: 12px;
  font-weight: bold;
  margin-top: 4px;
}

.event-item-time,
.event-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>

