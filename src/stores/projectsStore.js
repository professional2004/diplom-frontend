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

    async renameProject(projectId, name) {
      const notify = useNotificationStore()
      try {
        const { data } = await projectsApi.renameProject(projectId, name)
        // const index = this.projects.findIndex(p => p.id === projectId)
        // if (index !== -1) {
        //   this.projects[index].name = data.name
        // }
        // if (this.currentProject && this.currentProject.id === projectId) {
        //   this.currentProject.name = data.name
        // }
        notify.show({type: 'success', message: 'Проект переименован'})
        return data
      } catch (error) {
        notify.show({type: 'error', message: 'Ошибка при переименовании проекта'})
        throw error
      }
    },

    async changeProjectCategory(projectId, categoryId) {
      const notify = useNotificationStore()
      try {
        const { data } = await projectsApi.changeProjectCategory(projectId, categoryId)
        const index = this.projects.findIndex(p => p.id === projectId)
        if (index !== -1) {
          this.projects[index].categoryId = data.categoryId
          this.projects[index].categoryName = data.categoryName
        }
        if (this.currentProject && this.currentProject.id === projectId) {
          this.currentProject.categoryId = data.categoryId
          this.currentProject.categoryName = data.categoryName
        }
        notify.show({type: 'success', message: 'Категория проекта изменена'})
        return data
      } catch (error) {
        notify.show({type: 'error', message: 'Ошибка при изменении категории'})
        throw error
      }
    },

    async duplicateProject(projectId) {
      const notify = useNotificationStore()
      try {
        const { data } = await projectsApi.duplicateProject(projectId)
        this.projects.push(data)
        notify.show({type: 'success', message: 'Проект дублирован успешно'})
        return data
      } catch (error) {
        notify.show({type: 'error', message: 'Ошибка при дублировании проекта'})
        throw error
      }
    },

    async updateProject(id, projectData) {
      // generic update endpoint
      try {
        const updated = await projectsApi.updateProject(id, projectData)
        // update local cache
        const index = this.projects.findIndex(p => p.id === id)
        if (index !== -1) {
          this.projects[index] = { ...this.projects[index], ...updated }
        }
        if (this.currentProject && this.currentProject.id === id) {
          this.currentProject = updated
        }
        return updated
      } catch (error) {
        console.error('Failed to update project:', error)
        throw error
      }
    },


    async deleteProject(projectId) {
      const notify = useNotificationStore()
      try {
        await projectsApi.deleteProject(projectId)
        this.projects = this.projects.filter(p => p.id !== projectId)
        if (this.currentProject && this.currentProject.id === projectId) {
          this.currentProject = null
        }
        notify.show({type: 'success', message: 'Проект удален успешно'})
      } catch (error) {
        notify.show({type: 'error', message: 'Ошибка при удалении проекта'})
        throw error
      }
    },

    async createCategory(categoryData) {
      try {
        const newCategory = await projectsApi.createCategory(categoryData.name, categoryData.description)
        this.categories.push(newCategory)
        return newCategory
      } catch (error) {
        console.error('Failed to create category:', error)
        throw error
      }
    }
  }
})