import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { Engine } from '@/core/engine/Engine'
import { AddShapeCommand } from '@/core/commands/AddShapeCommand'
import { DeleteShapeCommand } from '@/core/commands/DeleteShapeCommand'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    engine: null,
    canUndo: false,
    canRedo: false,
    selectedShape: null  // Реактивное состояние для выбранной фигуры
  }),

  actions: {
    init(container) {
      if (this.engine) return
      const engine = new Engine(container)
      this.engine = markRaw(engine)
      
      // Передаем store в InputSystem для реактивности UI
      this.engine.inputSystem.setStore(this)
      
      this.updateUndoRedo()
      
      // Слушаем события от InputSystem
      window.addEventListener('deleteSelectedShape', () => this.deleteShape())
      window.addEventListener('undo', () => this.undo())
      window.addEventListener('redo', () => this.redo())
    },

    zoomIn() { this.engine?.cameraSystem.zoom(0.9) },
    zoomOut() { this.engine?.cameraSystem.zoom(1.1) },
    resetView() { this.engine?.cameraSystem.reset() },

    // УНИВЕРСАЛЬНЫЙ МЕТОД для добавления фигуры
    addShape(type) {
      if (!this.engine) return
      
      // Параметры можно брать из UI, пока дефолтные внутри команд/фигур
      const cmd = new AddShapeCommand(this.engine.sceneSystem, type)
      
      this.engine.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    // Удаление выбранной фигуры
    deleteShape() {
      if (!this.engine) return
      
      const selected = this.engine.selectionSystem.getSelected()
      if (!selected) return
      
      const cmd = new DeleteShapeCommand(
        this.engine.sceneSystem,
        this.engine.selectionSystem,
        selected,
        this  // Передаем store для обновления UI
      )
      
      this.engine.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    // Выбрать фигуру (обновляет реактивное состояние)
    selectShape(mesh) {
      if (!this.engine) return
      this.selectedShape = mesh
      this.engine.selectionSystem.setSelected(mesh)
    },

    // Получить текущую выбранную фигуру
    getSelectedShape() {
      return this.selectedShape
    },

    // Очистить выделение
    clearSelection() {
      if (!this.engine) return
      this.selectedShape = null
      this.engine.selectionSystem.clear()
    },

    // Обновить выделение (вызывается из InputSystem)
    updateSelectedShape(mesh) {
      this.selectedShape = mesh
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
      this.canUndo = !!(h && h.history && h.index >= 0)
      this.canRedo = !!(h && h.history && h.index < (h.history.length - 1))
    },

    dispose() {
      window.removeEventListener('deleteSelectedShape', () => this.deleteShape())
      window.removeEventListener('undo', () => this.undo())
      window.removeEventListener('redo', () => this.redo())
      this.engine?.dispose()
      this.engine = null
    }
  }
})