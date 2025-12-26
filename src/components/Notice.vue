<template>
  <Transition name="notice">
    <div 
      v-if="notice" 
      class="notice"
      :class="getNoticeTypeClass(notice.type)"
      @click="handleClick"
    >
      <div class="notice-icon">
        <!-- <i class="mdi" :class="getNoticeIcon(notice.type)"></i> -->
      </div>
      <div class="notice-content">
        <div class="notice-title">{{ notice.title }}</div>
        <div class="notice-message">{{ notice.message }}</div>
        <div v-if="notice.requiresAction && !notice.isHandled" class="notice-action-required">
          <i class="mdi mdi-alert-circle"></i> 需要您的操作
        </div>
      </div>
      <button class="close-btn" @click.stop="handleClose">×</button>
    </div>
  </Transition>
</template>

<script setup>
import { useNoticeStore } from '../store/notice'

const props = defineProps({
  notice: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'click'])

const noticeStore = useNoticeStore()

const getNoticeTypeClass = (type) => {
  const typeMap = {
    info: 'notice-info',
    success: 'notice-success',
    warning: 'notice-warning',
    error: 'notice-error',
    weather: 'notice-weather',
    ecology: 'notice-ecology',
    culture: 'notice-culture',
    disaster: 'notice-disaster'
  }
  return typeMap[type] || 'notice-default'
}

// const getNoticeIcon = (type) => {
//   const iconMap = {
//     info: 'mdi-information',
//     success: 'mdi-check-circle',
//     warning: 'mdi-alert',
//     error: 'mdi-alert-circle',
//     weather: 'mdi-cloud',
//     ecology: 'mdi-leaf',
//     culture: 'mdi-book-open-page-variant',
//     disaster: 'mdi-exclamation-thick'
//   }
//   return iconMap[type] || 'mdi-bell'
// }

const handleClick = () => {
  emit('click', props.notice)
}

const handleClose = () => {
  emit('close', props.notice?.id)
}
</script>

<style scoped>
.notice {
  position: absolute;
  top: 60px;
  right: 10px;
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
  border-left: 4px solid #2196f3;
}

.notice:hover {
  transform: translateX(-5px);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
}

/* 基础通知类型 */
.notice-info {
  border-left-color: #2196f3;
}

.notice-success {
  border-left-color: #4caf50;
}

.notice-warning {
  border-left-color: #ff9800;
}

.notice-error {
  border-left-color: #f44336;
}

/* 保留原有的事件类型 */
.notice-weather {
  border-left-color: #2196f3;
}

.notice-ecology {
  border-left-color: #4caf50;
}

.notice-culture {
  border-left-color: #ff9800;
}

.notice-disaster {
  border-left-color: #f44336;
}

.notice-icon {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.notice-icon .mdi {
  color: inherit;
}

/* 根据通知类型设置图标颜色 */
.notice-info .notice-icon .mdi {
  color: #2196f3;
}

.notice-success .notice-icon .mdi {
  color: #4caf50;
}

.notice-warning .notice-icon .mdi,
.notice-culture .notice-icon .mdi {
  color: #ff9800;
}

.notice-error .notice-icon .mdi,
.notice-disaster .notice-icon .mdi {
  color: #f44336;
}

.notice-weather .notice-icon .mdi {
  color: #2196f3;
}

.notice-ecology .notice-icon .mdi {
  color: #4caf50;
}

.notice-content {
  flex: 1;
  min-width: 0;
}

.notice-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.notice-message {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
}

.notice-action-required {
  font-size: 12px;
  color: #f44336;
  font-weight: bold;
  margin-top: 4px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

/* 过渡动画 */
.notice-enter-active,
.notice-leave-active {
  transition: all 0.3s ease;
}

.notice-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notice-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>

