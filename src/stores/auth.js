import { defineStore } from 'pinia'
import api from '@/services/api'
import router from '@/router'
import { useNotificationStore } from '@/stores/notifications'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false
  }),

  actions: {
    async fetchUser() {
      this.isLoading = true
      try {
        const { data } = await api.get('/api/auth/check')
        this.user = data
        this.isAuthenticated = true
      } catch {
        this.user = null
        this.isAuthenticated = false
      } finally {
        this.isLoading = false
      }
    },

    async login(credentials) {
      const notify = useNotificationStore()

      try {
        await api.post('/api/auth/login', credentials)
        await this.fetchUser()
        notify.show({
          type: 'success',
          message: 'Вы успешно вошли в систему'
        })
        router.push({ name: 'app' })
      } catch (e) {
        notify.show({
          type: 'error',
          message: 'Неверный email или пароль'
        })
        throw e
      }
    },

    async logout() {
      const notify = useNotificationStore()

      try {
        await api.post('/api/auth/logout')
        notify.show({
          type: 'info',
          message: 'Вы вышли из аккаунта'
        })
      } finally {
        this.$reset()
        router.push({ name: 'login' })
      }
    }
    
  }
})
