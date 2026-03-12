import { defineStore } from 'pinia'
import EngineRegistry from '@/editor_core/general/engine/EngineRegistry'
import { AddShapeCommand } from '@/editor_core/3D_editor/commands/AddShapeCommand'
import { DeleteShapeCommand } from '@/editor_core/3D_editor/commands/DeleteShapeCommand'
import { UpdateShapeCommand } from '@/editor_core/3D_editor/commands/UpdateShapeCommand'
import { UnfoldingsExporter } from '@/editor_core/general/utils/UnfoldingsExporter'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    editorSettings: {},
    canUndo: false,
    canRedo: false,
    // храним только uuid выбранной фигуры; сам объект хранится в ShapeSystem
    selectedShapeId: null,
    selectedShapeParams: null
  }),
  getters: {
    selectedShape(state) {
      if (!state.selectedShapeId) return null
      return EngineRegistry.shapeSystem.getById(state.selectedShapeId)
    }
  },

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
      EngineRegistry.engine2D.cameraSystem2D.zoom(1.1)
    },
    zoomOut2D() {
      EngineRegistry.engine2D.cameraSystem2D.zoom(0.9)
    },
    reset2D() {
      EngineRegistry.engine2D.cameraSystem2D.reset()
    },

    // Подписываемся на события ядра один раз
    setupListeners() {
      EngineRegistry.emitter.on('selection:changed', (entity) => {
        this.selectedShapeId = entity ? entity.id : null
        // Обновляем параметры при клике на новую фигуру
        this.selectedShapeParams = entity && entity.mesh && entity.mesh.userData
          ? { ...entity.mesh.userData.params }
          : null 
      })
      
      // Слушаем изменения после Undo/Redo или редактирования
      EngineRegistry.emitter.on('params:changed', (payload) => {
        // payload может быть shape-entity или просто mesh (для обратной совместимости)
        let ent = null
        if (payload && payload.mesh) {
          ent = payload
        } else if (payload && payload.uuid) {
          ent = EngineRegistry.shapeSystem.getByMesh(payload)
        }
        if (ent && this.selectedShapeId && ent.id === this.selectedShapeId) {
          this.selectedShapeParams = { ...ent.mesh.userData.params }
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
      if (!engine || !this.selectedShapeId) return
      const cmd = new DeleteShapeCommand(
        engine.sceneSystem3D,
        engine.selectionSystem3D,
        this.selectedShape
      )
      EngineRegistry.executeCommand(cmd)

      // После удаления сбрасываем текущее выделение в сторе. Событие
      // 'selection:changed' не всегда пробрасывается внутри команды,
      // поэтому делаем это здесь вручную.
      this.selectedShapeId = null
      this.selectedShapeParams = null
    },

    updateShapeParams(newParams) {
      const engine = EngineRegistry.engine3D
      if (!engine || !this.selectedShapeId) return
      // передаем entity, чтобы команда могла взять mesh и owner из неё
      const cmd = new UpdateShapeCommand(engine, this.selectedShape, newParams)
      EngineRegistry.executeCommand(cmd)
      // selectedShapeParams обновится при событии params:changed
    },


    // экспорт лекал

    exportSVG() {
      const engine2D = EngineRegistry.engine2D;
      const unfoldingsExporter = new UnfoldingsExporter(engine2D.sceneSystem2D)
      unfoldingsExporter.exportToSVG();
    },

    exportPDF() {
      const engine2D = EngineRegistry.engine2D;
      const unfoldingsExporter = new UnfoldingsExporter(engine2D.sceneSystem2D)
      unfoldingsExporter.exportToPDF();
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