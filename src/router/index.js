import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import Login from '@/ui/views/Login.vue'
import Signup from '@/ui/views/Signup.vue'
import Main from '@/ui/views/Main.vue'
import Home from '@/ui/views/Home.vue'
import Project from '@/ui/views/Project.vue'
import Error from '@/ui/views/Error.vue'
import ForgotPassword from '@/ui/views/ForgotPassword.vue'
import ResetPassword from '@/ui/views/ResetPassword.vue'

const routes = [
  { path: '/', name: 'main', component: Main },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Signup },
  { path: '/forgot-password', name: 'forgot-password', component: ForgotPassword },
  { path: '/reset-password', name: 'reset-password', component: ResetPassword },
  { path: '/app', name: 'app', component: Home, meta: { requiresAuth: true } },
  { path: '/project/:id', name: 'project', component: Project, meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', name: 'error', component: Error }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})


let initialAuthCheckDone = false

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  
  if (!initialAuthCheckDone) {
    try {
      await authStore.fetchUser()
    } catch (e) {

    } finally {
      initialAuthCheckDone = true
    }
  }

  // Защищённые маршруты
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'main' }
  } else if ((to.name === 'login' || to.name === 'register') && authStore.isAuthenticated) {
    return { name: 'app' }
  }
})


export default router
