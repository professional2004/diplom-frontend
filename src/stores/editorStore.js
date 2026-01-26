import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { Engine } from '@/core/engine/Engine'
import { AddShapeCommand } from '@/core/commands/AddShapeCommand'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    engine: null,
    canUndo: false,
    canRedo: false
  }),

  actions: {
    init(container) {
      if (this.engine) return
      const engine = new Engine(container)
      this.engine = markRaw(engine)
      this.updateUndoRedo()
    },

    zoomIn() { this.engine?.cameraSystem.zoom(0.9) },
    zoomOut() { this.engine?.cameraSystem.zoom(1.1) },
    resetView() { this.engine?.cameraSystem.reset() },

    // УНИВЕРСАЛЬНЫЙ МЕТОД
    addShape(type) {
      if (!this.engine) return
      
      // Параметры можно брать из UI, пока дефолтные внутри команд/фигур
      const cmd = new AddShapeCommand(this.engine.sceneSystem, type)
      
      this.engine.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    undo() {
      if (!this.engine) return
      this.engine.historySystem.undo()
      this.updateUndoRedo()
    },

    redo() {
      if (!this.engine) return
      this.engine.historySystem.redo()
      this.updateUndoRedo()
    },

    updateUndoRedo() {
      const h = this.engine?.historySystem
      this.canUndo = !!(h && h.index >= 0)
      this.canRedo = !!(h && h.history && h.index < (h.history.length - 1))
    },

    dispose() {
      this.engine?.dispose()
      this.engine = null
    }
  }
})