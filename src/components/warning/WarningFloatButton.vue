<template>
  <!-- 悬浮按钮 -->
  <div 
    class="warning-float-button" 
    :class="{ 'has-warnings': hasCriticalWarnings || hasNewAnalysis }"
    :style="{ left: buttonPosition.x + 'px', top: buttonPosition.y + 'px' }"
    ref="buttonRef"
    @mousedown="startButtonDrag"
    @click.stop="handleButtonClick"
  >
    <i class="mdi mdi-alert-circle"></i>
    <span v-if="warningCount > 0 || hasNewAnalysis" class="warning-badge">{{ hasNewAnalysis ? 1 : warningCount }}</span>
  </div>

  <!-- 悬浮窗面板 -->
  <Transition name="panel-fade">
    <div 
      v-if="isOpen" 
      class="warning-float-panel"
      ref="panelRef"
      :style="{ left: panelPosition.x + 'px', top: panelPosition.y + 'px' }"
    >
      <div class="panel-header" @mousedown="startDrag" @click.stop>
        <h3>
          <i class="mdi mdi-alert-circle"></i>
          AI 预警系统
        </h3>
        <button class="close-btn" @click="closePanel">
          <i class="mdi mdi-close"></i>
        </button>
      </div>
        
      <div class="panel-content">
        <!-- 趋势指示器 -->
        <div class="trend-indicator" :class="`trend-${trend}`">
          <div class="trend-icon">
            <i v-if="trend === 'improving'" class="mdi mdi-trending-up"></i>
            <i v-else-if="trend === 'declining'" class="mdi mdi-trending-down"></i>
            <i v-else class="mdi mdi-trending-neutral"></i>
          </div>
          <div class="trend-text">
            <div class="trend-label">城市趋势</div>
            <div class="trend-value">
              {{ trend === 'improving' ? '改善中' : trend === 'declining' ? '下降中' : '稳定' }}
            </div>
          </div>
        </div>

        <!-- 摘要 -->
        <div v-if="summary" class="summary-section">
          <div class="section-title">
            <i class="mdi mdi-information"></i> 城市状况摘要
          </div>
          <div class="summary-text">{{ summary }}</div>
        </div>

        <!-- 预警列表 -->
        <div class="warnings-section">
          <div class="section-title">
            <i class="mdi mdi-alert"></i> 
            预警信息 
            <span class="count-badge">{{ warnings.length }}</span>
          </div>
          
          <div v-if="warnings.length === 0" class="empty-state">
            <div class="empty-icon"><i class="mdi mdi-check-circle-outline"></i></div>
            <div class="empty-text">当前没有预警</div>
          </div>
          
          <div v-else class="warnings-list">
            <div 
              v-for="(warning, index) in warnings" 
              :key="index"
              class="warning-item"
              :class="`warning-${warning.level}`"
            >
              <div class="warning-icon">
                <i v-if="warning.level === 'critical'" class="mdi mdi-alert-octagon"></i>
                <i v-else-if="warning.level === 'high'" class="mdi mdi-alert"></i>
                <i v-else-if="warning.level === 'medium'" class="mdi mdi-alert-circle"></i>
                <i v-else class="mdi mdi-information"></i>
              </div>
              <div class="warning-content">
                <div class="warning-title">{{ warning.title }}</div>
                <div class="warning-message">{{ warning.message }}</div>
                <div class="warning-meta">
                  <span class="warning-type">{{ getTypeLabel(warning.type) }}</span>
                  <span class="warning-metric">{{ getMetricLabel(warning.metric) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 建议列表 -->
        <div class="suggestions-section">
          <div class="section-title">
            <i class="mdi mdi-lightbulb-on"></i> 
            建设建议 
            <span class="count-badge">{{ suggestions.length }}</span>
          </div>
          
          <div v-if="suggestions.length === 0" class="empty-state">
            <div class="empty-icon"><i class="mdi mdi-lightbulb-outline"></i></div>
            <div class="empty-text">暂无建议</div>
          </div>
          
          <div v-else class="suggestions-list">
            <div 
              v-for="(suggestion, index) in suggestions" 
              :key="index"
              class="suggestion-item"
              :class="`suggestion-${suggestion.priority}`"
            >
              <div class="suggestion-priority">
                <i v-if="suggestion.priority === 'high'" class="mdi mdi-flag"></i>
                <i v-else-if="suggestion.priority === 'medium'" class="mdi mdi-flag-outline"></i>
                <i v-else class="mdi mdi-minus"></i>
              </div>
              <div class="suggestion-content">
                <div class="suggestion-title">{{ suggestion.title }}</div>
                <div class="suggestion-description">{{ suggestion.description }}</div>
                <div class="suggestion-action">
                  <i class="mdi mdi-arrow-right"></i>
                  {{ suggestion.action }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 下一步行动 -->
        <div v-if="nextSteps.length > 0" class="next-steps-section">
          <div class="section-title">
            <i class="mdi mdi-format-list-checks"></i> 下一步行动
          </div>
          <div class="next-steps-list">
            <div 
              v-for="(step, index) in nextSteps" 
              :key="index"
              class="next-step-item"
            >
              <i class="mdi mdi-checkbox-blank-circle-outline"></i>
              {{ step }}
            </div>
          </div>
        </div>

        <!-- 更新时间 -->
        <div v-if="lastUpdate" class="update-time">
          <i class="mdi mdi-clock-outline"></i>
          更新时间: {{ formatTime(lastUpdate) }}
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useWarningStore } from '../../store/warning'

const warningStore = useWarningStore()

const panelRef = ref(null)
const buttonRef = ref(null)
const isDragging = ref(false)
const isButtonDragging = ref(false)
const hasButtonMoved = ref(false) // 标记按钮是否真的移动了
const dragOffset = ref({ x: 0, y: 0 })
const buttonDragOffset = ref({ x: 0, y: 0 })
const buttonStartPosition = ref({ x: 0, y: 0 }) // 记录拖动开始时的位置
const panelPosition = ref({ x: window.innerWidth - 430, y: window.innerHeight - 700 })
const buttonPosition = ref({ x: window.innerWidth - 90, y: window.innerHeight - 180 })

const isOpen = computed(() => warningStore.isPanelOpen)
const warnings = computed(() => warningStore.warnings)
const suggestions = computed(() => warningStore.suggestions)
const summary = computed(() => warningStore.summary)
const trend = computed(() => warningStore.trend)
const nextSteps = computed(() => warningStore.nextSteps)
const lastUpdate = computed(() => warningStore.lastUpdate)
const hasCriticalWarnings = computed(() => warningStore.hasCriticalWarnings)
const warningCount = computed(() => {
  // 如果有新分析结果，显示1，否则显示预警数量
  if (warningStore.hasNewAnalysis) {
    return 1
  }
  return warningStore.warningsByLevel.critical.length + warningStore.warningsByLevel.high.length
})
const hasNewAnalysis = computed(() => warningStore.hasNewAnalysis)

const togglePanel = () => {
  warningStore.togglePanel()
}

const handleButtonClick = (e) => {
  // 如果按钮真的移动了（拖动），不触发点击
  if (hasButtonMoved.value) {
    hasButtonMoved.value = false
    return
  }
  
  console.log('🔵 点击悬浮窗按钮，打开预警面板')
  // 打开预警面板（显示已分析好的报告）
  warningStore.openPanel()
  console.log('✅ 面板状态:', warningStore.isPanelOpen)
}

const closePanel = () => {
  warningStore.closePanel()
}

const getTypeLabel = (type) => {
  const typeMap = {
    ecology: '生态',
    humanistic: '人文',
    economy: '经济',
    pollution: '污染',
    other: '其他'
  }
  return typeMap[type] || type
}

const getMetricLabel = (metric) => {
  const metricMap = {
    carbon: '碳积分',
    biodiversity: '生物多样性',
    culture: '人文值',
    totalScore: '总评分'
  }
  return metricMap[metric] || metric
}

const formatTime = (timeString) => {
  const date = new Date(timeString)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 拖动功能
const startDrag = (e) => {
  // 如果点击的是关闭按钮或其他交互元素，不拖动
  if (e.target.closest('.close-btn') || e.target.closest('button') || e.target.closest('a')) {
    return
  }
  
  isDragging.value = true
  if (panelRef.value) {
    const rect = panelRef.value.getBoundingClientRect()
    dragOffset.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
  e.stopPropagation()
}

const onDrag = (e) => {
  if (!isDragging.value) return
  
  const newX = e.clientX - dragOffset.value.x
  const newY = e.clientY - dragOffset.value.y
  
  // 限制在窗口内
  const maxX = window.innerWidth - 400
  const maxY = window.innerHeight - 100
  const minX = 0
  const minY = 0
  
  panelPosition.value = {
    x: Math.max(minX, Math.min(maxX, newX)),
    y: Math.max(minY, Math.min(maxY, newY))
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 按钮拖动功能
const startButtonDrag = (e) => {
  // 如果点击的是徽章，不拖动
  if (e.target.closest('.warning-badge')) {
    return
  }
  
  isButtonDragging.value = true
  hasButtonMoved.value = false // 重置移动标记
  buttonStartPosition.value = { x: e.clientX, y: e.clientY } // 记录起始位置
  
  if (buttonRef.value) {
    const rect = buttonRef.value.getBoundingClientRect()
    buttonDragOffset.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }
  
  document.addEventListener('mousemove', onButtonDrag)
  document.addEventListener('mouseup', stopButtonDrag)
  e.preventDefault()
  e.stopPropagation()
}

const onButtonDrag = (e) => {
  if (!isButtonDragging.value) return
  
  // 检查是否真的移动了（超过5像素才认为是拖动）
  const deltaX = Math.abs(e.clientX - buttonStartPosition.value.x)
  const deltaY = Math.abs(e.clientY - buttonStartPosition.value.y)
  
  if (deltaX > 5 || deltaY > 5) {
    hasButtonMoved.value = true // 标记为真的移动了
  }
  
  const newX = e.clientX - buttonDragOffset.value.x
  const newY = e.clientY - buttonDragOffset.value.y
  
  // 限制在窗口内
  const maxX = window.innerWidth - 60
  const maxY = window.innerHeight - 60
  const minX = 0
  const minY = 0
  
  buttonPosition.value = {
    x: Math.max(minX, Math.min(maxX, newX)),
    y: Math.max(minY, Math.min(maxY, newY))
  }
}

const stopButtonDrag = () => {
  isButtonDragging.value = false
  document.removeEventListener('mousemove', onButtonDrag)
  document.removeEventListener('mouseup', stopButtonDrag)
  
  // 如果确实移动了，延迟重置移动标记，避免触发点击
  if (hasButtonMoved.value) {
    setTimeout(() => {
      hasButtonMoved.value = false
    }, 50)
  }
}

onMounted(() => {
  // 初始化位置（确保在窗口内）
  const initX = Math.max(0, window.innerWidth - 430)
  const initY = Math.max(0, window.innerHeight - 700)
  panelPosition.value = {
    x: initX,
    y: initY
  }
  
  // 初始化按钮位置
  const buttonInitX = Math.max(0, window.innerWidth - 90)
  const buttonInitY = Math.max(0, window.innerHeight - 180)
  buttonPosition.value = {
    x: buttonInitX,
    y: buttonInitY
  }
})

onUnmounted(() => {
  stopDrag()
  stopButtonDrag()
})
</script>

<style scoped>
/* 悬浮按钮样式 */
.warning-float-button {
  position: fixed;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  z-index: 1000;
  transition: box-shadow 0.3s ease;
  user-select: none;
}

.warning-float-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
}

.warning-float-button.has-warnings {
  animation: pulse-warning 2s infinite;
}

@keyframes pulse-warning {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(244, 67, 54, 0.4);
  }
  50% {
    box-shadow: 0 4px 30px rgba(244, 67, 54, 0.8);
  }
}

.warning-float-button .mdi {
  font-size: 28px;
  color: white;
}

.warning-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #f44336;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

/* 悬浮窗面板 */
.warning-float-panel {
  position: fixed;
  width: 400px;
  max-height: 600px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
  z-index: 999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 2px solid #eee;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
}

.panel-header .close-btn {
  cursor: pointer;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f8f9fa;
}

/* 过渡动画 */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: all 0.3s ease;
}

.panel-fade-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* 其他样式复用 WarningPanel 的样式 */
.trend-indicator {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.trend-improving {
  border-left: 4px solid #4caf50;
}

.trend-declining {
  border-left: 4px solid #f44336;
}

.trend-stable {
  border-left: 4px solid #ff9800;
}

.trend-icon {
  font-size: 32px;
}

.trend-improving .trend-icon {
  color: #4caf50;
}

.trend-declining .trend-icon {
  color: #f44336;
}

.trend-stable .trend-icon {
  color: #ff9800;
}

.trend-text {
  flex: 1;
}

.trend-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.trend-value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  background: #2196f3;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: normal;
}

.summary-section,
.warnings-section,
.suggestions-section,
.next-steps-section {
  margin-bottom: 24px;
}

.summary-text {
  background: white;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #666;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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

.empty-text {
  font-size: 14px;
}

.warnings-list,
.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.warning-item,
.suggestion-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  gap: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border-left: 4px solid;
}

.warning-critical {
  border-left-color: #e74c3c;
  background: #fee;
}

.warning-high {
  border-left-color: #f39c12;
  background: #fff8e1;
}

.warning-medium {
  border-left-color: #3498db;
  background: #e3f2fd;
}

.warning-low {
  border-left-color: #95a5a6;
}

.warning-icon,
.suggestion-priority {
  font-size: 24px;
  flex-shrink: 0;
}

.warning-critical .warning-icon {
  color: #e74c3c;
}

.warning-high .warning-icon {
  color: #f39c12;
}

.warning-medium .warning-icon {
  color: #3498db;
}

.warning-low .warning-icon {
  color: #95a5a6;
}

.warning-content,
.suggestion-content {
  flex: 1;
}

.warning-title,
.suggestion-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.warning-message,
.suggestion-description {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 8px;
}

.warning-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.warning-type,
.warning-metric {
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
  color: #666;
}

.suggestion-high {
  border-left-color: #4caf50;
}

.suggestion-medium {
  border-left-color: #2196f3;
}

.suggestion-low {
  border-left-color: #95a5a6;
}

.suggestion-high .suggestion-priority {
  color: #4caf50;
}

.suggestion-medium .suggestion-priority {
  color: #2196f3;
}

.suggestion-low .suggestion-priority {
  color: #95a5a6;
}

.suggestion-action {
  font-size: 13px;
  color: #2196f3;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.next-steps-list {
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.next-step-item {
  padding: 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  border-bottom: 1px solid #eee;
}

.next-step-item:last-child {
  border-bottom: none;
}

.update-time {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
</style>

