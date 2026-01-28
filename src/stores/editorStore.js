import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { Engine } from '@/core/engine/Engine'
import { AddSurfaceCommand } from '@/core/commands/AddSurfaceCommand'
import { DeleteSurfaceCommand } from '@/core/commands/DeleteSurfaceCommand'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    engine: null,
    canUndo: false,
    canRedo: false,
    selectedSurface: null  // Реактивное состояние для выбранной поверхности
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
      window.addEventListener('deleteSelectedSurface', () => this.deleteSurface())
      window.addEventListener('undo', () => this.undo())
      window.addEventListener('redo', () => this.redo())
    },

    zoomIn() { this.engine?.cameraSystem.zoom(0.9) },
    zoomOut() { this.engine?.cameraSystem.zoom(1.1) },
    resetView() { this.engine?.cameraSystem.reset() },

    // УНИВЕРСАЛЬНЫЙ МЕТОД для добавления поверхности
    addSurface(type) {
      if (!this.engine) return
      
      // Параметры можно брать из UI, пока дефолтные внутри команд/поверхностей
      const cmd = new AddSurfaceCommand(this.engine.sceneSystem, type)
      
      this.engine.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    // Удаление выбранной поверхности
    deleteSurface() {
      if (!this.engine) return
      
      const selected = this.engine.selectionSystem.getSelected()
      if (!selected) return
      
      const cmd = new DeleteSurfaceCommand(
        this.engine.sceneSystem,
        this.engine.selectionSystem,
        selected,
        this  // Передаем store для обновления UI
      )
      
      this.engine.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    // Выбрать поверхность (обновляет реактивное состояние)
    selectSurface(mesh) {
      if (!this.engine) return
      this.selectedSurface = mesh
      this.engine.selectionSystem.setSelected(mesh)
    },

    // Получить текущую выбранную поверхность
    getSelectedSurface() {
      return this.selectedSurface
    },

    // Очистить выделение
    clearSelection() {
      if (!this.engine) return
      this.selectedSurface = null
      this.engine.selectionSystem.clear()
    },

    // Обновить выделение (вызывается из InputSystem)
    updateSelectedSurface(mesh) {
      this.selectedSurface = mesh
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
      window.removeEventListener('deleteSelectedSurface', () => this.deleteSurface())
      window.removeEventListener('undo', () => this.undo())
      window.removeEventListener('redo', () => this.redo())
      this.engine?.dispose()
      this.engine = null
    }
  }
})