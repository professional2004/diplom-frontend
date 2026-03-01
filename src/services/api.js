import axios from 'axios'

const api = axios.create({
  baseURL: 'https://localhost:8443',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Projects API

export const projectsApi = {
  // Get all projects and categories
  getProjectsAndCategories() {
    return api.get('/api/projects')
  },

  // Create project
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

  // Get project
  getProject(projectId) {
    return api.get(`/api/projects/${projectId}`)
  },

  // Save project changes (with data and preview)
  saveProject(projectId, projectData, preview) {
    return api.put(`/api/projects/${projectId}/save`, {
      projectData: String(projectData || '{}'),
      preview: preview || null
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },

  // Rename project
  renameProject(projectId, name) {
    return api.put(`/api/projects/${projectId}/rename`, {
      name: String(name || '')
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },

  // Change project category
  changeProjectCategory(projectId, categoryId) {
    return api.put(`/api/projects/${projectId}/category`, {
      categoryId: Number(categoryId)
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },

  // Duplicate project
  duplicateProject(projectId) {
    return api.post(`/api/projects/${projectId}/duplicate`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },

  // Delete project
  deleteProject(projectId) {
    return api.delete(`/api/projects/${projectId}`)
  }

  ,

  // Categories API
  // Create a new category (used to ensure default category exists)
  createCategory(name) {
    return api.post('/api/categories', {
      name: String(name || '')
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export default api

