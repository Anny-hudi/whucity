<template>
  <div class="seemore-panel-container" :class="{ 'panel-open': isOpen }">
    <!-- 面板开关 -->
    <div class="panel-toggle" :class="{'panel-open': !isOpen}" @click="togglePanel">
      <span class="toggle-icon">
        <i class="mdi" :class="!isOpen ? 'mdi-chevron-right' : 'mdi-chevron-left'"></i>
      </span>
    </div>
    
    <!-- SEEMORE 分析看板 -->
    <div class="seemore-panel">
      <div class="panel-header">
        <h3>
          <i class="mdi mdi-chart-line"></i>
          SEEMORE AI 分析
        </h3>
        <button class="analyze-btn" @click="triggerAnalysis" :disabled="isAnalyzing">
          <i class="mdi" :class="isAnalyzing ? 'mdi-loading mdi-spin' : 'mdi-brain'"></i>
          {{ isAnalyzing ? '分析中...' : 'AI 分析' }}
        </button>
      </div>
        
      <div class="panel-content">
        <!-- 分析状态 -->
        <div v-if="!analysisResult && !isAnalyzing" class="empty-state">
          <div class="empty-icon"><i class="mdi mdi-chart-line"></i></div>
          <div class="empty-text">点击"AI 分析"按钮开始分析</div>
          <div class="empty-hint">系统将分析当前城市数据并提供建设建议</div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isAnalyzing" class="loading-state">
          <div class="loading-spinner">
            <i class="mdi mdi-loading mdi-spin"></i>
          </div>
          <div class="loading-text">AI 正在分析城市数据...</div>
        </div>

        <!-- 分析结果 -->
        <div v-if="analysisResult && !isAnalyzing" class="analysis-result">
          <!-- 数据概览 -->
          <div class="data-overview">
            <div class="section-title">
              <i class="mdi mdi-information"></i> 当前数据概览
            </div>
            <div class="data-grid">
              <div class="data-item">
                <div class="data-label">碳积分</div>
                <div class="data-value">{{ currentData.carbon }}</div>
              </div>
              <div class="data-item">
                <div class="data-label">生物多样性</div>
                <div class="data-value">{{ currentData.biodiversity }}</div>
              </div>
              <div class="data-item">
                <div class="data-label">人文值</div>
                <div class="data-value">{{ currentData.culture }}</div>
              </div>
              <div class="data-item">
                <div class="data-label">总评分</div>
                <div class="data-value">{{ currentData.totalScore }}</div>
              </div>
              <div class="data-item">
                <div class="data-label">玩家余额</div>
                <div class="data-value">{{ currentData.balance || 0 }}</div>
              </div>
            </div>
          </div>

          <!-- 趋势指示器 -->
          <div class="trend-indicator" :class="`trend-${analysisResult.trend}`">
            <div class="trend-icon">
              <i v-if="analysisResult.trend === 'improving'" class="mdi mdi-trending-up"></i>
              <i v-else-if="analysisResult.trend === 'declining'" class="mdi mdi-trending-down"></i>
              <i v-else class="mdi mdi-trending-neutral"></i>
            </div>
            <div class="trend-text">
              <div class="trend-label">城市趋势</div>
              <div class="trend-value">
                {{ analysisResult.trend === 'improving' ? '改善中' : analysisResult.trend === 'declining' ? '下降中' : '稳定' }}
              </div>
            </div>
          </div>

          <!-- 摘要 -->
          <div v-if="analysisResult.summary" class="summary-section">
            <div class="section-title">
              <i class="mdi mdi-text"></i> AI 分析摘要
            </div>
            <div class="summary-text">{{ analysisResult.summary }}</div>
          </div>

          <!-- 预警列表 -->
          <div v-if="analysisResult.warnings && analysisResult.warnings.length > 0" class="warnings-section">
            <div class="section-title">
              <i class="mdi mdi-alert"></i> 
              预警信息 
              <span class="count-badge">{{ analysisResult.warnings.length }}</span>
            </div>
            
            <div class="warnings-list">
              <div 
                v-for="(warning, index) in analysisResult.warnings" 
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
          <div v-if="analysisResult.suggestions && analysisResult.suggestions.length > 0" class="suggestions-section">
            <div class="section-title">
              <i class="mdi mdi-lightbulb-on"></i> 
              AI 建设建议 
              <span class="count-badge">{{ analysisResult.suggestions.length }}</span>
            </div>
            
            <div class="suggestions-list">
              <div 
                v-for="(suggestion, index) in analysisResult.suggestions" 
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
          <div v-if="analysisResult.nextSteps && analysisResult.nextSteps.length > 0" class="next-steps-section">
            <div class="section-title">
              <i class="mdi mdi-format-list-checks"></i> 建议行动
            </div>
            <div class="next-steps-list">
              <div 
                v-for="(step, index) in analysisResult.nextSteps" 
                :key="index"
                class="next-step-item"
              >
                <i class="mdi mdi-checkbox-blank-circle-outline"></i>
                {{ step }}
              </div>
            </div>
          </div>

          <!-- 更新时间 -->
          <div v-if="analysisResult.timestamp" class="update-time">
            <i class="mdi mdi-clock-outline"></i>
            分析时间: {{ formatTime(analysisResult.timestamp) }}
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-if="error" class="error-state">
          <div class="error-icon"><i class="mdi mdi-alert-circle"></i></div>
          <div class="error-text">{{ error }}</div>
          <button class="retry-btn" @click="triggerAnalysis">重试</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSeemoreStore } from '../../store/seemore'
import { useStatsStore } from '../../store/stats'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle'])

const seemoreStore = useSeemoreStore()
const statsStore = useStatsStore()

const isOpen = computed(() => props.isOpen)
const isAnalyzing = computed(() => seemoreStore.isAnalyzing)
const analysisResult = computed(() => seemoreStore.analysisResult)
const error = computed(() => seemoreStore.error)
const currentData = computed(() => seemoreStore.currentData)

const togglePanel = () => {
  emit('toggle')
}

const triggerAnalysis = async () => {
  // 收集当前数据
  const data = {
    carbon: statsStore.carbon,
    biodiversity: statsStore.biodiversity,
    culture: statsStore.culture,
    totalScore: statsStore.totalScore,
    balance: statsStore.carbon || 0, // 玩家余额（使用碳积分作为余额）
  }
  
  await seemoreStore.analyzeCity(data)
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
</script>

<style scoped>
.seemore-panel-container {
  position: fixed;
  right: 0;
  top: 0;
  width: 450px;
  height: 100vh;
  z-index: 100;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.seemore-panel-container:not(.panel-open) {
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

.toggle-icon {
  font-size: 1.5rem;
  color: #2196f3;
}

.seemore-panel {
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

.analyze-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.analyze-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.analyze-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-state,
.loading-state,
.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon,
.loading-spinner,
.error-icon {
  font-size: 64px;
  margin-bottom: 16px;
  color: #2196f3;
}

.loading-spinner .mdi {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-text,
.loading-text,
.error-text {
  font-size: 16px;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: #bbb;
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.analysis-result {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
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

.data-overview {
  margin-bottom: 24px;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.data-item {
  text-align: center;
}

.data-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.data-value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
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

