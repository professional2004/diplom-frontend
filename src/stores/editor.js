import { defineStore } from 'pinia'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    isInitialized: false,
    gridVisible: true,
    cameraPosition: { x: 10, y: 10, z: 10 },
    rotationSpeed: 1.0,
    panSpeed: 1.0,
    zoomSpeed: 1.2
  }),
  actions: {
    setInitialized(val) {
      this.isInitialized = val
    }
  }
})
