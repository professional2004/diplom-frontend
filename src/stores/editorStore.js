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

    serializeProject() {
      this.engine.serializeProject(this.engine.project)
    },

    deserializeProject(data) {
      this.engine.deserializeProject(data)
    },

    generateProjectPreview() {
      return this.engine.generateProjectPreview()
    }
  }
})