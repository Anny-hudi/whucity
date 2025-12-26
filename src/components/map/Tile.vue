<template>
  <div 
    class="iso-tile" 
    :class="{'hover': hover}"
    :style="tileStyle"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu.prevent="handleRightClick"
    @mouseenter="handleMouseMove"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    ref="tileElement"
  >
    <div class="tile-float">
      <slot name="float"></slot>
    </div>
    <div class="tile-image" :style="imageStyle"></div>
</div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useMapStore } from '../../store/map'
import { useTimeStore } from '../../store/time'
import { useStatsStore } from '../../store/stats'
import { mapConfig } from '../../config/map'

// Props
const props = defineProps({
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  tileId: {
    type: Number,
    default: 0
  },
  height: {
    type: Number,
    default: 1
  },
  hover: {
    type: Boolean,
    default: false
  },
  tileWidth: {
    type: Number,
    default: 128
  },
  tileHeight: {
    type: Number,
    default: 64
  },
  textures: {
    type: Object,
    default: () => ({})
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  sprites: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['click', 'contextmenu', 'mouseenter', 'mouseleave', 'double-click'])

// Refs
const tileElement = ref(null)

// 状态
const isMouseOver = ref(false)

// Map store
const mapStore = useMapStore()
// Time store
const timeStore = useTimeStore()
// Stats store
const statsStore = useStatsStore()

// 当前瓦片的任务ID
const taskId = ref(null)

// 计算瓦片位置
const tilePosition = computed(() => {
  const x = (props.y - props.x) * (props.tileWidth / 2)
  const y = (props.x + props.y) * (props.tileHeight / 3.1)
  return { x, y }
})

// 计算各面样式
const tileStyle = computed(() => ({
  position: 'absolute',
  left: `${tilePosition.value.x}px`,
  top: `${tilePosition.value.y}px`,
  width: `${props.tileWidth}px`,
  height: `${props.tileHeight}px`, // 调整高度以匹配等轴测图像
  zIndex: props.x + props.y, // 堆叠顺序
  overflow: 'hidden'
}))

// 完整瓦片图像样式
const imageStyle = computed(() => {
  return {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundImage: `url(${props.textures[props.tileId]?.src || ''})`,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
})

// 鼠标移动/进入事件
const handleMouseMove = (event) => {
  if (!tileElement.value) return
  
  const rect = tileElement.value.getBoundingClientRect()
  const mouseX = Math.round((event.clientX - rect.left) * (props.tileWidth / rect.width))
  const mouseY = Math.round((event.clientY - rect.top) * (props.tileHeight / rect.height))
  
  // 使用mapStore中的方法检查透明度
  const isOverNonTransparent = mapStore.isPixelNonTransparent(
    props.tileId, 
    mouseX, 
    mouseY, 
    props.tileWidth, 
    props.tileHeight, 
  )

  if (isOverNonTransparent && !isMouseOver.value) {
    isMouseOver.value = true
    emit('mouseenter', { x: props.x, y: props.y })
  } else if (!isOverNonTransparent) {
    // 当鼠标在透明区域时，根据鼠标相对中心点的偏移判断应该激活的相邻瓦片
    
    // 计算鼠标相对于瓦片中心的偏移
    const offsetX = mouseX - props.tileWidth / 2
    const offsetY = mouseY - props.tileHeight / 2
    
    // 等轴测坐标系统中，左上和右上的区域划分
    let targetX = props.x
    let targetY = props.y

    if (offsetX < 0 && offsetY < 0) {
      // 左上区域
      targetX = props.x
      targetY = props.y - 1
    } else if (offsetX > 0 && offsetY < 0) {
      // 右上区域
      targetX = props.x - 1
      targetY = props.y
    }
    
    isMouseOver.value = false
    emit('mouseleave', { x: props.x, y: props.y })
    emit('mouseenter', { x: targetX, y: targetY })
  }
}

// 鼠标离开事件
const handleMouseLeave = () => {
  if (isMouseOver.value) {
    isMouseOver.value = false
    emit('mouseleave', { x: props.x, y: props.y })
  }
}

// 点击事件处理：MapGrid 中保存的选中瓦片
const handleClick = (event) => {
  emit('click')
}

const handleRightClick = () => {
  emit('contextmenu')
}

// 双击事件处理：emit事件，由MapGrid处理具体逻辑
const handleDoubleClick = () => {
  emit('double-click')
}

// 获取当前瓦片的配置信息
const currentTileConfig = computed(() => {
  return mapConfig.tiles.find(tile => tile.id === props.tileId)
})

// 检查当前瓦片是否可变化
const isChangeable = computed(() => {
  return currentTileConfig.value?.change && !currentTileConfig.value.change.isFinal
})

// 当瓦片ID变化时，管理定时任务
watch(() => props.tileId, (newId, oldId) => {
  // 取消旧任务
  if (taskId.value !== null) {
    timeStore.cancelTask(taskId.value)
    taskId.value = null
  }
  
  // 获取新瓦片配置
  const newConfig = mapConfig.tiles.find(tile => tile.id === newId)
  if (newConfig?.change && !newConfig.change.isFinal) {
    // 创建新任务
    taskId.value = timeStore.scheduleTask(
      newConfig.change.duration,
      () => {
        // 任务执行时更新瓦片
        mapStore.updateTile(props.x, props.y, newConfig.change.targetId)
        // 任务完成后重置任务ID
        taskId.value = null
      },
      { x: props.x, y: props.y } // 任务数据
    )
  }
}, { immediate: true })

onMounted(() => {
  // 组件挂载时不需要额外操作，watch会处理初始任务
})

onUnmounted(() => {
  // 取消当前瓦片的定时任务
  if (taskId.value !== null) {
    timeStore.cancelTask(taskId.value)
    taskId.value = null
  }
  // 同时取消所有与当前瓦片坐标相关的任务，确保彻底清理
  timeStore.cancelTasksByData({ x: props.x, y: props.y })
})

</script>

<style scoped>
.iso-tile {
  transform-style: preserve-3d;
  cursor: pointer;
  transition: transform 0.2s ease;
  position: relative;
}

.iso-tile.hover {
  transform: translateY(-5px);
}

.tile-image {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sprite {
  /* 精灵容器样式 */
  transition: all 0.3s ease;
}

.sprite-image {
  display: block;
  image-rendering: pixelated; /* 保持像素风格 */
}

.tile-float {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  z-index: 1000;
}

</style>