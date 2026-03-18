<script setup>
import { ref } from 'vue';
import api from '@/services/api';
import { useNotificationStore } from '@/stores/notificationsStore';
import PageHeader from '@/ui/components/page_parts/PageHeader.vue';

const email = ref('');
const notificationStore = useNotificationStore();

async function submit() {
  await api.post('/api/auth/forgot-password', { email: email.value })
  notificationStore.show({type: 'info', message: 'Если email существует, ссылка отправлена'})
};
</script>


<template>
  <PageHeader/>
  <h1>Забыли пароль?</h1>

  <input v-model="email" placeholder="Email" />
  <button @click="submit">Отправить ссылку для смены пароля</button>
</template>


