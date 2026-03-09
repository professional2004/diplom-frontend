import axios from 'axios'

const api = axios.create({
  baseURL: 'https://localhost:8443',
  withCredentials: true
})

// API для проектов
export const projectsApi = {
  // Получить проекты и категории пользователя
  async getProjectsAndCategories() {
    const response = await api.get('/api/projects')
    return response.data
  },

  // Получить проект по ID
  async getProject(id) {
    const response = await api.get(`/api/projects/${id}`)
    return response.data
  },

  // Создать новый проект
  async createProject(projectData) {
    const response = await api.post('/api/projects', projectData)
    return response.data
  },

  // Обновить/сохранить проект (общий endpoint)
  async updateProject(id, projectData) {
    const response = await api.put(`/api/projects/${id}`, projectData)
    return response.data
  },

  // альтернативный вариант (с поддержкой preview)
  saveProject(id, projectData, preview) {
    return api.put(`/api/projects/${id}/save`, {
      projectData: String(projectData || '{}'),
      preview: preview || null
    }, {
      headers: {'Content-Type': 'application/json'}
    })
  },

  // Удалить проект
  async deleteProject(id) {
    const response = await api.delete(`/api/projects/${id}`)
    return response.data
  }
}

export default api
