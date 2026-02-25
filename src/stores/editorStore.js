import { defineStore } from 'pinia'
import EngineRegistry from '@/core/general/engine/EngineRegistry'
import { AddShapeCommand } from '@/core/3D_editor/commands/AddShapeCommand'
import { DeleteShapeCommand } from '@/core/3D_editor/commands/DeleteShapeCommand'
import { UpdateShapeCommand } from '@/core/3D_editor/commands/UpdateShapeCommand'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    canUndo: false,
    canRedo: false,
    selectedShape: null,
    selectedShapeParams: null
  }),

  actions: {

    // --- Методы управления 3D камерой ---
    zoomIn() {
      EngineRegistry.engine3D.cameraSystem3D.zoom(0.9)
    },
    zoomOut() {
      EngineRegistry.engine3D.cameraSystem3D.zoom(1.1)
    },
    resetView() {
      EngineRegistry.engine3D.cameraSystem3D.reset()
    },

    // --- Методы управления 2D камерой ---
    zoomIn2D() {
      EngineRegistry.engine2D.cameraSystem2D.zoom(0.9)
    },
    zoomOut2D() {
      EngineRegistry.engine2D.cameraSystem2D.zoom(1.1)
    },
    reset2D() {
      EngineRegistry.engine2D.cameraSystem2D.reset()
    },

    // Подписываемся на события ядра один раз
setupListeners() {
      EngineRegistry.emitter.on('selection:changed', (shape) => {
        this.selectedShape = shape
        // Обновляем параметры при клике на новую фигуру
        this.selectedShapeParams = shape ? { ...shape.userData.params } : null 
      })
      
      // Слушаем изменения после Undo/Redo или редактирования
      EngineRegistry.emitter.on('params:changed', (shape) => {
        if (this.selectedShape === shape) {
          this.selectedShapeParams = { ...shape.userData.params }
        }
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

    updateShapeParams(newParams) {
      const engine = EngineRegistry.engine3D
      if (!engine || !this.selectedShape) return
      
      const cmd = new UpdateShapeCommand(engine, this.selectedShape, newParams)
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