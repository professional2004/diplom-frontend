<script setup>
import { useNotificationStore } from '@/stores/notifications'
const store = useNotificationStore()
</script>


<template>
  <div class="notifications">
    <div v-for="n in store.notifications" :key="n.id" class="notification" :class="n.type">
      <span>{{ n.message }}</span>
      <button @click="store.remove(n.id)">✕</button>
    </div>
  </div>
</template>


<style scoped>
.notifications {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification {
  min-width: 300px;
  padding: 12px 16px;
  border-radius: 6px;
  color: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
  animation: slideDown 0.25s ease-out;
}

.notification button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 16px;
}

.notification.success { background: #2ecc71; }
.notification.error   { background: #e74c3c; }
.notification.info    { background: #3498db; }
.notification.warning { background: #f39c12; }

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
