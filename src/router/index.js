import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Login from '@/views/Login.vue'
import Signup from '@/views/Signup.vue'
import Main from '@/views/Main.vue'
import Home from '@/views/Home.vue'

const routes = [
  { path: '/', name: 'main', component: Main },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Signup },
  { path: '/app', name: 'app', component: Home, meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})



router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    try {
      await auth.fetchUser()
    } catch {}
    if (!auth.isAuthenticated) {
      return { name: 'login' }
    }
  }

  if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    return { name: 'app' }
  }
})


export default router
