import { defineStore } from 'pinia'
import EngineRegistry from '@/editor_core/general/engine/EngineRegistry'
import { AddShapeCommand } from '@/editor_core/3D_editor/commands/AddShapeCommand'
import { DeleteShapeCommand } from '@/editor_core/3D_editor/commands/DeleteShapeCommand'
import { UpdateShapeCommand } from '@/editor_core/3D_editor/commands/UpdateShapeCommand'
import { projectSerializationService } from '@/services/projectSerializationService'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    canUndo: false,
    canRedo: false,
    // храним только uuid выбранной фигуры; сам объект хранится в ShapeSystem
    selectedShapeId: null,
    selectedShapeParams: null,
    // Состояния для системы связей
    isConnectingMode: false,
    connections: [],
    // Project state
    currentCanvas: null
  }),
  getters: {
    selectedShape(state) {
      console.log('[store] editorStore: selectedShape()')
      if (!state.selectedShapeId) return null
      return EngineRegistry.shapeSystem.getById(state.selectedShapeId)
    },
    // Проверка, является ли выбранная фигура потомком в связи
    isShapeChild(state) {
      console.log('[store] editorStore: isShapeChild()')
      if (!state.selectedShapeId) return false
      return state.connections.some(c => c.childId === state.selectedShapeId)
    }
  },

  actions: {

    // --- Методы управления 3D камерой ---
    zoomIn() {
      console.log('[store] editorStore: zoomIn()')
      EngineRegistry.engine3D.cameraSystem3D.zoom(0.9)
    },
    zoomOut() {
      console.log('[store] editorStore: zoomOut()')
      EngineRegistry.engine3D.cameraSystem3D.zoom(1.1)
    },
    resetView() {
      console.log('[store] editorStore: resetView()')
      EngineRegistry.engine3D.cameraSystem3D.reset()
    },

    // --- Методы управления 2D камерой ---
    zoomIn2D() {
      console.log('[store] editorStore: zoomIn2D()')
      EngineRegistry.engine2D.cameraSystem2D.zoom(1.1)
    },
    zoomOut2D() {
      console.log('[store] editorStore: zoomOut2D()')
      EngineRegistry.engine2D.cameraSystem2D.zoom(0.9)
    },
    reset2D() {
      console.log('[store] editorStore: reset2D()')
      EngineRegistry.engine2D.cameraSystem2D.reset()
    },

    // Подписываемся на события ядра один раз
    setupListeners() {
      console.log('[store] editorStore: setupListeners()')
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

      // Слушаем изменения связей из ядра
      EngineRegistry.emitter.on('connections:changed', (connections) => {
        this.connections = connections || []
      })
    },

    // Метод переключения режима связывания
    toggleConnectMode() {
      console.log('[store] editorStore: toggleConnectMode()')
      this.isConnectingMode = !this.isConnectingMode
      // Оповещаем InputSystem3D, что мы перешли в режим выбора ребер
      EngineRegistry.emitter.emit('mode:connecting', this.isConnectingMode)
    },

    init3D(container) {
      console.log('[store] editorStore: init3D()')
      EngineRegistry.initEngine3D(container)
      this.setupListeners()
    },

    init2D(container) {
      console.log('[store] editorStore: init2D()')
      EngineRegistry.initEngine2D(container)
    },

    addShape(type, params = {}) {
      console.log('[store] editorStore: addShape()')
      const engine = EngineRegistry.engine3D
      if (!engine) return
      const cmd = new AddShapeCommand(engine.sceneSystem3D, type, params)
      EngineRegistry.executeCommand(cmd)
    },

    deleteShape() {
      console.log('[store] editorStore: deleteShape()')
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
      console.log('[store] editorStore: updateShapeParams()')
      const engine = EngineRegistry.engine3D
      if (!engine || !this.selectedShapeId) return
      // передаем entity, чтобы команда могла взять mesh и owner из неё
      const cmd = new UpdateShapeCommand(engine, this.selectedShape, newParams)
      EngineRegistry.executeCommand(cmd)
      // selectedShapeParams обновится при событии params:changed
    },

    undo() {
      console.log('[store] editorStore: undo()')
      EngineRegistry.historySystem.undo()
      EngineRegistry.emitter.emit('history:changed')
      EngineRegistry.syncSystem.rebuildAllFrom3D()
    },

    redo() {
      console.log('[store] editorStore: redo()')
      EngineRegistry.historySystem.redo()
      EngineRegistry.emitter.emit('history:changed')
      EngineRegistry.syncSystem.rebuildAllFrom3D()
    },

    updateUndoRedo() {
      console.log('[store] editorStore: updateUndoRedo()')
      const h = EngineRegistry.historySystem
      this.canUndo = !!(h && h.history && h.index >= 0)
      this.canRedo = !!(h && h.history && h.index < (h.history.length - 1))
    },

    setCurrentCanvas(canvas) {
      console.log('[store] editorStore: setCurrentCanvas()')
      this.currentCanvas = canvas
    },

    async saveProjectToJSON() {
      console.log('[store] editorStore: saveProjectToJSON()')
      return projectSerializationService.serializeProject()
    },

    async loadProjectFromJSON(jsonString) {
      console.log('[store] editorStore: loadProjectFromJSON()')
      return projectSerializationService.deserializeProject(jsonString)
    },

    async generatePreview() {
      console.log('[store] editorStore: generatePreview()')
      if (!this.currentCanvas) {
        return null
      }
      return projectSerializationService.generatePreview(this.currentCanvas)
    },

    clearCurrentProject() {
      console.log('[store] editorStore: clearCurrentProject()')
      this.selectedShapeId = null
      this.selectedShapeParams = null
      this.isConnectingMode = false
      this.connections = []
      this.currentCanvas = null
      
      // Очищаем системы от предыдущего проекта
      if (EngineRegistry.shapeSystem) EngineRegistry.shapeSystem.entities.clear()
      if (EngineRegistry.unfoldSystem) EngineRegistry.unfoldSystem.clear()
      if (EngineRegistry.historySystem) EngineRegistry.historySystem.clear()
      if (EngineRegistry.connectionSystem) EngineRegistry.connectionSystem.connections = []
      
      // Если есть 3D сцена - удаляем с нее все пользовательские меши
      if (EngineRegistry.engine3D && EngineRegistry.engine3D.sceneSystem3D) {
        // Вызываем кастомный метод очистки, или если его нет:
        // EngineRegistry.engine3D.sceneSystem3D.scene.clear() 
        // (убедись что не удаляешь базовый свет/сетку, в зависимости от твоей реализации core)
      }
    }
  }
})
