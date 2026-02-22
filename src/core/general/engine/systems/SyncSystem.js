// src/core/systems/SyncSystem.js
import * as THREE from 'three'
import EngineRegistry from '@/core/general/engine/EngineRegistry'
import { ShapeRegistry } from '@/core/3D_editor/entities/ShapeRegistry'
import { UnfoldDetail } from '@/core/2D_editor/entities/UnfoldDetail'


/**
 * Общая система синхронизации 3D -> 2D
 * - Отслеживает изменения истории 3D-движка (historySystem.index), по изменению перестраивает 2D-развёртки
 * - Помещается в общие системы приложения (general systems)
 *
 * Примечание по дизайну: мы специально перестраиваем все развёртки при изменении истории,
 * чтобы не полагаться на хрупкие диффы (переименования, заменённые объекты и т.п.).
 */
export class SyncSystem {
  constructor({ engine2D = null, engine3D = null } = {}) {
    this.engine2D = engine2D
    this.engine3D = engine3D

    this.trackedShapes = new Map() // uuid3D -> [unfoldMesh,...]
    this.nextOffsetX = 0
    this.lastHistoryIndex = undefined

    // Если historySystem предоставляет колбэк-подписку, используем её для моментального реагирования.
    this._boundOnHistoryChange = this._onHistoryChange.bind(this)
    this._subscribedToHistory = false
    this._trySubscribeHistory()

    // Подписываемся на событие готовности обоих движков из EngineRegistry
    this._boundOnEnginesReady = this._onEnginesReady.bind(this)
    EngineRegistry.on('engines:ready', this._boundOnEnginesReady)
  }

  // Обработчик события когда оба движка готовы
  _onEnginesReady(engines) {
    this.setEngines(engines)
  }

  // Попытка подписаться (если isEventEmitter-like API существует)
  _trySubscribeHistory() {
    // Если уже подписаны - не подписываемся еще раз
    if (this._subscribedToHistory) return
    
    const hist = this.engine3D?.historySystem
    if (!hist) return
    // предполагаем: historySystem может иметь addListener / on / subscribe
    if (typeof hist.on === 'function') {
      hist.on('change', this._boundOnHistoryChange)
      this._subscribedToHistory = true
    } else if (typeof hist.addListener === 'function') {
      hist.addListener(this._boundOnHistoryChange)
      this._subscribedToHistory = true
    } else if (typeof hist.subscribe === 'function') {
      hist.subscribe(this._boundOnHistoryChange)
      this._subscribedToHistory = true
    }
    // иначе - будем использовать polling по индексу в update()
  }

  // Обработчик событий истории (если доступен)
  _onHistoryChange() {
    try {
      this.rebuildAllFrom3D()
    } catch (e) {
      console.warn('[SyncSystem] onHistoryChange failed', e)
    }
  }

  // Этот метод вызывается в главном цикле update всех систем (engine.loop)
  update() {
    // Бережные проверки — ничего не делаем, если движки не готовы
    if (!this.engine2D || !this.engine3D) return

    const hist = this.engine3D.historySystem
    if (!hist) return

    const idx = typeof hist.index !== 'undefined' ? hist.index : null

    // Если система не подписана на события, используем индекс как сигнал изменений
    if (!this._subscribedToHistory) {
      if (idx !== this.lastHistoryIndex) {
        this.lastHistoryIndex = idx
        this.rebuildAllFrom3D()
      }
      return
    }

    // Если была подписка — ничего не делаем в update; события будут обрабатывать изменения.
  }

  // Полная перестройка: очищаем все 2D-развёртки и создаём заново по текущей 3D-сцене
  rebuildAllFrom3D() {
    try {
      // Защита и правильное имя 3D сцены
      const threeScene = this.engine3D?.sceneSystem3D?.scene
      if (!threeScene) return
      // удаляем имеющиеся развёртки в 2D
      this._removeAllUnfolds()
      this.nextOffsetX = 0

      // Пробегаем 3D-сцену, находим меши, помеченные как selectable/shapeType
      const meshes = []
      threeScene.traverse((obj) => {
        if (obj.isMesh && obj.userData?.selectable && obj.userData?.shapeType) {
          meshes.push(obj)
        }
      })

      for (const mesh of meshes) {
        this._createUnfoldForShape(mesh)
      }
    } catch (e) {
      console.warn('[SyncSystem] rebuildAllFrom3D error', e)
    }
  }

  _removeAllUnfolds() {
    for (const [uuid, unfoldMeshes] of this.trackedShapes.entries()) {
      for (const m of unfoldMeshes) {
        try {
          this.engine2D.sceneSystem2D.remove(m)
        } catch (e) {
          // игнорируем
        }
        // если был выбран — очистим
        if (this.engine2D.selectionSystem2D?.selected === m) {
          this.engine2D.selectionSystem2D.clear()
        }
      }
    }
    this.trackedShapes.clear()
  }

  _createUnfoldForShape(obj3D) {
    try {
      // создаём экземпляр формы по реестру (как у вас сейчас)
      const shapeInstance = ShapeRegistry.create(obj3D.userData.shapeType, obj3D.userData.params)
      const unfoldGroup = shapeInstance.createUnfold2D()
      if (!unfoldGroup || !unfoldGroup.children || unfoldGroup.children.length === 0) return

      // Клонируем children — чтобы не перемещать исходные объекты и избежать побочных эффектов
      const clones = unfoldGroup.children.map(child => child.clone(true))

      // Вычисляем bbox по клонам
      const bbox = new THREE.Box3()
      clones.forEach(c => bbox.expandByObject(c))
      const width = bbox.max.x - bbox.min.x
      const center = bbox.getCenter(new THREE.Vector3())

      const gap = 5
      const unfoldMeshes = []

      // Позиционируем и добавляем в 2D-сцену
      clones.forEach(clone => {
        // нормализуем центр относительно центра развёртки
        clone.position.x -= center.x
        clone.position.y -= center.y

        // переносим на следующую свободную позицию
        clone.position.x += this.nextOffsetX + width / 2

        // завернём в UnfoldDetail (или используем вашу обёртку)
        const unfoldDetail = new UnfoldDetail(clone, obj3D.uuid)

        // Добавляем в 2D-сцену
        this.engine2D.sceneSystem2D.add(unfoldDetail.mesh)

        unfoldMeshes.push(unfoldDetail.mesh)
      })

      // Запоминаем
      this.trackedShapes.set(obj3D.uuid, unfoldMeshes)
      this.nextOffsetX += width + gap
    } catch (e) {
      console.warn('[SyncSystem] createUnfoldForShape failed for', obj3D.userData?.shapeType, e)
    }
  }


  setEngines({ engine2D, engine3D }) {
    this.engine2D = engine2D
    this.engine3D = engine3D
    // Попробуем подписаться на события истории с новным Engine3D
    this._trySubscribeHistory()
    // Затем выполняем начальную синхронизацию
    this.rebuildAllFrom3D && this.rebuildAllFrom3D()
  }

  dispose() {
    // Отписываемся от события engines:ready
    EngineRegistry.off('engines:ready', this._boundOnEnginesReady)
    
    // очистка
    this._removeAllUnfolds()
    if (this._subscribedToHistory && this.engine3D?.historySystem) {
      const hist = this.engine3D.historySystem
      if (typeof hist.off === 'function') hist.off('change', this._boundOnHistoryChange)
      else if (typeof hist.removeListener === 'function') hist.removeListener(this._boundOnHistoryChange)
      else if (typeof hist.unsubscribe === 'function') hist.unsubscribe(this._boundOnHistoryChange)
      this._subscribedToHistory = false
    }
    this.engine2D = null
    this.engine3D = null
  }
}