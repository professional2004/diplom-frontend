import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import Engine from '@/editor_core/engine/Engine'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    editorSettings: {},
  }),

  actions: {
    initProject(container2D, container3D) {
      const engine = new Engine(container2D, container3D)
    },

    disposeProject() {
      this.engine = null
    },


    // --- Методы управления 3D камерой ---
    zoomIn3D() {
      EngineRegistry.engine3D.cameraSystem3D.zoom(0.9)
    },
    zoomOut3D() {
      EngineRegistry.engine3D.cameraSystem3D.zoom(1.1)
    },
    resetView3D() {
      EngineRegistry.engine3D.cameraSystem3D.reset()
    },

    // --- Методы управления 2D камерой ---
    zoomIn2D() {
      EngineRegistry.engine2D.cameraSystem2D.zoom(1.1)
    },
    zoomOut2D() {
      EngineRegistry.engine2D.cameraSystem2D.zoom(0.9)
    },
    resetView2D() {
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

    async exportSVG() { 
      const engine2D = EngineRegistry.engine2D;
      if (!engine2D || !engine2D.sceneSystem2D) {
        console.log('проблема с engine2D или engine2D.sceneSystem2D')
        return null
      }
      return new UnfoldingsExporter(engine2D.sceneSystem2D).exportToSVG();
    },

    async exportPDF() {
      const engine2D = EngineRegistry.engine2D;
      if (!engine2D || !engine2D.sceneSystem2D) {
        console.log('проблема с engine2D или engine2D.sceneSystem2D')
        return null
      }
      return new UnfoldingsExporter(engine2D.sceneSystem2D).exportToPDF();
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