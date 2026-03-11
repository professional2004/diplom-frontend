<script setup>
import { ref, watch, onUnmounted } from 'vue'

// Определяем props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  project: {
    type: Object,
    default: null
  }
})

// Определяем emits
const emit = defineEmits(['update:visible', 'close'])

// Локальное состояние для анимации
const show = ref(props.visible)

// Следим за изменением props.visible и синхронизируем с show
watch(() => props.visible, (val) => {
  show.value = val
  if (val) {
    // При открытии добавляем обработчик клавиши Escape
    document.addEventListener('keydown', handleEscape)
  } else {
    document.removeEventListener('keydown', handleEscape)
  }
})

// Закрытие модалки
const close = () => {
  emit('update:visible', false)
  emit('close')
}

// Обработчик Escape
const handleEscape = (e) => {
  if (e.key === 'Escape') close()
}

// Очищаем обработчик при размонтировании
onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})


watch(show, (val) => {
  if (val) {
    document.body.classList.add('modal-open')
  } else {
    document.body.classList.remove('modal-open')
  }
})
</script>


<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="close">
        <div class="modal-container">
          <header class="modal-header">
            <slot name="header">
              <h3>{{ project?.name || 'Просмотр проекта' }}</h3>
            </slot>
            <button class="close-btn" @click="close">&times;</button>
          </header>
          <main class="modal-content">
            <div v-if="project">
              <p><strong>Описание:</strong> {{ project.description }}</p>
              <p><strong>Создан:</strong> {{ new Date(project.createdAt).toLocaleDateString() }}</p>
              <!-- Добавьте другие поля, если нужно -->
            </div>
            <div v-else>
              <p>Проект не выбран</p>
            </div>
          </main>
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-content {
  padding: 1rem;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #eee;
  text-align: right;
}

/* Анимации */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}
</style>