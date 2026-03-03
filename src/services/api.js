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
    console.log('[->] api: getProjectsAndCategories()')
    return api.get('/api/projects')
  },

  // Create project
  createProject(name, description) {
    console.log('[->] api: createProject()')
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
    console.log('[->] api: getProject()')
    return api.get(`/api/projects/${projectId}`)
  },

  // Save project changes (with data and preview)
  saveProject(projectId, projectData, preview) {
    console.log('[->] api: saveProject()')
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
    console.log('[->] api: renameProject()')
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
    console.log('[->] api: changeProjectCategory()')
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
    console.log('[->] api: duplicateProject()')
    return api.post(`/api/projects/${projectId}/duplicate`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },

  // Delete project
  deleteProject(projectId) {
    console.log('[->] api: deleteProject()')
    return api.delete(`/api/projects/${projectId}`)
  }

  ,

  // Categories API
  // Create a new category (used to ensure default category exists)
  createCategory(name) {
    console.log('[->] api: createCategory()')
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

