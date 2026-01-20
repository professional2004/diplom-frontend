import { defineStore } from 'pinia'
import api from '@/services/api'
import router from '@/router'

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
      await api.post('/api/auth/login', credentials)
      await this.fetchUser()
      router.push({ name: 'app' })
    },

    async logout() {
      await api.post('/api/auth/logout')
      this.user = null
      this.isAuthenticated = false
      router.push('/login')
    }
    
  }
})
