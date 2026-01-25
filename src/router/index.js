import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import Login from '@/views/Login.vue'
import Signup from '@/views/Signup.vue'
import Main from '@/views/Main.vue'
import Home from '@/views/Home.vue'
import Error from '@/views/Error.vue'
import ForgotPassword from '@/views/ForgotPassword.vue'
import ResetPassword from '@/views/ResetPassword.vue'

const routes = [
  { path: '/', name: 'main', component: Main },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Signup },
  { path: '/forgot-password', name: 'forgot-password', component: ForgotPassword },
  { path: '/reset-password', name: 'reset-password', component: ResetPassword },
  { path: '/app', name: 'app', component: Home, meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', name: 'error', component: Error }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})


let initialAuthCheckDone = false

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  
  if (!initialAuthCheckDone) {
    try {
      await auth.fetchUser()
    } catch (e) {

    } finally {
      initialAuthCheckDone = true
    }
  }

  // Защищённые маршруты
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  // Если пользователь уже залогинен
  if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    return { name: 'app' }
  }
})


export default router
