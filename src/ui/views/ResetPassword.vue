<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import router from '@/router'
import api from '@/services/api'
import { useNotificationStore } from '@/stores/notificationsStore'
import PageHeader from '@/ui/components/page_parts/PageHeader.vue';

const password = ref('')
const route = useRoute()
const notificationStore = useNotificationStore()
const token = route.query.token

async function handleResetPassword() {
  try {
    await api.post('/api/auth/reset-password', {
      token,
      newPassword: password.value
    })

    notificationStore.show({type: 'success', message: 'Пароль успешно изменён'})

    router.push('/login')
  } catch {
    notificationStore.show({type: 'error', message: 'Ссылка недействительна или истекла'})
  }
}
</script>


<template>
  <PageHeader/>
  <h1>Новый пароль</h1>

  <label for="input-password">Введите новый пароль пароль</label>
  <input v-model="password" id="input-password" type="password">
  <button @click="handleResetPassword">Сменить пароль</button>
</template>



