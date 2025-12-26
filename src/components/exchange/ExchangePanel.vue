<template>
  <div class="exchange-panel-container" :class="{ 'panel-open': isOpen }">
    <!-- 面板开关; fixed -->
    <div class="panel-toggle" :class="{'panel-open': !isOpen}" @click="togglePanel">
      <span class="toggle-icon"><i class="mdi" :class="isOpen ? 'mdi-chevron-left' : 'mdi-chevron-right'"></i></span>
    </div>
    
    <!-- 兑换面板 -->
    <div class="exchange-panel">
      <div class="panel-header">
        <h3>兑换组件</h3>
        <!-- <div class="user-balance">
          <span>当前碳积分：</span>
          <span class="balance-amount">{{ userBalance }}</span>
        </div> -->
      </div>
      
      <div class="panel-content">
        <div class="exchange-items">
          <template v-for="(item, index) in exchangeItems" :key="index">
            <ExchangeItem 
              v-if="item.price >= 0"
              :item="item"
              :user-balance="userBalance"
              :selected="mapStore.selectedTileId === item.id"
              @select="handleItemSelect"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useExchangeStore } from '../../store/exchange'
import { useStatsStore } from '../../store/stats'
import { useMapStore } from '../../store/map'
import ExchangeItem from './sub/ExchangeItem.vue'

// 初始化store
const exchangeStore = useExchangeStore()
const statsStore = useStatsStore()
const mapStore = useMapStore()

// 从store获取数据
const isOpen = computed(() => exchangeStore.isPanelOpen)
const userBalance = computed(() => statsStore.carbon)
const exchangeItems = computed(() => exchangeStore.exchangeItems)

// 使用store的actions
const togglePanel = () => {
  exchangeStore.togglePanel()
}

const exchangeItem = (itemId) => {
  const success = exchangeStore.exchangeItem(itemId)
  if (success) {
    alert(`兑换成功！`)
    // 兑换成功后选中该物品
    mapStore.selectTile(itemId)
  } else {
    alert(`兑换失败，积分不足！`)
  }
}

// 处理物品选择
const handleItemSelect = (item) => {
  // 切换选中状态，如果已经选中则取消选中
  if (mapStore.selectedTileId === item.id) {
    mapStore.selectTile(null)
  } else {
    mapStore.selectTile(item.id)
  }
}

// 键盘事件处理
const handleKeyPress = (event) => {
  // Ctrl + B 切换面板
  if (event.ctrlKey && event.key === 'b') {
    event.preventDefault()
    togglePanel()
  }
}

// 添加和移除事件监听器
onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.exchange-panel-container {
  position: relative;
  width: 300px;
  height: 100vh;
  z-index: 100;
  transition: width 0.3s ease;
}

.exchange-panel-container:not(.panel-open) {
  width: 0px;
}

.panel-toggle {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 25px;
  height: 50px;
  background-color: white;
  border-radius: 0 5px 5px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 101;
  transition: all 0.3s ease;
}

.panel-toggle:not(.panel-open) {
  left: 300px;
}

.panel-toggle:hover {
  background-color: #f5f5f5;
}

.toggle-icon {
  font-size: 1.5rem;
  color: #3498db;
}

.toggle-text {
  display: none;
}

.exchange-panel {
  height: 100%;
  background-color: #f0f0f0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
}

.exchange-panel-container:not(.panel-open) .exchange-panel {
  overflow: hidden;
}

.panel-header {
  z-index: 10;
  position: sticky;
  top: 0;
  padding: 15px;
  height: 55px;
  border-bottom: 2px solid #eee;
  background-color: #fff;

  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exchange-panel-container:not(.panel-open) .panel-header {
  padding: 10px;
}

.exchange-panel-container:not(.panel-open) .panel-header h3,
.exchange-panel-container:not(.panel-open) .user-balance {
  display: none;
}

.panel-content {
  overflow-y: auto;
}

.exchange-panel-container:not(.panel-open) .panel-content {
  display: none;
}

.exchange-items {
  display: grid;
  gap: 20px;
  padding: 10px;
}

</style>