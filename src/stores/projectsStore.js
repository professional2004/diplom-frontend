import { defineStore } from 'pinia'
import { projectsApi } from '@/services/api'
import { useNotificationStore } from '@/stores/notificationsStore'

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

    async createProject(projectData) {
      try {
        const newProject = await projectsApi.createProject(projectData)
        this.projects.push(newProject)
        return newProject
      } catch (error) {
        console.error('Failed to create project:', error)
        throw error
      }
    },

    async updateProject(id, projectData) {
      // generic update endpoint without preview
      try {
        const updated = await projectsApi.updateProject(id, projectData)
        // update local cache
        const index = this.projects.findIndex(p => p.id === id)
        if (index !== -1) {
          this.projects[index] = { ...this.projects[index], ...updated }
        }
        return updated
      } catch (error) {
        console.error('Failed to update project:', error)
        throw error
      }
    },

    async saveProject(id, projectData, preview = null) {
      // legacy with preview support
      this.isSaving = true
      const notify = useNotificationStore()
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
        
        notify.show({type: 'success', message: 'Проект сохранён успешно'})
        return data
      } catch (error) {
        notify.show({type: 'error',message: 'Ошибка при сохранении проекта'})
        throw error
      } finally {
        this.isSaving = false
      }
    },

    async deleteProject(id) {
      try {
        await projectsApi.deleteProject(id)
        this.projects = this.projects.filter(p => p.id !== id)
      } catch (error) {
        console.error('Failed to delete project:', error)
        throw error
      }
    }
  }
})