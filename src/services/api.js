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
  createProject(name, description) {
    return api.post('/api/projects', {
      name: String(name || ''),
      description: String(description || '')
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },

  
  saveProject(id, projectData, preview) {
    return api.put(`/api/projects/${id}/save`, {
      projectData: String(projectData || '{}'),
      preview: preview || null
    }, {
      headers: {'Content-Type': 'application/json'}
    })
  },

  
  renameProject(projectId, name) {
    return api.put(`/api/projects/${projectId}/rename`, {
      name: String(name || '')
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },

  
  changeProjectCategory(projectId, categoryId) {
    return api.put(`/api/projects/${projectId}/category`, {
      categoryId: Number(categoryId)
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },

  
  duplicateProject(projectId) {
    return api.post(`/api/projects/${projectId}/duplicate`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },


  deleteProject(projectId) {
    return api.delete(`/api/projects/${projectId}`)
  },

  
  createCategory(name, description) {
    return api.post('/api/categories', {
      name: String(name || ''),
      description: String(description || '')
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export default api
