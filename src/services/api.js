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


  // Загрузка превью проекта
  async loadProjectPreview(id) {
    const response = await api.get(`/api/projects/${id}/preview`, {
      responseType: 'blob'
    })
    return URL.createObjectURL(response.data);
  },


  // Создать новый проект
  async createProject(name, description) {
    const response = await api.post('/api/projects', {
      name: String(name || ''),
      description: String(description || '')
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return response.data
  },

  
  async saveProject(id, projectData, preview) {
    const response = await api.put(`/api/projects/${id}/save`, {
      projectData: String(projectData || '{}'),
      preview: preview || null
    }, {
      headers: {'Content-Type': 'application/json'}
    })
    return response
  },

  
  async renameProject(projectId, name) {
    const response = await api.put(`/api/projects/${projectId}/rename`, {
      name: String(name || '')
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return response.data
  },

  
  async changeProjectCategory(projectId, categoryId) {
    const response = await api.put(`/api/projects/${projectId}/category`, {
      categoryId: Number(categoryId)
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return response.data
  },

  
  async changeProjectDescription(projectId, description) {
    const response = await api.put(`/api/projects/${projectId}/description`, {
      description: String(description || '')
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return response.data
  },

  
  async duplicateProject(projectId) {
    const response = await api.post(`/api/projects/${projectId}/duplicate`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return response.data
  },


  async deleteProject(projectId) {
    const response = await api.delete(`/api/projects/${projectId}`)
    return response.data
  },

  
  async createCategory(name) {
    const response = await api.post('/api/categories', {
      name: String(name || '')
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return response.data
  }
}

export default api
