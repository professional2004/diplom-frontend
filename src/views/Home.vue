<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'

const router = useRouter()
const auth = useAuthStore()
const projectStore = useProjectStore()

const selectedCategoryId = ref(null)
const isCreatingProject = ref(false)
const newProjectName = ref('')
const newProjectDescription = ref('')
const showCreateDialog = ref(false)

onMounted(async () => {
  if (!projectStore.projects.length && !projectStore.isLoading) {
    await loadProjects()
  }
})

const loadProjects = async () => {
  try {
    await projectStore.fetchProjectsAndCategories()
    if (projectStore.categories.length > 0) {
      selectedCategoryId.value = projectStore.categories[0].id
    }
  } catch (error) {
    console.error('Error loading projects:', error)
  }
}

const filteredProjects = computed(() => {
  if (!selectedCategoryId.value) {
    return projectStore.projects
  }
  return projectStore.projectsByCategory(selectedCategoryId.value)
})

const handleCreateProject = async () => {
  if (!newProjectName.value.trim()) {
    alert('Пожалуйста, введите название проекта')
    return
  }

  isCreatingProject.value = true
  try {
    const project = await projectStore.createProject(
      newProjectName.value,
      newProjectDescription.value
    )
    
    // Reset form
    newProjectName.value = ''
    newProjectDescription.value = ''
    showCreateDialog.value = false
    
    // Navigate to project
    router.push({ name: 'project', params: { projectId: project.id } })
  } catch (error) {
    console.error('Error creating project:', error)
  } finally {
    isCreatingProject.value = false
  }
}

const handleOpenProject = (projectId) => {
  router.push({ name: 'project', params: { projectId } })
}

const handleDuplicateProject = async (projectId) => {
  if (!confirm('Дублировать этот проект?')) return
  
  try {
    await projectStore.duplicateProject(projectId)
  } catch (error) {
    console.error('Error duplicating project:', error)
  }
}

const handleDeleteProject = async (projectId) => {
  if (!confirm('Вы уверены? Проект будет удален безвозвратно.')) return
  
  try {
    await projectStore.deleteProject(projectId)
  } catch (error) {
    console.error('Error deleting project:', error)
  }
}

const handleLogout = async () => {
  try {
    await auth.logout()
  } catch (error) {
    console.error('Error logging out:', error)
  }
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getPreviewUrl = (previewData) => {
  if (!previewData) return null
  
  // If it's a string (base64), use it directly
  if (typeof previewData === 'string') {
    return `data:image/png;base64,${previewData}`
  }
  
  // If it's a Uint8Array or Buffer, convert to blob URL
  if (previewData instanceof Uint8Array || previewData instanceof Array) {
    const blob = new Blob([new Uint8Array(previewData)], { type: 'image/png' })
    return URL.createObjectURL(blob)
  }
  
  return null
}
</script>

<template>
  <div class="home-page">
    <!-- Header -->
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">САПР Текстильных Изделий</h1>
        <div class="header-actions">
          <button class="btn-create-project" @click="showCreateDialog = true">
            + Создать проект
          </button>
          <button class="btn-logout" @click="handleLogout">
            Выход
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Sidebar with Categories -->
      <aside class="categories-sidebar">
        <h2>Категории</h2>
        <div class="categories-list">
          <button
            class="category-item"
            :class="{ active: selectedCategoryId === null }"
            @click="selectedCategoryId = null"
          >
            Все проекты
          </button>
          <button
            v-for="category in projectStore.categories"
            :key="category.id"
            class="category-item"
            :class="{ active: selectedCategoryId === category.id }"
            @click="selectedCategoryId = category.id"
          >
            {{ category.name }}
          </button>
        </div>
      </aside>

      <!-- Projects Grid -->
      <section class="projects-section">
        <div v-if="projectStore.isLoading" class="loading">
          <p>Загрузка проектов...</p>
        </div>

        <div v-else-if="filteredProjects.length === 0" class="empty-state">
          <p>Нет проектов в этой категории</p>
          <button class="btn-create-project" @click="showCreateDialog = true">
            + Создать первый проект
          </button>
        </div>

        <div v-else class="projects-grid">
          <div
            v-for="project in filteredProjects"
            :key="project.id"
            class="project-card"
          >
            <!-- Preview Image -->
            <div class="project-preview">
              <img
                v-if="getPreviewUrl(project.preview)"
                :src="getPreviewUrl(project.preview)"
                :alt="`Preview of ${project.name}`"
              />
              <div v-else class="preview-placeholder">
                <span>Нет превью</span>
              </div>
            </div>

            <!-- Project Info -->
            <div class="project-info">
              <h3 class="project-name">{{ project.name }}</h3>
              
              <div v-if="project.description" class="project-description">
                {{ project.description }}
              </div>

              <div class="project-meta">
                <span class="category-badge">{{ project.categoryName }}</span>
              </div>

              <div class="project-dates">
                <div class="date-item">
                  <span class="label">Создан:</span>
                  <span class="value">{{ formatDate(project.createdAt) }}</span>
                </div>
                <div class="date-item">
                  <span class="label">Изменён:</span>
                  <span class="value">{{ formatDate(project.updatedAt) }}</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="project-actions">
              <button
                class="btn-action btn-open"
                @click="handleOpenProject(project.id)"
                title="Открыть проект"
              >
                Открыть
              </button>
              <button
                class="btn-action btn-duplicate"
                @click="handleDuplicateProject(project.id)"
                title="Дублировать проект"
              >
                Копировать
              </button>
              <button
                class="btn-action btn-delete"
                @click="handleDeleteProject(project.id)"
                title="Удалить проект"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Create Project Dialog -->
    <div v-if="showCreateDialog" class="modal-overlay" @click.self="showCreateDialog = false">
      <div class="modal-dialog">
        <h2>Создать новый проект</h2>
        
        <div class="form-group">
          <label for="project-name">Название проекта:</label>
          <input
            id="project-name"
            v-model="newProjectName"
            type="text"
            placeholder="Введите название"
            @keyup.enter="handleCreateProject"
          />
        </div>

        <div class="form-group">
          <label for="project-description">Описание (необязательно):</label>
          <textarea
            id="project-description"
            v-model="newProjectDescription"
            placeholder="Введите описание"
            rows="3"
          ></textarea>
        </div>

        <div class="modal-actions">
          <button
            class="btn-cancel"
            @click="showCreateDialog = false"
            :disabled="isCreatingProject"
          >
            Отмена
          </button>
          <button
            class="btn-submit"
            @click="handleCreateProject"
            :disabled="isCreatingProject"
          >
            {{ isCreatingProject ? 'Создание...' : 'Создать' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.home-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

/* Header */
.app-header {
  background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
  border-bottom: 2px solid #4CAF50;
  padding: 0;
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
}

.app-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #4CAF50;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.header-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.btn-create-project,
.btn-logout {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-create-project {
  background: #4CAF50;
  color: white;
}

.btn-create-project:hover {
  background: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.btn-logout {
  background: #555;
  color: #e0e0e0;
}

.btn-logout:hover {
  background: #666;
}

/* Main Content */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 20px;
  padding: 20px;
}

/* Sidebar */
.categories-sidebar {
  width: 200px;
  background: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #444;
  height: fit-content;
  max-height: 100%;
  overflow-y: auto;
}

.categories-sidebar h2 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #4CAF50;
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item {
  padding: 10px 12px;
  background: #333;
  border: 2px solid transparent;
  border-radius: 6px;
  color: #b0b0b0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-size: 14px;
}

.category-item:hover {
  background: #3a3a3a;
  color: #e0e0e0;
}

.category-item.active {
  background: #4CAF50;
  color: white;
  border-color: #45a049;
}

/* Projects Section */
.projects-section {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.loading,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  flex-direction: column;
  gap: 20px;
  color: #888;
  font-size: 16px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

/* Project Card */
.project-card {
  background: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #444;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
  cursor: pointer;
}

.project-card:hover {
  border-color: #4CAF50;
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.15);
  transform: translateY(-4px);
}

.project-preview {
  width: 100%;
  height: 160px;
  background: #1a1a1a;
  overflow: hidden;
  position: relative;
}

.project-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
}

.project-info {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.project-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  word-break: break-word;
}

.project-description {
  font-size: 13px;
  color: #999;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-badge {
  display: inline-block;
  background: #4CAF50;
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.project-dates {
  font-size: 12px;
  color: #888;
  border-top: 1px solid #444;
  padding-top: 10px;
  margin-top: 10px;
}

.date-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.date-item .label {
  color: #666;
}

.date-item .value {
  color: #b0b0b0;
}

/* Project Actions */
.project-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #444;
  background: #1f1f1f;
}

.btn-action {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.btn-open {
  background: #4CAF50;
  color: white;
}

.btn-open:hover {
  background: #45a049;
}

.btn-duplicate {
  background: #2196F3;
  color: white;
}

.btn-duplicate:hover {
  background: #0b7dda;
}

.btn-delete {
  background: #f44336;
  color: white;
}

.btn-delete:hover {
  background: #da190b;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-dialog {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 30px;
  width: 90%;
  max-width: 500px;
  border: 1px solid #444;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-dialog h2 {
  margin: 0 0 20px 0;
  color: #4CAF50;
  font-size: 22px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #e0e0e0;
  font-weight: 500;
  font-size: 14px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #e0e0e0;
  font-family: inherit;
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
  background: #222;
}

.form-group textarea {
  resize: vertical;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 30px;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #444;
  color: #e0e0e0;
}

.btn-cancel:hover:not(:disabled) {
  background: #555;
}

.btn-submit {
  background: #4CAF50;
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background: #45a049;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Scrollbar styling */
.categories-sidebar::-webkit-scrollbar,
.projects-section::-webkit-scrollbar {
  width: 8px;
}

.categories-sidebar::-webkit-scrollbar-track,
.projects-section::-webkit-scrollbar-track {
  background: #1a1a1a;
  border-radius: 4px;
}

.categories-sidebar::-webkit-scrollbar-thumb,
.projects-section::-webkit-scrollbar-thumb {
  background: #4CAF50;
  border-radius: 4px;
}

.categories-sidebar::-webkit-scrollbar-thumb:hover,
.projects-section::-webkit-scrollbar-thumb:hover {
  background: #45a049;
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
    gap: 15px;
    padding: 15px;
  }

  .categories-sidebar {
    width: 100%;
    max-height: 150px;
  }

  .categories-list {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
  }

  .projects-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 15px;
  }

  .header-content {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
}
</style>
