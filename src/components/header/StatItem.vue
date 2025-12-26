<template>
  <div class="stat-item" :class="{ 'stat-item-collapsed': !isExpanded }">
    <div class="stat-icon">
      <i :class="icon" :style="{ color: iconColor }" />
    </div>
    <span class="stat-label">{{ label }}</span>
    <span class="stat-value" ref="valueRef">{{ displayValue }}</span>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  value: {
    type: [Number, String],
    required: true
  },
  label: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  iconColor: {
    type: String,
    required: true
  },
  isExpanded: {
    type: Boolean,
    default: false
  },
  enableAnimation: {
    type: Boolean,
    default: true
  }
})

const valueRef = ref(null)
const displayValue = ref(typeof props.value === 'string' ? props.value : 0)
const animationDuration = 1000 // 动画持续时间，单位毫秒

// 数字滚动动画函数
const animateValue = (start, end, duration) => {
  const startTime = performance.now()
  const range = end - start

  const updateValue = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // 使用缓动函数，使动画更自然
    const easedProgress = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2
    
    displayValue.value = Math.floor(start + range * easedProgress)
    
    if (progress < 1) {
      requestAnimationFrame(updateValue)
    } else {
      // 确保最终值准确
      displayValue.value = end
    }
  }
  
  requestAnimationFrame(updateValue)
}

// 监听value变化，触发动画
watch(
  () => props.value,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      // 如果是字符串类型，直接显示
      if (typeof newValue === 'string') {
        displayValue.value = newValue
      } else if (props.enableAnimation) {
        animateValue(oldValue || 0, newValue, animationDuration)
      } else {
        displayValue.value = newValue
      }
    }
  }
)

// 组件挂载时初始化显示值
onMounted(() => {
  // 如果是字符串类型，直接显示
  if (typeof props.value === 'string') {
    displayValue.value = props.value
  } else if (props.enableAnimation) {
    animateValue(0, props.value, animationDuration)
  } else {
    displayValue.value = props.value
  }
})
</script>

<style scoped>
.stat-item {
  text-align: center;
  padding: 0.5rem 2rem;
  min-width: 100px;
  background: var(--color-primary-transparent-10);
  border-radius: 6px;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--color-primary-transparent-20);
  transition: all 0.4s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.stat-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  background: var(--color-primary-transparent-15);
}

.stat-icon {
  font-size: 2rem;
  transition: all 0.4s ease;
}

.stat-label {
  font-size: 1.2rem;
  font-weight: 500;
  text-transform: uppercase;
  transition: all 0.4s ease;
  color: var(--color-text-on-primary);
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  transition: all 0.4s ease;
  color: var(--color-text-on-primary);
}

/* 收起状态样式 */
.stat-item-collapsed {
  padding: 0.25rem 1rem;
  min-width: 80px;
  gap: 0.5rem;
  flex-direction: row;
  justify-content: center;
}

.stat-item-collapsed .stat-icon {
  font-size: 1.5rem;
}

.stat-item-collapsed .stat-label {
  display: none;
}

.stat-item-collapsed .stat-value {
  font-size: 1.2rem;
}
</style>