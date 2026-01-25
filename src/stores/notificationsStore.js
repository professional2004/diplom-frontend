import { defineStore } from 'pinia'

let nextId = 1

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    notifications: []
  }),

  actions: {
    show({ type = 'info', message, timeout = 3000 }) {
      const id = nextId++

      this.notifications.push({ id, type, message })

      if (timeout > 0) {
        setTimeout(() => {
          this.remove(id)
        }, timeout)
      }
    },

    remove(id) {
      this.notifications = this.notifications.filter(n => n.id !== id)
    }
  }
})