import { HistorySystem } from './systems/HistorySystem'
import { SyncSystem } from './systems/SyncSystem'
import { ShapeSystem } from './systems/ShapeSystem'
import { UnfoldSystem } from './systems/UnfoldSystem'
import { ConnectionSystem } from './systems/ConnectionSystem'
import { Engine3D } from '@/editor_core/3D_editor/engine/Engine3D'
import { Engine2D } from '@/editor_core/2D_editor/engine/Engine2D'

class SimpleEmitter {
  constructor() { 
    console.log('[->] EngineRegistry (SimpleEmitter): constructor')
    this._map = new Map() 
  }
  on(event, cb) {
    console.log('[->] EngineRegistry (SimpleEmitter): on()')
    if (!this._map.has(event)) this._map.set(event, new Set())
    this._map.get(event).add(cb)
    return () => this.off(event, cb)
  }
  off(event, cb) {
    console.log('[->] EngineRegistry (SimpleEmitter): off()')
    const s = this._map.get(event)
    if (s) { s.delete(cb); if (s.size === 0) this._map.delete(event) }
  }
  emit(event, ...args) {
    console.log('[->] EngineRegistry (SimpleEmitter): emit()')
    const s = this._map.get(event)
    if (!s) return
    Array.from(s).forEach(cb => {
      try { cb(...args) } catch (e) { console.error('[Emitter]', e) }
    })
  }
}

class EngineRegistry {
  constructor() {
    console.log('[->] EngineRegistry: constructor')
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
    console.log('[->] EngineRegistry: initEngine3D()')
    if (this.engine3D) return
    this.engine3D = new Engine3D(container, this)
    this._checkEnginesReady()
  }

  // Создание 2D движка (вызывается из Viewport)
  initEngine2D(container) {
    console.log('[->] EngineRegistry: initEngine2D()')
    if (this.engine2D) return
    this.engine2D = new Engine2D(container, this)
    this._checkEnginesReady()
  }


  _checkEnginesReady() {
    console.log('[->] EngineRegistry: _checkEnginesReady()')
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
    console.log('[->] EngineRegistry: emitUIUpdate()')
    this.emitter.emit(eventName, payload)
  }

  // Единый метод для выполнения команд
  executeCommand(command) {
    console.log('[->] EngineRegistry: executeCommand()')
    this.historySystem.execute(command)
    this.emitter.emit('history:changed')
    if (this.engine2D && this.engine3D) {
      if (command.is3DCommand) {
        this.syncSystem.rebuildAllFrom3D()
      }
    }
  }


  dispose() {
    console.log('[->] EngineRegistry: dispose()')
    this.engine3D?.dispose()
    this.engine2D?.dispose()
    this.syncSystem?.dispose()
    this.engine3D = null
    this.engine2D = null
  }
}

const registry = new EngineRegistry()
export default registry