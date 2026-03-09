import { defineStore } from 'pinia'
import { projectsApi } from '@/services/api'

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [],
    categories: [],
    currentProject: null,
    isLoading: false
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
      try {
        const updatedProject = await projectsApi.updateProject(id, projectData)
        const index = this.projects.findIndex(p => p.id === id)
        if (index !== -1) {
          this.projects[index] = updatedProject
        }
        return updatedProject
      } catch (error) {
        console.error('Failed to update project:', error)
        throw error
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