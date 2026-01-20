<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import router from '@/router'
import { useNotificationStore } from '@/stores/notifications'

const password = ref('')
const route = useRoute()
const notify = useNotificationStore()
const token = route.query.token

async function handleResetPassword() {
  try {
    await api.post('/api/auth/reset-password', {
      token,
      newPassword: password.value
    })

    notify.show({
      type: 'success',
      message: 'Пароль успешно изменён'
    })

    router.push('/login')
  } catch {
    notify.show({
      type: 'error',
      message: 'Ссылка недействительна или истекла'
    })
  }
}
</script>




<template>
  <h1>Новый пароль</h1>

  <label for="input-password">Введите новый пароль пароль</label>
  <input v-model="password" id="input-password" type="password">
  <button @click="handleResetPassword">Сменить пароль</button>
</template>



