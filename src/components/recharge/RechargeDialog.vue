<template>
  <Transition name="dialog-fade">
    <div v-if="isOpen" class="recharge-dialog-overlay" @click.self="closeDialog">
      <div class="recharge-dialog">
        <div class="dialog-header">
          <h3>
            <i class="mdi mdi-wallet"></i>
            充值
          </h3>
          <button class="close-btn" @click="closeDialog">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
        
        <div class="dialog-content">
          <div class="current-balance">
            <div class="balance-label">当前余额</div>
            <div class="balance-value">
              <i class="mdi mdi-leaf" style="color: #4caf50;"></i>
              {{ currentCarbon }}
            </div>
          </div>
          
          <div class="recharge-options">
            <div class="options-title">选择充值额度</div>
            <div class="options-grid">
              <button
                v-for="amount in rechargeAmounts"
                :key="amount"
                class="amount-btn"
                :class="{ active: selectedAmount === amount }"
                @click="selectedAmount = amount"
              >
                <div class="amount-value">{{ amount }}</div>
                <div class="amount-label">碳积分</div>
              </button>
            </div>
          </div>
          
          <div class="custom-amount">
            <div class="custom-label">或输入自定义金额</div>
            <input
              v-model.number="customAmount"
              type="number"
              class="custom-input"
              placeholder="输入金额"
              min="1"
              @input="selectedAmount = null"
            />
          </div>
          
          <div class="recharge-summary">
            <div class="summary-item">
              <span>充值金额：</span>
              <span class="summary-value">{{ finalAmount }} 碳积分</span>
            </div>
            <div class="summary-item">
              <span>充值后余额：</span>
              <span class="summary-value">{{ currentCarbon + finalAmount }} 碳积分</span>
            </div>
          </div>
        </div>
        
        <div class="dialog-footer">
          <button class="cancel-btn" @click="closeDialog">取消</button>
          <button class="confirm-btn" @click="confirmRecharge" :disabled="finalAmount <= 0">
            <i class="mdi mdi-check"></i>
            确认充值
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStatsStore } from '../../store/stats'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const statsStore = useStatsStore()

const rechargeAmounts = [100, 200, 500, 1000, 2000, 5000]
const selectedAmount = ref(null)
const customAmount = ref(null)

const currentCarbon = computed(() => statsStore.carbon)

const finalAmount = computed(() => {
  if (selectedAmount.value !== null) {
    return selectedAmount.value
  }
  if (customAmount.value && customAmount.value > 0) {
    return customAmount.value
  }
  return 0
})

const closeDialog = () => {
  emit('close')
  // 重置选择
  selectedAmount.value = null
  customAmount.value = null
}

const confirmRecharge = () => {
  if (finalAmount.value <= 0) return
  
  // 直接充值（测试阶段）
  statsStore.updateCarbon(finalAmount.value)
  
  console.log(`💰 充值成功: +${finalAmount.value} 碳积分`)
  
  // 关闭对话框
  closeDialog()
}
</script>

<style scoped>
.recharge-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.recharge-dialog {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 20px 24px;
  border-bottom: 2px solid #eee;
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h3 {
  margin: 0;
  font-size: 20px;
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

.dialog-content {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

.current-balance {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 24px;
}

.balance-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.balance-value {
  font-size: 32px;
  font-weight: bold;
  color: #2e7d32;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.recharge-options {
  margin-bottom: 24px;
}

.options-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.amount-btn {
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.amount-btn:hover {
  border-color: #4caf50;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.amount-btn.active {
  border-color: #4caf50;
  background: #e8f5e9;
}

.amount-value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.amount-btn.active .amount-value {
  color: #2e7d32;
}

.amount-label {
  font-size: 12px;
  color: #999;
}

.custom-amount {
  margin-bottom: 24px;
}

.custom-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.custom-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
}

.custom-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.recharge-summary {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-value {
  font-weight: bold;
  color: #2e7d32;
}

.dialog-footer {
  padding: 16px 24px;
  border-top: 2px solid #eee;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn,
.confirm-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.confirm-btn {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 过渡动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: all 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .recharge-dialog,
.dialog-fade-leave-to .recharge-dialog {
  transform: scale(0.9) translateY(20px);
}
</style>

