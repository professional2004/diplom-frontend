// Небольшой EventEmitter и singleton EngineRegistry
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
    // копируем, чтобы безопасно вызывать при модификации слушателей
    Array.from(s).forEach(cb => {
      try { cb(...args) } catch (e) { console.error('[Emitter] handler error', e) }
    })
  }
}

class EngineRegistry {
  constructor() {
    this.engine2D = null
    this.engine3D = null
    this.systems = new Set() // общие системы (SyncSystem, HistorySystem и т.д.)
    this.emitter = new SimpleEmitter()
  }

  // ---------- Engine getters ----------
  getEngine2D() { return this.engine2D }
  getEngine3D() { return this.engine3D }

  // ---------- Engine registration ----------
  registerEngine2D(engine2D) {
    this.engine2D = engine2D
    this.emitter.emit('engine2D:registered', engine2D)
    // после регистрации пробуем "прокинуть" обе движки в системы
    this._notifySystemsIfReady()
  }

  registerEngine3D(engine3D) {
    this.engine3D = engine3D
    this.emitter.emit('engine3D:registered', engine3D)
    this._notifySystemsIfReady()
  }

  // ---------- Systems management ----------
  addSystem(system) {
    // system — объект с опциональными методами:
    // - setEngines({engine2D, engine3D})
    // - init() / start()
    // - dispose()
    this.systems.add(system)
    // если у системы есть setEngines и двигатели уже есть - вызовем сразу
    if (typeof system.setEngines === 'function') {
      system.setEngines({ engine2D: this.engine2D, engine3D: this.engine3D })
    }
    if (typeof system.init === 'function') {
      try { system.init() } catch (e) { console.warn('[EngineRegistry] system.init failed', e) }
    }
    return () => this.removeSystem(system)
  }

  removeSystem(system) {
    if (this.systems.has(system)) {
      this.systems.delete(system)
      if (typeof system.dispose === 'function') {
        try { system.dispose() } catch (e) { console.warn('[EngineRegistry] system.dispose failed', e) }
      }
    }
  }

  // уведомляем все системы о доступности движков
  _notifySystemsIfReady() {
    for (const system of this.systems) {
      if (typeof system.setEngines === 'function') {
        try {
          system.setEngines({ engine2D: this.engine2D, engine3D: this.engine3D })
        } catch (e) {
          console.warn('[EngineRegistry] setEngines failed for system', e)
        }
      }
    }
    // эмитим событие что оба движка теперь доступны (если оба есть)
    if (this.engine2D && this.engine3D) {
      this.emitter.emit('engines:ready', { engine2D: this.engine2D, engine3D: this.engine3D })
    }
  }

  // подписка на события реестра
  on(event, cb) { return this.emitter.on(event, cb) }
  off(event, cb) { return this.emitter.off(event, cb) }

  // очистка реестра
  dispose() {
    for (const s of Array.from(this.systems)) {
      this.removeSystem(s)
    }
    this.engine2D = null
    this.engine3D = null
    this.emitter = new SimpleEmitter()
  }
}

// Экспортируем singleton
const registry = new EngineRegistry()
export default registry