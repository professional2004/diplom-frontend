import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { Engine3D } from '@/core/3D_editor/engine/Engine3D'
import { Engine2D } from '@/core/2D_editor/engine/Engine2D'
import { AddShapeCommand } from '@/core/3D_editor/commands/AddShapeCommand'
import { DeleteShapeCommand } from '@/core/3D_editor/commands/DeleteShapeCommand'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    engine3D: null,
    engine2D: null,
    canUndo: false,
    canRedo: false,
    selectedShape: null  // Реактивное состояние для выбранной фигуры
  }),

  actions: {
    init(container) {
      if (this.engine3D) return
      const engine3D = new Engine3D(container)
      this.engine3D = markRaw(engine3D)
      
      // Передаем store в InputSystem для реактивности UI
      this.engine3D.inputSystem3D.setStore(this)
      
      this.updateUndoRedo()

      // Слушаем события от InputSystem
      window.addEventListener('deleteSelectedShape', () => this.deleteShape())
      window.addEventListener('undo', () => this.undo())
      window.addEventListener('redo', () => this.redo())
      
      window.addEventListener('updateUndoRedo', () => this.updateUndoRedo())
    },

    
    // ----------- 3D команды -----------

    zoomIn() { this.engine3D?.cameraSystem3D.zoom(0.9) },
    zoomOut() { this.engine3D?.cameraSystem3D.zoom(1.1) },
    resetView() { this.engine3D?.cameraSystem3D.reset() },

    // УНИВЕРСАЛЬНЫЙ МЕТОД для добавления фигуры
    // Принимает необязательный объект params для параметрических моделей
    addShape(type, params = {}) {
      if (!this.engine3D) return
      // Параметры передаются в команду и далее в ShapeRegistry
      const cmd = new AddShapeCommand(this.engine3D.sceneSystem3D, type, params)
      
      this.engine3D.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    // Удаление выбранной фигуры
    deleteShape() {
      if (!this.engine3D) return
      
      const selected = this.engine3D.selectionSystem3D.getSelected()
      if (!selected) return
      
      const cmd = new DeleteShapeCommand(
        this.engine3D.sceneSystem3D,
        this.engine3D.selectionSystem3D,
        selected,
        this  // Передаем store для обновления UI
      )
      
      this.engine3D.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    // Выбрать фигуру (обновляет реактивное состояние)
    selectShape(mesh) {
      if (!this.engine3D) return
      this.selectedShape = mesh
      this.engine3D.selectionSystem3D.setSelected(mesh)
    },

    // Получить текущую выбранную фигуру
    getSelectedShape() {
      return this.selectedShape
    },

    // Очистить выделение
    clearSelection() {
      if (!this.engine3D) return
      this.selectedShape = null
      this.engine3D.selectionSystem3D.clear()
    },

    // Обновить выделение (вызывается из InputSystem)
    updateSelectedShape(mesh) {
      this.selectedShape = mesh
    },


    // ----------- 2D команды -----------

    setEngine2D(engine2D) {
      this.engine2D = engine2D
    },

    zoomIn2D() {
      if (!this.engine2D?.cameraSystem2D) return
      this.engine2D.cameraSystem2D.zoom(0.9)
    },

    zoomOut2D() {
      if (!this.engine2D?.cameraSystem2D) return
      this.engine2D.cameraSystem2D.zoom(1.1)
    },

    reset2D() {
      if (!this.engine2D?.cameraSystem2D) return
      this.engine2D.cameraSystem2D.reset()
    },


    // ----------- общие -----------

    undo() {
      if (!this.engine3D) return
      this.engine3D.historySystem?.undo()
      this.updateUndoRedo()
    },

    redo() {
      if (!this.engine3D) return
      this.engine3D.historySystem?.redo()
      this.updateUndoRedo()
    },

    updateUndoRedo() {
      const h = this.engine3D?.historySystem
      this.canUndo = !!(h && h.history && h.index >= 0)
      this.canRedo = !!(h && h.history && h.index < (h.history.length - 1))
    },

    dispose() {
      window.removeEventListener('deleteSelectedShape', () => this.deleteShape())
      window.removeEventListener('undo', () => this.undo())
      window.removeEventListener('redo', () => this.redo())
      this.engine3D?.dispose()
      this.engine3D = null
    }
  }
})