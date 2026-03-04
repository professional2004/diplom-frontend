import { defineStore } from 'pinia'
import { markRaw } from 'vue';
import EngineRegistry, { setGlobalEngineRegistry } from '@/editor_core/general/engine/EngineRegistry'
import { AddShapeCommand } from '@/editor_core/3D_editor/commands/AddShapeCommand'
import { DeleteShapeCommand } from '@/editor_core/3D_editor/commands/DeleteShapeCommand'
import { UpdateShapeCommand } from '@/editor_core/3D_editor/commands/UpdateShapeCommand'
import { projectSerializationService } from '@/services/projectSerializationService'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    engineRegistry: null,
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
      return this.engineRegistry.shapeSystem.getById(state.selectedShapeId)
    },
    // Проверка, является ли выбранная фигура потомком в связи
    isShapeChild(state) {
      console.log('[store] editorStore: isShapeChild()')
      if (!state.selectedShapeId) return false
      return state.connections.some(c => c.childId === state.selectedShapeId)
    }
  },

  actions: {
    initEngineRegistry() {
      if (this.engineRegistry != null) return; // Защита от двойной инициализации
      // Создаем инстанс и отключаем реактивность Vue, чтобы Three.js не тормозил!
      const registry = new EngineRegistry();
      this.engineRegistry = markRaw(registry);
      // Сделаем экземпляр доступным для модулей, ожидающих глобальный реестр
      try { setGlobalEngineRegistry(this.engineRegistry) } catch (e) { console.warn('[editorStore] setGlobalEngineRegistry failed', e) }
    },

    disposeEngineRegistry() {
      if (this.engineRegistry) {
        this.engineRegistry.dispose(); // Обязательный метод для очистки WebGL
        try { setGlobalEngineRegistry(null) } catch (e) { /* ignore */ }
        this.engineRegistry = null;
      }
      // также стираем ссылку на canvas
      this.currentCanvas = null
    },

    // --- Методы управления 3D камерой ---
    zoomIn() {
      console.log('[store] editorStore: zoomIn()')
      this.engineRegistry.engine3D.cameraSystem3D.zoom(0.9)
    },
    zoomOut() {
      console.log('[store] editorStore: zoomOut()')
      this.engineRegistry.engine3D.cameraSystem3D.zoom(1.1)
    },
    resetView() {
      console.log('[store] editorStore: resetView()')
      this.engineRegistry.engine3D.cameraSystem3D.reset()
    },

    // --- Методы управления 2D камерой ---
    zoomIn2D() {
      console.log('[store] editorStore: zoomIn2D()')
      this.engineRegistry.engine2D.cameraSystem2D.zoom(1.1)
    },
    zoomOut2D() {
      console.log('[store] editorStore: zoomOut2D()')
      this.engineRegistry.engine2D.cameraSystem2D.zoom(0.9)
    },
    reset2D() {
      console.log('[store] editorStore: reset2D()')
      this.engineRegistry.engine2D.cameraSystem2D.reset()
    },

    // Подписываемся на события ядра один раз
    setupListeners() {
      console.log('[store] editorStore: setupListeners()')
      this.engineRegistry.emitter.on('selection:changed', (entity) => {
        this.selectedShapeId = entity ? entity.id : null
        // Обновляем параметры при клике на новую фигуру
        this.selectedShapeParams = entity && entity.mesh && entity.mesh.userData
          ? { ...entity.mesh.userData.params }
          : null 
      })
      
      // Слушаем изменения после Undo/Redo или редактирования
      this.engineRegistry.emitter.on('params:changed', (payload) => {
        // payload может быть shape-entity или просто mesh (для обратной совместимости)
        let ent = null
        if (payload && payload.mesh) {
          ent = payload
        } else if (payload && payload.uuid) {
          ent = this.engineRegistry.shapeSystem.getByMesh(payload)
        }
        if (ent && this.selectedShapeId && ent.id === this.selectedShapeId) {
          this.selectedShapeParams = { ...ent.mesh.userData.params }
        }
      })
      
      this.engineRegistry.emitter.on('history:changed', () => {
        this.updateUndoRedo()
      })
      this.engineRegistry.emitter.on('ui:deleteSelected', () => {
        this.deleteShape()
      })

      // Слушаем изменения связей из ядра
      this.engineRegistry.emitter.on('connections:changed', (connections) => {
        this.connections = connections || []
      })
    },

    // Метод переключения режима связывания
    toggleConnectMode() {
      console.log('[store] editorStore: toggleConnectMode()')
      this.isConnectingMode = !this.isConnectingMode
      // Оповещаем InputSystem3D, что мы перешли в режим выбора ребер
      this.engineRegistry.emitter.emit('mode:connecting', this.isConnectingMode)
    },

    init3D(container) {
      console.log('[store] editorStore: init3D()')
      if (this.engineRegistry.engine3D) {
        console.log ('[store] editorStore: init3D() --- already initialized')
        // ensure canvas is still attached if container changed
        this.engineRegistry.initEngine3D(container)
        return
      }
      this.engineRegistry.initEngine3D(container)
      this.setupListeners()
      // save canvas reference for preview or export
      try {
        const canvas = this.engineRegistry.engine3D?.renderSystem3D?.domElement || null
        if (canvas) this.setCurrentCanvas(canvas)
      } catch (e) {
        console.warn('[store] editorStore: failed to set current canvas for preview', e)
      }
    },

    init2D(container) {
      console.log('[store] editorStore: init2D()')
      if (this.engineRegistry.engine2D) {
        console.log ('[store] editorStore: init2D() --- already initialized')
        return
      }
      this.engineRegistry.initEngine2D(container)
    },

    addShape(type, params = {}) {
      console.log('[store] editorStore: addShape()')
      const engine = this.engineRegistry.engine3D
      if (!engine) return
      const cmd = new AddShapeCommand(engine.sceneSystem3D, type, params)
      this.engineRegistry.executeCommand(cmd)
    },

    deleteShape() {
      console.log('[store] editorStore: deleteShape()')
      const engine = this.engineRegistry.engine3D
      if (!engine || !this.selectedShapeId) return
      const cmd = new DeleteShapeCommand(
        engine.sceneSystem3D,
        engine.selectionSystem3D,
        this.selectedShape
      )
      this.engineRegistry.executeCommand(cmd)

      // После удаления сбрасываем текущее выделение в сторе. Событие
      // 'selection:changed' не всегда пробрасывается внутри команды,
      // поэтому делаем это здесь вручную.
      this.selectedShapeId = null
      this.selectedShapeParams = null
    },

    updateShapeParams(newParams) {
      console.log('[store] editorStore: updateShapeParams()')
      const engine = this.engineRegistry.engine3D
      if (!engine || !this.selectedShapeId) return
      // передаем entity, чтобы команда могла взять mesh и owner из неё
      const cmd = new UpdateShapeCommand(engine, this.selectedShape, newParams)
      this.engineRegistry.executeCommand(cmd)
      // selectedShapeParams обновится при событии params:changed
    },

    undo() {
      console.log('[store] editorStore: undo()')
      this.engineRegistry.historySystem.undo()
      this.engineRegistry.emitter.emit('history:changed')
      this.engineRegistry.syncSystem.rebuildAllFrom3D()
    },

    redo() {
      console.log('[store] editorStore: redo()')
      this.engineRegistry.historySystem.redo()
      this.engineRegistry.emitter.emit('history:changed')
      this.engineRegistry.syncSystem.rebuildAllFrom3D()
    },

    updateUndoRedo() {
      console.log('[store] editorStore: updateUndoRedo()')
      const h = this.engineRegistry.historySystem
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
      if (this.engineRegistry.shapeSystem) this.engineRegistry.shapeSystem.entities.clear()
      if (this.engineRegistry.unfoldSystem) this.engineRegistry.unfoldSystem.clear()
      if (this.engineRegistry.historySystem) this.engineRegistry.historySystem.clear()
      if (this.engineRegistry.connectionSystem) this.engineRegistry.connectionSystem.connections = []
      
      // Если есть 3D сцена - удаляем с нее все пользовательские меши
      if (this.engineRegistry.engine3D && this.engineRegistry.engine3D.sceneSystem3D) {
        // Вызываем кастомный метод очистки, или если его нет:
        // EngineRegistry.engine3D.sceneSystem3D.scene.clear() 
        // (убедись что не удаляешь базовый свет/сетку, в зависимости от твоей реализации core)
      }
    }
  }
})
