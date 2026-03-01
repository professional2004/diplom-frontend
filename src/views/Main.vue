<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { onMounted } from 'vue'

const router = useRouter()
const auth = useAuthStore()

onMounted(() => {
  // If user is authenticated, redirect to app
  if (auth.isAuthenticated) {
    router.push({ name: 'app' })
  }
})
</script>

<template>
  <div class="main-page">
    <header class="main-header">
      <h1 class="brand-title">САПР Текстильных Изделий</h1>
      <p class="brand-subtitle">Инструмент для проектирования и развёртки текстильных поверхностей</p>
    </header>

    <main class="main-content">
      <div class="hero-section">
        <div class="hero-content">
          <h2>Добро пожаловать!</h2>
          <p>Современный инструмент для 3D-проектирования и 2D-развёртки текстильных изделий</p>
          
          <div class="cta-buttons">
            <router-link :to="{ name: 'login' }" class="btn btn-primary">
              Вход
            </router-link>
            <router-link :to="{ name: 'register' }" class="btn btn-secondary">
              Регистрация
            </router-link>
          </div>
        </div>

        <div class="hero-illustration">
          <div class="demo-box">
            <div class="demo-item">3D Моделирование</div>
            <div class="demo-item">2D Развёртки</div>
          </div>
        </div>
      </div>

      <section class="features">
        <h3>Возможности</h3>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">📐</div>
            <h4>3D Редактор</h4>
            <p>Мощный редактор для создания 3D моделей поверхностей</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📄</div>
            <h4>2D Развёртки</h4>
            <p>Автоматическое создание развёрток для производства</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">💾</div>
            <h4>Сохранение</h4>
            <p>Сохраняйте ваши проекты в облаке</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔗</div>
            <h4>Связи</h4>
            <p>Управляйте связями между поверхностями</p>
          </div>
        </div>
      </section>
    </main>

    <footer class="main-footer">
      <p>&copy; 2026 САПР Текстильных Изделий. Все права защищены.</p>
    </footer>
  </div>
</template>

<style scoped>
.main-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.main-header {
  background: linear-gradient(180deg, rgba(76, 175, 80, 0.1) 0%, transparent 100%);
  border-bottom: 2px solid #4CAF50;
  padding: 40px 30px;
  text-align: center;
}

.brand-title {
  margin: 0;
  font-size: 48px;
  font-weight: 700;
  color: #4CAF50;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.brand-subtitle {
  margin: 10px 0 0 0;
  font-size: 18px;
  color: #999;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 60px;
  padding: 60px 30px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.hero-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 50px;
  align-items: center;
  padding: 40px;
  background: rgba(42, 42, 42, 0.5);
  border-radius: 12px;
  border: 1px solid #444;
}

.hero-content h2 {
  margin: 0 0 20px 0;
  font-size: 36px;
  font-weight: 700;
  color: #ffffff;
}

.hero-content p {
  margin: 0 0 30px 0;
  font-size: 18px;
  color: #b0b0b0;
  line-height: 1.6;
}

.cta-buttons {
  display: flex;
  gap: 15px;
}

.btn {
  display: inline-block;
  padding: 14px 30px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  text-align: center;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(76, 175, 80, 0.3);
}

.btn-secondary {
  background: transparent;
  color: #4CAF50;
  border: 2px solid #4CAF50;
}

.btn-secondary:hover {
  background: #4CAF50;
  color: white;
}

.hero-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
}

.demo-box {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 30px;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 60px rgba(76, 175, 80, 0.3);
}

.demo-item {
  width: 100%;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-weight: 600;
  text-align: center;
}

.features {
  text-align: center;
}

.features h3 {
  margin: 0 0 40px 0;
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.feature-card {
  background: rgba(42, 42, 42, 0.5);
  border: 1px solid #444;
  border-radius: 12px;
  padding: 30px;
  transition: all 0.3s ease;
}

.feature-card:hover {
  border-color: #4CAF50;
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.15);
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.feature-card h4 {
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.feature-card p {
  margin: 0;
  color: #999;
  font-size: 14px;
  line-height: 1.6;
}

.main-footer {
  text-align: center;
  padding: 30px;
  color: #666;
  border-top: 1px solid #444;
  font-size: 14px;
}

@media (max-width: 768px) {
  .brand-title {
    font-size: 32px;
  }

  .main-content {
    gap: 40px;
    padding: 40px 20px;
  }

  .hero-section {
    grid-template-columns: 1fr;
    gap: 30px;
    padding: 30px;
  }

  .hero-content h2 {
    font-size: 28px;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .cta-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
