import { defineStore } from 'pinia'
import api from '@/services/api'
import router from '@/router'
import { useNotificationStore } from '@/stores/notificationsStore'

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
        const { data } = await api.get('/api/auth/me')
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
      const notificationStore = useNotificationStore()
      try {
        await api.post('/api/auth/login', credentials)
        await this.fetchUser()
        notificationStore.show({type: 'success', message: 'Вы успешно вошли в систему'})
        router.push({ name: 'app' })
      } catch (error) {
        notificationStore.show({type: 'error', message: 'Неверный email или пароль'})
        throw error
      }
    },


    async logout() {
      const notificationStore = useNotificationStore()
      try {
        await api.post('/api/auth/logout')
        notificationStore.show({type: 'info', message: 'Вы вышли из аккаунта'})
      } finally {
        this.$reset()
        router.push({ name: 'login' })
      }
    },


    async deleteAccount() {
      const notificationStore = useNotificationStore()
      try {
        await api.delete('/api/auth/delete-account');
        this.$reset()
        notificationStore.show({type: 'info', message: 'Вы успешно удалили аккаунт'})
      } catch (error) {
        notificationStore.show({type: 'error', message: 'Ошибка при удалении аккаунта'})
        throw error;
      }
    }
    
  }
})
