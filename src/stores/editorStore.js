import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { Engine } from '@/editor_core/engine/Engine'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    selectedThing: {}
  }),

  actions: {

    // ----------- функции с движком -----------

    createEngine(container2D, container3D) {
      const engine = new Engine(container2D, container3D)
      this.engine = markRaw(engine) 
    },

    disposeEngine() {
      this.engine?.dispose()
      this.engine = null
    },


    // ----------- функции с проектом -----------

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


    // ----------- функции внутри проекта -----------

    // функции с 2D и 3D сценой

    zoomIn3D() { this.engine.zoomIn3D() },
    zoomOut3D() { this.engine.zoomOut3D() },
    resetView3D() { this.engine.resetView3D() },
    zoomIn2D() { this.engine.zoomIn2D() },
    zoomOut2D() { this.engine.zoomOut2D() },
    resetView2D() { this.engine.resetView2D() },

    // функции с деталями

    addDetail(type) {
      this.engine.addDetail(type)
    }


  }
})