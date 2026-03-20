import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { Engine } from '@/editor_core/engine/Engine'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    editorSettings: {},
  }),

  actions: {
    createEngine(container2D, container3D) {
      const engine = new Engine(container2D, container3D)
      this.engine = markRaw(engine) 
    },

    disposeEngine() {
      this.engine?.dispose()
      this.engine = null
    },

    // Функции с проектом

    deserializeProject(projectData) {
      this.engine.deserializeProject(projectData)
    },

    serializeProject() {
      return this.engine.serializeProject()
    },
    

    generateProjectPreview() {
      return this.engine.generateProjectPreview()
    },




    clearProject() {
      this.engine.clearProject()
    },


    addDetail(type) {
      this.engine.addDetail(type)
    }
  }
})