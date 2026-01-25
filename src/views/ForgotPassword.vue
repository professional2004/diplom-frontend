<script setup>
import { ref } from 'vue';
import api from '@/services/api';
import { useNotificationStore } from '@/stores/notificationsStore';

const email = ref('');
const notify = useNotificationStore();

async function submit() {
  await api.post('/api/auth/forgot-password', { email: email.value })
  notify.show({
    type: 'info',
    message: 'Если email существует, ссылка отправлена'
  })
};
</script>


<template>
  <h1>Забыли пароль?</h1>

  <input v-model="email" placeholder="Email" />
  <button @click="submit">Отправить ссылку для смены пароля</button>
</template>


