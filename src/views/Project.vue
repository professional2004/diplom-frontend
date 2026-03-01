<script setup>
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useEditorStore } from '@/stores/editorStore'
import { useProjectStore } from '@/stores/projectStore'
import EditorLayout from '@/components/editor/EditorLayout.vue'

const router = useRouter()
const route = useRoute()
const editorStore = useEditorStore()
const projectStore = useProjectStore()

const isLoading = ref(false)
const isSaving = ref(false)
const projectName = ref('')

const loadProject = async (projectId) => {
  if (!projectId) {
    router.push({ name: 'app' })
    return
  }

  isLoading.value = true
  try {
    // 1. Загружаем данные проекта с бека
    const project = await projectStore.fetchProject(projectId)
    projectName.value = project.name

    // 2. Убираем лоадер, чтобы Vue начал рендерить <EditorLayout />
    isLoading.value = false
    
    // 3. Ждем следующего тика (пока отработают onMounted во Viewport-компонентах)
    await nextTick()

    // 4. Теперь движки 100% инициализированы, можно загружать данные фигур
    if (project.projectData && project.projectData !== '{}') {
      try {
        await editorStore.loadProjectFromJSON(project.projectData)
      } catch (error) {
        console.error('Failed to load project data:', error)
      }
    } else {
      // Если проект новый - очищаем сцену
      editorStore.clearCurrentProject()
    }
  } catch (error) {
    console.error('Error loading project:', error)
    router.push({ name: 'app' })
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  const projectId = route.params.projectId
  await loadProject(projectId)
})

// Очищаем состояние редактора при выходе из компонента
onBeforeUnmount(() => {
  editorStore.clearCurrentProject()
})

watch(() => route.params.projectId, async (newProjectId, oldProjectId) => {
  if (newProjectId && newProjectId !== oldProjectId) {
    await loadProject(newProjectId)
  }
})

const handleSaveProject = async () => {
  if (isSaving.value) return

  isSaving.value = true
  try {
    const projectId = route.params.projectId
    
    // Получаем JSON и превью
    const projectData = await editorStore.saveProjectToJSON()
    const preview = await editorStore.generatePreview()

    // Сохраняем на бэкенд
    await projectStore.saveProject(projectId, projectData, preview)
  } catch (error) {
    console.error('Error saving project:', error)
  } finally {
    isSaving.value = false
  }
}

const handleBackToProjects = async () => {
  if (isSaving.value) return
  
  const save = confirm('Сохранить изменения перед выходом?')
  if (save) {
    await handleSaveProject()
  }
  
  router.push({ name: 'app' })
}
</script>

<template>
  <div class="project-page">
    <div class="project-header">
      <div class="header-left">
        <button class="btn-back" @click="handleBackToProjects" :disabled="isSaving">
          ← Вернуться
        </button>
        <h1 class="project-title">{{ projectName }}</h1>
      </div>
      <div class="header-right">
        <button 
          class="btn-save" 
          @click="handleSaveProject"
          :disabled="isSaving || isLoading"
        >
          {{ isSaving ? 'Сохранение...' : 'Сохранить' }}
        </button>
      </div>
    </div>

    <!-- Ремарка: isLoading скрывает Editor, что вызывает unmount сцен, поэтому nextTick был критически важен -->
    <div v-if="isLoading" class="loading">
      <p>Загрузка проекта...</p>
    </div>

    <div v-else class="editor-container">
      <EditorLayout />
    </div>
  </div>
</template>

<style scoped>
/* Твои стили остаются без изменений */
.project-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  color: #e0e0e0;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #2a2a2a;
  border-bottom: 1px solid #444;
  min-height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.header-right {
  display: flex;
  gap: 10px;
}

.project-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.btn-back,
.btn-save {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back {
  background: #444;
  color: #e0e0e0;
}

.btn-back:hover:not(:disabled) {
  background: #555;
}

.btn-save {
  background: #4CAF50;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #45a049;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editor-container {
  flex: 1;
  overflow: hidden;
  display: flex;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
</style>