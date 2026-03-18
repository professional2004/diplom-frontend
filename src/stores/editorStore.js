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
      this.sceneManager.dispose?.()
      this.engine = null
    },

    serializeProject() {

    },

    deserializeProject(data) {
      
    },

    generateProjectPreview() {

    }
  }
})