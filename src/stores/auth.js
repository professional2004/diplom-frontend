import { defineStore } from 'pinia'
import api from '@/services/api'

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
        const { data } = await api.get('/auth/me')
        this.user = data
        this.isAuthenticated = true
      } catch {
        this.user = null
        this.isAuthenticated = false
      } finally {
        this.isLoading = false
      }
    },

    async login(payload) {
      await api.post('/auth/login', payload)
      await this.fetchUser()
    },

    async logout() {
      await api.post('/auth/logout')
      this.user = null
      this.isAuthenticated = false
    }
  }
})
