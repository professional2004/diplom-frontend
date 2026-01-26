import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { Engine } from '@/core/engine/Engine'
import { AddCubeCommand } from '@/core/commands/AddCubeCommand'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    engine: null
  }),

  actions: {
    init(container) {
      if (this.engine) return
      const engine = new Engine(container)
      this.engine = markRaw(engine)
      // Подписать обновление кнопок undo/redo — простая полл-обёртка:
      // (HistorySystem здесь не предоставляет событие; можно расширить при необходимости)
      this.updateUndoRedo()
    },

    // Camera API
    zoomIn() { this.engine?.cameraSystem.zoom(0.9) },
    zoomOut() { this.engine?.cameraSystem.zoom(1.1) },
    resetView() { this.engine?.cameraSystem.reset() },

    addCube() {
      if (!this.engine) return
      const cmd = new AddCubeCommand(this.engine.sceneSystem)
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
      this.canRedo = !!(h && h.index < (h.history?.length - 1))
    },

    dispose() {
      if (this.engine) {
        this.engine.dispose()
        this.engine = null
      }
    }
  }
})
