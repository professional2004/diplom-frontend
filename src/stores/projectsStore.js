import { defineStore } from 'pinia'
import { projectsApi } from '@/services/api'

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [],
    categories: [],
    currentProject: null,
    isLoading: false,
    isSaving: false
  }),

  actions: {
    async fetchProjectsAndCategories() {
      this.isLoading = true
      try {
        const data = await projectsApi.getProjectsAndCategories()
        this.projects = data.projects || []
        this.categories = data.categories || []
        for (let project of this.projects) {
          project.previewUrl = await projectsApi.loadProjectPreview(project.id);
        }
        console.log('this projects:', this.projects)
        console.log('this categories:', this.categories)
      } catch (error) {
        console.error('Failed to fetch projects:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async fetchProject(id) {
      this.isLoading = true
      try {
        const project = await projectsApi.getProject(id)
        this.currentProject = project
        console.log(project)
        return project
      } catch (error) {
        console.error('Failed to fetch project:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async loadProjectPreview(id) {
      try {
        const preview = await projectsApi.loadProjectPreview(id)
        return preview
      } catch (error) {
        console.error('Failed to load project preview:', error)
        throw error
      }
    },

    async createProject(name, description = '') {
      try {
        const newProject = await projectsApi.createProject(name, description)
        this.projects.push(newProject)
        return newProject
      } catch (error) {
        console.error('Failed to create project:', error)
        throw error
      }
    },

    async saveProject(id, projectData, preview) {
      this.isSaving = true
      try {
        const { data } = await projectsApi.saveProject(id, projectData, preview)
        this.currentProject = data
        
        const index = this.projects.findIndex(p => p.id === id)
        if (index !== -1) {
          this.projects[index] = {
            ...this.projects[index],
            updatedAt: data.updatedAt,
            preview: data.preview
          }
        }
        console.log(data)
        return data
      } catch (error) {
        throw error
      } finally {
        this.isSaving = false
      }
    },

    async renameProject(projectId, name) {
      try {
        const { data } = await projectsApi.renameProject(projectId, name)
        return data
      } catch (error) {
        throw error
      }
    },

    async changeProjectCategory(projectId, categoryId) {
      try {
        const { data } = await projectsApi.changeProjectCategory(projectId, categoryId)
        return data
      } catch (error) {
        throw error
      }
    },

    async changeProjectDescription(projectId, description) {
      try {
        const { data } = await projectsApi.changeProjectDescription(projectId, description)
        return data
      } catch (error) {
        throw error
      }
    },

    async duplicateProject(projectId) {
      try {
        const { data } = await projectsApi.duplicateProject(projectId)
        return data
      } catch (error) {
        throw error
      }
    },

    async deleteProject(projectId) {
      try {
        await projectsApi.deleteProject(projectId)
        this.projects = this.projects.filter(p => p.id !== projectId)
        if (this.currentProject && this.currentProject.id === projectId) {
          this.currentProject = null
        }
      } catch (error) {
        throw error
      }
    },

    async createCategory(categoryName) {
      try {
        const newCategory = await projectsApi.createCategory(categoryName)
        this.categories.push({categoryName})
        return newCategory
      } catch (error) {
        console.error('Failed to create category:', error)
        throw error
      }
    }
  }
})