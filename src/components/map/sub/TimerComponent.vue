<template>
  <div class="timer-component">
    <div class="timer-icon mdi mdi-timer" style="color: var(--color-text-on-primary);"></div>
    <div class="timer-value">{{ remainingTime }}s</div>
  </div>
</template>

<script setup>
import { computed, watch, ref, onMounted, onUnmounted } from 'vue'
import { useTimeStore } from '../../../store/time'

// Props
const props = defineProps({
  duration: {
    type: Number,
    required: true
  }
})

// Time store
const timeStore = useTimeStore()

// 开始时间
const startTime = ref(0)

// 计算剩余时间
const remainingTime = computed(() => {
  if (!startTime.value) return props.duration
  
  const elapsedTime = timeStore.gameTime - startTime.value
  const remaining = Math.max(0, props.duration - elapsedTime)
  return Math.ceil(remaining)
})

// 组件挂载时初始化开始时间
onMounted(() => {
  startTime.value = timeStore.gameTime
})

// 当duration变化时，重新设置开始时间
watch(() => props.duration, () => {
  startTime.value = timeStore.gameTime
})

// 当游戏时间变化时，确保倒计时更新
watch(() => timeStore.gameTime, () => {
  // 计算属性会自动响应gameTime的变化，这里不需要额外的逻辑
  // 如果需要添加视觉效果或其他逻辑，可以在这里添加
})
</script>

<style scoped>
.timer-component {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  transition: opacity 0.3s ease;
}

.timer-icon {
  margin-right: 4px;
  font-size: 10px;
}

.timer-value {
  font-weight: bold;
  margin-right: 2px;
  color: var(--color-text-on-primary);
}

.timer-unit {
  font-size: 12px;
  opacity: 0.8;
}
</style>