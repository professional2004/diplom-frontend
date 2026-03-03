import { defineStore } from 'pinia'
import { projectsApi } from '@/services/api'
import { useNotificationStore } from '@/stores/notificationsStore'

export const useProjectStore = defineStore('project', {
  state: () => ({
    projects: [],
    categories: [],
    currentProject: null,
    isLoading: false,
    isSaving: false
  }),

  getters: {
    projectsByCategory: (state) => (categoryId) => {
      console.log('[store] projectStore: projectsByCategory()')
      return state.projects.filter(p => p.categoryId === categoryId)
    },
    
    getCategoryName: (state) => (categoryId) => {
      console.log('[store] projectStore: getCategoryName()')
      const category = state.categories.find(c => c.id === categoryId)
      return category ? category.name : 'Без категории'
    }
  },

  actions: {
    async fetchProjectsAndCategories() {
      console.log('[store] projectStore: fetchProjectsAndCategories()')
      this.isLoading = true
      const notify = useNotificationStore()
      try {
        const { data } = await projectsApi.getProjectsAndCategories()
        this.categories = data.categories
        this.projects = data.projects
      } catch (error) {
        notify.show({
          type: 'error',
          message: 'Ошибка при загрузке проектов'
        })
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createProject(name, description = '') {
      console.log('[store] projectStore: createProject()')
      const notify = useNotificationStore()
      try {
        const { data } = await projectsApi.createProject(name, description)
        this.projects.push(data)
        notify.show({
          type: 'success',
          message: 'Проект создан успешно'
        })
        return data
      } catch (error) {
        // If backend reports missing default category, try to create it and retry once
        const errMsg = error.response?.data?.message || ''
        if (errMsg === 'Категория по умолчанию не найдена') {
          try {
            // Attempt to create default category on server
            await projectsApi.createCategory('Проект')
            // Refresh categories and retry project creation
            await this.fetchProjectsAndCategories()
            const { data: retryData } = await projectsApi.createProject(name, description)
            this.projects.push(retryData)
            notify.show({ type: 'success', message: 'Проект создан успешно' })
            return retryData
          } catch (retryError) {
            notify.show({ type: 'error', message: 'Ошибка при создании категории по умолчанию' })
            console.error('Retry create project error details:', retryError.response?.data || retryError.message)
            throw retryError
          }
        }

        notify.show({
          type: 'error',
          message: 'Ошибка при создании проекта'
        })
        // Log detailed error for debugging
        console.error('Create project error details:', error.response?.data || error.message)
        throw error
      }
    },

    async fetchProject(projectId) {
      console.log('[store] projectStore: fetchProject()')
      this.isLoading = true
      const notify = useNotificationStore()
      try {
        const { data } = await projectsApi.getProject(projectId)
        this.currentProject = data
        return data
      } catch (error) {
        notify.show({
          type: 'error',
          message: 'Ошибка при загрузке проекта'
        })
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async saveProject(projectId, projectData, preview) {
      console.log('[store] projectStore: saveProject()')
      this.isSaving = true
      const notify = useNotificationStore()
      try {
        const { data } = await projectsApi.saveProject(projectId, projectData, preview)
        
        // Update current project
        this.currentProject = data
        
        // Update in projects list
        const index = this.projects.findIndex(p => p.id === projectId)
        if (index !== -1) {
          this.projects[index] = {
            ...this.projects[index],
            updatedAt: data.updatedAt,
            preview: data.preview
          }
        }
        
        notify.show({
          type: 'success',
          message: 'Проект сохранён успешно'
        })
        return data
      } catch (error) {
        notify.show({
          type: 'error',
          message: 'Ошибка при сохранении проекта'
        })
        throw error
      } finally {
        this.isSaving = false
      }
    },

    async renameProject(projectId, name) {
      console.log('[store] projectStore: renameProject()')
      const notify = useNotificationStore()
      try {
        const { data } = await projectsApi.renameProject(projectId, name)
        
        // Update in projects list
        const index = this.projects.findIndex(p => p.id === projectId)
        if (index !== -1) {
          this.projects[index].name = data.name
        }
        
        // Update current project if it's the current one
        if (this.currentProject && this.currentProject.id === projectId) {
          this.currentProject.name = data.name
        }
        
        notify.show({
          type: 'success',
          message: 'Проект переименован'
        })
        return data
      } catch (error) {
        notify.show({
          type: 'error',
          message: 'Ошибка при переименовании проекта'
        })
        throw error
      }
    },

    async changeProjectCategory(projectId, categoryId) {
      console.log('[store] projectStore: changeProjectCategory()')
      const notify = useNotificationStore()
      try {
        const { data } = await projectsApi.changeProjectCategory(projectId, categoryId)
        
        // Update in projects list
        const index = this.projects.findIndex(p => p.id === projectId)
        if (index !== -1) {
          this.projects[index].categoryId = data.categoryId
          this.projects[index].categoryName = data.categoryName
        }
        
        // Update current project if it's the current one
        if (this.currentProject && this.currentProject.id === projectId) {
          this.currentProject.categoryId = data.categoryId
          this.currentProject.categoryName = data.categoryName
        }
        
        notify.show({
          type: 'success',
          message: 'Категория проекта изменена'
        })
        return data
      } catch (error) {
        notify.show({
          type: 'error',
          message: 'Ошибка при изменении категории'
        })
        throw error
      }
    },

    async duplicateProject(projectId) {
      console.log('[store] projectStore: duplicateProject()')
      const notify = useNotificationStore()
      try {
        const { data } = await projectsApi.duplicateProject(projectId)
        this.projects.push(data)
        notify.show({
          type: 'success',
          message: 'Проект дублирован успешно'
        })
        return data
      } catch (error) {
        notify.show({
          type: 'error',
          message: 'Ошибка при дублировании проекта'
        })
        throw error
      }
    },

    async deleteProject(projectId) {
      console.log('[store] projectStore: deleteProject()')
      const notify = useNotificationStore()
      try {
        await projectsApi.deleteProject(projectId)
        
        // Remove from projects list
        this.projects = this.projects.filter(p => p.id !== projectId)
        
        // Clear current project if it's deleted
        if (this.currentProject && this.currentProject.id === projectId) {
          this.currentProject = null
        }
        
        notify.show({
          type: 'success',
          message: 'Проект удален успешно'
        })
      } catch (error) {
        notify.show({
          type: 'error',
          message: 'Ошибка при удалении проекта'
        })
        throw error
      }
    },

    clearCurrentProject() {
      console.log('[store] projectStore: clearCurrentProject()')
      this.currentProject = null
    }
  }
})
