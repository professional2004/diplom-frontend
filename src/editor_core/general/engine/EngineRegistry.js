import { HistorySystem } from './systems/HistorySystem'
import { SyncSystem } from './systems/SyncSystem'
import { ShapeSystem } from './systems/ShapeSystem'
import { UnfoldSystem } from './systems/UnfoldSystem'
import { ConnectionSystem } from './systems/ConnectionSystem'
import { Engine3D } from '@/editor_core/3D_editor/engine/Engine3D'
import { Engine2D } from '@/editor_core/2D_editor/engine/Engine2D'
import { ShapeRegistry } from '@/editor_core/3D_editor/entities/ShapeRegistry'

class SimpleEmitter {
  constructor() { this._map = new Map() }
  on(event, cb) {
    if (!this._map.has(event)) this._map.set(event, new Set())
    this._map.get(event).add(cb)
    return () => this.off(event, cb)
  }
  off(event, cb) {
    const s = this._map.get(event)
    if (s) { s.delete(cb); if (s.size === 0) this._map.delete(event) }
  }
  emit(event, ...args) {
    const s = this._map.get(event)
    if (!s) return
    Array.from(s).forEach(cb => {
      try { cb(...args) } catch (e) { console.error('[Emitter]', e) }
    })
  }
}

class EngineRegistry {
  constructor() {
    this.engine2D = null
    this.engine3D = null
    
    // Глобальные системы инициализируются здесь
    this.historySystem = new HistorySystem()
    this.syncSystem = new SyncSystem()
    this.shapeSystem = new ShapeSystem(this)
    this.unfoldSystem = new UnfoldSystem()
    this.connectionSystem = new ConnectionSystem(this)
    
    this.emitter = new SimpleEmitter()
  }

  // Создание 3D движка (вызывается из Viewport)
  initEngine3D(container) {
    if (this.engine3D) return
    this.engine3D = new Engine3D(container, this)
    this._checkEnginesReady()
  }

  // Создание 2D движка (вызывается из Viewport)
  initEngine2D(container) {
    if (this.engine2D) return
    this.engine2D = new Engine2D(container, this)
    this._checkEnginesReady()
  }


  _checkEnginesReady() {
    if (this.engine2D && this.engine3D) {
      // Берем параметры сетки из 3D сцены и применяем к 2D
      const grid3D = this.engine3D.sceneSystem3D.grid
      this.engine2D.sceneSystem2D.matchGridFrom(grid3D)
      // Подключаем систему синхронизации объектов
      this.syncSystem.setEngines({ 
        engine2D: this.engine2D, 
        engine3D: this.engine3D 
      });
      this.emitter.emit('engines:ready');
    }
  }


  // Проброс событий для UI
  emitUIUpdate(eventName, payload) {
    this.emitter.emit(eventName, payload)
  }

  // Единый метод для выполнения команд
  executeCommand(command) {
    this.historySystem.execute(command)
    this.emitter.emit('history:changed')
    if (this.engine2D && this.engine3D) {
      if (command.is3DCommand) {
        this.syncSystem.rebuildAllFrom3D()
      }
    }
  }


  // Сериализация проекта в JSON
  serializeProject() {
    const data = {
      shapes: [],
      unfoldings: []
    }

    for (const [shapeId, entity] of this.shapeSystem.entities) {
      if (entity && entity.mesh) {
        data.shapes.push({
          id: shapeId,
          type: entity.mesh.userData.shapeType || 'unknown',
          params: { ...entity.mesh.userData.params }
        })
      }
    }

    for (const [unfoldId, entity] of this.unfoldSystem.entities) {
      if (entity && entity.mesh) {
        data.unfoldings.push({
          id: unfoldId,
          parentShapeId: entity.mesh.userData.parentShapeId,
          unfoldParams: { ...entity.mesh.userData.unfoldParams }
        })
      }
    }

    return JSON.stringify(data)
  }

  // Десериализация проекта из JSON
  deserializeProject(data) {

    this.clearProject()

    // распаковка shapes
    if (data.shapes && Array.isArray(data.shapes)) {
      for (const shapeData of data.shapes) {
        const shape = ShapeRegistry.create(shapeData.type, shapeData.params)
        const mesh = shape.createMesh()
        // обязательно назначаем uuid перед добавлением в сцену,
        // иначе SceneSystem3D.add зарегистрирует старый автосгенерированный id
        mesh.uuid = shapeData.id
        this.engine3D.sceneSystem3D.add(mesh)
        // явная регистрация остаётся допустимой, но
        // ShapeSystem теперь удаляет возможный «старый» ключ
        this.shapeSystem.register(mesh)
      }
    }

    // распаковка unfoldings
    if (data.unfoldings && Array.isArray(data.unfoldings)) {
      for (const unfoldData of data.unfoldings) {
        const unfold = this.unfoldSystem.getById(unfoldData.id)
        if (unfold) {
          unfold.mesh.userData.unfoldParams = {
            ...unfold.mesh.userData.unfoldParams,
            ...unfoldData.unfoldParams
          }
          unfold.applyStoredTransform()
        }
      }
    }

    this.syncSystem.rebuildAllFrom3D()
    return data
  }


  // Очистить проект (удаляет фигуры/развёртки из сцен и обнуляет системы)
  clearProject() {
    // удалить все 3D-объекты
    if (this.engine3D && this.engine3D.sceneSystem3D) {
      for (const ent of this.shapeSystem.entities.values()) {
        if (ent && ent.mesh) {
          try { this.engine3D.sceneSystem3D.remove(ent.mesh) } catch (e) { console.log(e) }
        }
      }
    }

    // удалить все 2D-развёртки
    if (this.engine2D && this.engine2D.sceneSystem2D) {
      for (const unfold of this.unfoldSystem.entities.values()) {
        if (unfold && unfold.mesh) {
          try { this.engine2D.sceneSystem2D.remove(unfold.mesh) } catch (e) { console.log(e) }
        }
      }
    }

    this.historySystem.clear()
    this.shapeSystem.entities.clear()
    this.unfoldSystem.clear()
  }


  dispose() {
    this.engine3D?.dispose()
    this.engine2D?.dispose()
    this.syncSystem?.dispose()
    this.engine3D = null
    this.engine2D = null
  }
}

const registry = new EngineRegistry()
export default registry