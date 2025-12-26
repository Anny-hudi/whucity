<template>
  <button
    class="panel-toggle"
    :class="[
      type,
      { 'has-events': hasEvents }
    ]"
    @click="handleClick"
  >
    <!--
      @mouseenter="shortcutVisible = true"
      @mouseleave="shortcutVisible = false"
    -->
    <i :class="`mdi ${icon}`" style="font-size: 1.2rem; color: var(--color-text-on-primary);"></i>
    <span v-if="badgeCount > 0" class="event-badge">
      {{ badgeCount }}
    </span>
    <!-- <span v-if="shortcutVisible && shortcutText" class="shortcut-text">
      {{ icon }}
    </span> -->
    <div class="float-window-container">
      <slot name="float-window"></slot>
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useEventsStore } from '../../store/events'
import { useExchangeStore } from '../../store/exchange'
import { useSeemoreStore } from '../../store/seemore'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['event', 'exchange', 'restart', 'seemore'].includes(value)
  }
})

const eventsStore = useEventsStore()
const exchangeStore = useExchangeStore()
const seemoreStore = useSeemoreStore()

const icon = computed(() => {
  if (props.type === 'restart') {
    return 'mdi-restart'
  }
  if (props.type === 'seemore') {
    return 'mdi-brain'
  }
  return props.type === 'event' ? 'mdi-clipboard-text' : 'mdi-store'
})

const badgeCount = computed(() => {
  if (props.type === 'event') {
    return eventsStore.activeEvents.length
  }
  return 0
})

const hasEvents = computed(() => {
  if (props.type === 'event') {
    return eventsStore.eventsRequiringResponse.length > 0
  }
  return false
})

const handleClick = () => {
  if (props.type === 'event') {
    eventsStore.toggleEventPanel()
  } else if (props.type === 'seemore') {
    seemoreStore.togglePanel()
  } else if (props.type === 'exchange') {
    exchangeStore.togglePanel()
  }
}
</script>

<style scoped>
/* 通用按钮样式 */
.panel-toggle {
  position: absolute;
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
  background: var(--color-primary-transparent-20);
  color: var(--color-text-on-primary);
}

.panel-toggle:hover {
  background: var(--color-primary-transparent-30);
}

/* 位置样式 */
.panel-toggle.event {
  right: 1rem;
}

.panel-toggle.exchange {
  left: 1rem;
}

.panel-toggle.seemore {
  right: 5rem;
}

/* 重启按钮特有样式 */
.panel-toggle.restart {
  right: 9rem;
}



/* 事件面板特有样式 */
.panel-toggle.event.has-events {
  background: rgba(244, 67, 54, 0.2);
  border-color: rgba(244, 67, 54, 0.4);
  animation: pulse 2s infinite;
}

.panel-toggle.event.has-events:hover {
  background: rgba(244, 67, 54, 0.3);
}


/* 徽章样式 */
.event-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff5722;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

/* 快捷键文本样式 */
.shortcut-text {
  color: var(--color-text-on-primary);
  transition: all 0.3s ease;
  font-size: 0.7rem;
  background: var(--color-primary-transparent-40);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
  max-width: 0;
  opacity: 0;
}

/* 事件按钮（左侧）的快捷键文本从左侧动画 */
.panel-toggle.event .shortcut-text {
  transform: translateX(-5px);
}

/* 交换按钮（右侧）的快捷键文本从右侧动画 */
.panel-toggle.exchange .shortcut-text {
  transform: translateX(5px);
}

/* 当鼠标悬停时的动画效果 */
.panel-toggle:hover .shortcut-text {
  max-width: 100px;
  opacity: 1;
  transform: translateX(0);
}

/* 浮窗容器样式 */
.float-window-container {
  position: absolute;
  top: 120%;
  z-index: 1000;
  margin-top: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-primary-transparent-20);
}

/* 事件按钮（右侧）的浮窗向左对齐 */
.panel-toggle.event .float-window-container {
  right: 0;
}

/* 交换按钮（左侧）的浮窗向右对齐 */
.panel-toggle.exchange .float-window-container {
  left: 0;
}

/* 脉冲动画 */
@keyframes pulse {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(244, 67, 54, 0.4);
  }
  50% {
    box-shadow: 0 2px 12px rgba(244, 67, 54, 0.6);
  }
}
</style>