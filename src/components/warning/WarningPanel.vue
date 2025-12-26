<template>
  <div class="warning-panel-container" :class="{ 'panel-open': isOpen }">
    <!-- 面板开关 -->
    <div class="panel-toggle" :class="{'panel-open': !isOpen}" @click="togglePanel">
      <span class="toggle-icon">
        <i class="mdi" :class="!isOpen ? 'mdi-chevron-left' : 'mdi-chevron-right'"></i>
      </span>
      <span v-if="hasCriticalWarnings" class="warning-badge">{{ criticalWarningCount }}</span>
    </div>
    
    <!-- 预警面板 -->
    <div class="warning-panel">
      <div class="panel-header">
        <h3>
          <i class="mdi mdi-alert-circle"></i>
          AI 预警系统
        </h3>
        <div class="panel-status">
          <span v-if="isLoading" class="status-loading">
            <i class="mdi mdi-loading mdi-spin"></i> 分析中...
          </span>
          <span v-else-if="!apiAvailable" class="status-offline">
            <i class="mdi mdi-wifi-off"></i> 离线模式
          </span>
          <span v-else class="status-online">
            <i class="mdi mdi-check-circle"></i> 在线
          </span>
        </div>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWarningStore } from '../../store/warning'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const warningStore = useWarningStore()

const isOpen = computed(() => props.isOpen)
const isLoading = computed(() => warningStore.isLoading)
const apiAvailable = computed(() => warningStore.apiAvailable)
const warnings = computed(() => warningStore.warnings)
const suggestions = computed(() => warningStore.suggestions)
const summary = computed(() => warningStore.summary)
const trend = computed(() => warningStore.trend)
const nextSteps = computed(() => warningStore.nextSteps)
const lastUpdate = computed(() => warningStore.lastUpdate)
const hasCriticalWarnings = computed(() => warningStore.hasCriticalWarnings)
const criticalWarningCount = computed(() => {
  return warningStore.warningsByLevel.critical.length + warningStore.warningsByLevel.high.length
})

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

const emit = defineEmits(['toggle'])

const togglePanel = () => {
  // 通过事件通知父组件
  emit('toggle')
}
</script>

<style scoped>
.warning-panel-container {
  position: relative;
  width: 400px;
  height: 100vh;
  z-index: 100;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  transition: width 0.3s ease;
}

.warning-panel-container:not(.panel-open) {
  width: 0px;
}

.panel-toggle {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 30px;
  height: 60px;
  background-color: white;
  border-radius: 0 5px 5px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 101;
  transition: all 0.3s ease;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.panel-toggle:not(.panel-open) {
  left: 400px;
}

.panel-toggle:hover {
  background-color: #f5f5f5;
}

.toggle-icon {
  font-size: 1.5rem;
  color: #3498db;
}

.warning-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #e74c3c;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.warning-panel {
  height: 100%;
  width: 100%;
  background-color: #f8f9fa;
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
  border-bottom: 2px solid #eee;
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-status {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-online {
  color: #4caf50;
}

.status-offline {
  color: #999;
}

.status-loading {
  color: #2196f3;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

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

.warning-item {
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

.warning-icon {
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

.warning-content {
  flex: 1;
}

.warning-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.warning-message {
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

.suggestion-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  gap: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border-left: 4px solid;
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

.suggestion-priority {
  font-size: 20px;
  flex-shrink: 0;
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

.suggestion-content {
  flex: 1;
}

.suggestion-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.suggestion-description {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 8px;
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

