<template>
  <div 
    class="exchange-item"
    :class="{ 
      'item-locked': userBalance < item.price,
      'item-selected': selected
    }"
    @click="handleSelect"
  >
    <div class="item-image">
      <img :src="item.image" :alt="item.name">
    </div>
    <div class="item-info">
      <div class="item-price-container">
        <div class="item-name">{{ item.name }}</div>
        <div class="item-price">
          <span class="price-value">{{ item.price }}</span>
          <i class="mdi mdi-leaf price-unit"></i>
        </div>
      </div>
      <div class="item-description">{{ item.description }}</div>
    </div>
  </div>
</template>

<script setup>
// Define props
const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  userBalance: {
    type: Number,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

// Define events
const emit = defineEmits(['exchange', 'select'])

// Handle select item
const handleSelect = () => {
  if (props.userBalance >= props.item.price) {
    emit('select', props.item)
  }
}

</script>

<style scoped>
.exchange-item {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  flex-direction: row;
  gap: 15px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.exchange-item:hover {
  border-color: #3498db;
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.item-locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.item-image {
  width: 100px;
  height: 100px;
  overflow: hidden;
  border-radius: 4px;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-price-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}

.item-name {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.item-description {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.4;
  margin-bottom: 10px;
}

.item-price {
  display: flex;
  gap: 5px;
}

.price-value {
  font-size: 1.2rem;
  font-weight: bold;
}

.price-unit {
  font-size: 1.2rem;
  color: #4caf50;
}

.item-selected {
  border-color: #e74c3c;
  box-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
  transform: translateY(-3px);
}
</style>