import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { Engine } from '@/editor_core/engine/Engine'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    is_unsaved: false,
    // 3D-сцена
    scene3DState: {
      pointeredThing: null,
      selectedThing: null
    },
    scene3DSettings: {
      selectingMode: 'detail'
    },
    // 2D-сцена
    scene2DState: {
      pointeredThing: null,
      selectedThing: null
    },
    // мини-сцена
    sceneMiniState: {
      pointeredThing: null,
      selectedThing: null
    },
    details: []
  }),

  actions: {
    // ----------- геттеры -----------
    getIsUnsaved() { return this.is_unsaved },
    getScene3DState() { return this.scene3DState },
    getScene3DSettings() { return this.scene3DSettings },
    getScene2DState() { return this.scene2DState },
    getSceneMiniState() { return this.sceneMiniState },
    getDetails() { return this.details },
    // ----------- сеттеры -----------
    setIsUnsaved(is_unsaved) { this.is_unsaved = is_unsaved },
    setScene3DState(scene3DState) { this.scene3DState = scene3DState },
    setScene3DSettings(scene3DSettings) { this.scene3DSettings = scene3DSettings },
    setScene2DState(scene2DState) { this.scene2DState = scene2DState },
    setSceneMiniState(sceneMiniState) { this.sceneMiniState = sceneMiniState },
    setDetails(details) { this.details = details },

    

    // ----------- функции с движком -----------

    createEngine(container2D, container3D, containerMini) {
      const engine = new Engine(this, container2D, container3D, containerMini)
      this.engine = markRaw(engine) 
    },

    disposeEngine() {
      this.engine?.dispose()
      this.engine = null
    },


    // ----------- функции с проектом -----------

    deserializeProject(project) {
      this.engine.deserializeProject(project)
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

    exportProjectUnfoldingsSVG() {
      this.engine.exportProjectUnfoldingsSVG()
    },

    exportProjectUnfoldingsPDF() {
      this.engine.exportProjectUnfoldingsPDF()
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