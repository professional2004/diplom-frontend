import { defineStore } from 'pinia'
import EngineRegistry from '@/core/general/engine/EngineRegistry'
import { AddShapeCommand } from '@/core/3D_editor/commands/AddShapeCommand'
import { DeleteShapeCommand } from '@/core/3D_editor/commands/DeleteShapeCommand'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    canUndo: false,
    canRedo: false,
    selectedShape: null
  }),

  actions: {
    // Подписываемся на события ядра один раз
    setupListeners() {
      EngineRegistry.emitter.on('selection:changed', (shape) => {
        this.selectedShape = shape
      })
      EngineRegistry.emitter.on('history:changed', () => {
        this.updateUndoRedo()
      })
      EngineRegistry.emitter.on('ui:deleteSelected', () => {
        this.deleteShape()
      })
    },

    init3D(container) {
      EngineRegistry.initEngine3D(container)
      this.setupListeners()
    },

    init2D(container) {
      EngineRegistry.initEngine2D(container)
    },

    addShape(type, params = {}) {
      const engine = EngineRegistry.engine3D
      if (!engine) return
      const cmd = new AddShapeCommand(engine.sceneSystem3D, type, params)
      EngineRegistry.executeCommand(cmd)
    },

    deleteShape() {
      const engine = EngineRegistry.engine3D
      if (!engine || !this.selectedShape) return
      const cmd = new DeleteShapeCommand(engine.sceneSystem3D, engine.selectionSystem3D, this.selectedShape)
      EngineRegistry.executeCommand(cmd)
    },

    undo() {
      EngineRegistry.historySystem.undo()
      EngineRegistry.emitter.emit('history:changed')
      EngineRegistry.syncSystem.rebuildAllFrom3D()
    },

    redo() {
      EngineRegistry.historySystem.redo()
      EngineRegistry.emitter.emit('history:changed')
      EngineRegistry.syncSystem.rebuildAllFrom3D()
    },

    updateUndoRedo() {
      const h = EngineRegistry.historySystem
      this.canUndo = !!(h && h.history && h.index >= 0)
      this.canRedo = !!(h && h.history && h.index < (h.history.length - 1))
    }
  }
})