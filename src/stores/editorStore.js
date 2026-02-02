import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { Engine } from '@/core/engine/Engine'
import { AddSurfaceCommand } from '@/core/commands/AddSurfaceCommand'
import { DeleteSurfaceCommand } from '@/core/commands/DeleteSurfaceCommand'
import { SurfaceRegistry } from '@/core/surfaces/SurfaceRegistry'
import { SurfaceStrip } from '@/core/surfaces/SurfaceStrip'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    engine: null,
    canUndo: false,
    canRedo: false,
    selectedSurface: null,  // Реактивное состояние для выбранной поверхности
    selectedSurfaceBaseCurve: null,  // Кривая основания выбранной поверхности
    selectedStripContour: null  // Контур отреза для выбранного strip
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

    // УНИВЕРСАЛЬНЫЙ МЕТОД для добавления поверхности (как strip)
    addSurface(type) {
      if (!this.engine) return
      
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
        this
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
      this.selectedSurfaceBaseCurve = null
      this.selectedStripContour = null
      this.engine.selectionSystem.clear()
    },

    // Обновить выделение (вызывается из InputSystem)
    updateSelectedSurface(mesh) {
      this.selectedSurface = mesh
      this._updateSelectedSurfaceCurves()
    },

    /**
     * Получить базовую кривую выбранной поверхности
     */
    getSelectedSurfaceBaseCurve() {
      return this.selectedSurfaceBaseCurve
    },

    /**
     * Установить базовую кривую для выбранной поверхности
     */
    setSelectedSurfaceBaseCurve(curve) {
      if (!this.selectedSurface || !curve) return

      const strip = this._getStripInstance(this.selectedSurface)
      if (strip) {
        strip.setBaseCurve(curve)
        this._updateMeshFromStrip(strip)
        this.selectedSurfaceBaseCurve = curve.clone()
      }
    },

    /**
     * Получить контур отреза выбранной поверхности
     */
    getSelectedStripContour() {
      return this.selectedStripContour
    },

    /**
     * Установить новый контур отреза для выбранной поверхности
     */
    setSelectedStripContour(contour) {
      if (!this.selectedSurface || !contour) return

      const strip = this._getStripInstance(this.selectedSurface)
      if (strip) {
        strip.setStripContour(contour)
        this._updateMeshFromStrip(strip)
        this.selectedStripContour = contour.clone()
      }
    },

    /**
     * Получить границы развертки для выбранной поверхности
     */
    getSelectedStripUnfoldBounds() {
      if (!this.selectedSurface) return null
      const strip = this._getStripInstance(this.selectedSurface)
      return strip ? strip.getUnfoldBounds() : null
    },

    /**
     * Внутренний метод для обновления кривых при выборе поверхности
     */
    _updateSelectedSurfaceCurves() {
      if (!this.selectedSurface) {
        this.selectedSurfaceBaseCurve = null
        this.selectedStripContour = null
        return
      }

      try {
        const strip = this._getStripInstance(this.selectedSurface)
        if (strip) {
          // Получаем базовую кривую
          const baseCurve = strip.getBaseCurve()
          this.selectedSurfaceBaseCurve = baseCurve ? baseCurve.clone() : null
          
          // Получаем контур отреза
          const contour = strip.getStripContour()
          this.selectedStripContour = contour ? contour.clone() : null
        } else {
          this.selectedSurfaceBaseCurve = null
          this.selectedStripContour = null
        }
      } catch (e) {
        console.error('Failed to update selected surface curves:', e)
        this.selectedSurfaceBaseCurve = null
        this.selectedStripContour = null
      }
    },

    /**
     * Получить инстанс SurfaceStrip на основе mesh
     * @private
     */
    _getStripInstance(mesh) {
      if (!mesh || !mesh.userData.surfaceType) return null

      try {
        // Для strip типов используем stripData если есть
        if (mesh.userData.isStrip && mesh.userData.stripData) {
          return SurfaceStrip.fromJSON(mesh.userData.stripData)
        }
        // Иначе пытаемся создать через реестр
        return SurfaceRegistry.create(mesh.userData.surfaceType, mesh.userData.params)
      } catch (e) {
        console.error('Failed to create strip instance:', e)
        return null
      }
    },

    /**
     * Обновить mesh после изменения параметров strip
     * @private
     */
    _updateMeshFromStrip(strip) {
      if (!this.selectedSurface || !strip) return

      try {
        // Обновляем геометрию mesh
        const newMesh = strip.createMesh()
        const newGeometry = newMesh.geometry

        const oldGeometry = this.selectedSurface.geometry
        if (oldGeometry) oldGeometry.dispose()
        this.selectedSurface.geometry = newGeometry

        // Обновляем userData
        this.selectedSurface.userData.stripData = strip.toJSON()
      } catch (e) {
        console.error('Failed to update mesh from strip:', e)
      }
    },

    /**
     * Получить точные точки контура развертки
     */
    getSelectedStripOutlinePoints() {
      if (!this.selectedSurface) return null
      const strip = this._getStripInstance(this.selectedSurface)
      return strip ? strip.getUnfoldOutlinePoints() : null
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