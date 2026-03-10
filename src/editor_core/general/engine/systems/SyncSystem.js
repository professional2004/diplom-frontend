import * as THREE from 'three'
import EngineRegistry from '@/editor_core/general/engine/EngineRegistry'
import { ShapeRegistry } from '@/editor_core/3D_editor/entities/ShapeRegistry'
import { UnfoldDetail } from '@/editor_core/2D_editor/entities/UnfoldDetail'

export class SyncSystem {
  constructor() {
    this.engine2D = null
    this.engine3D = null
    this.trackedShapes = new Map()  // uuid: [unfoldMeshes]
    this.unfoldParamsCache = new Map()  // uuid: [{posX, posY, rotation}, ...]
    this.nextOffsetX = 0
  }

  setEngines({ engine2D, engine3D }) {
    this.engine2D = engine2D
    this.engine3D = engine3D
    // Выполняем первичную синхронизацию, если сцена не пуста
    this.rebuildAllFrom3D()
  }


  // Полная перестройка: очищаем все 2D-развёртки и создаём заново по текущей 3D-сцене
  rebuildAllFrom3D() {
    if (!this.engine2D || !this.engine3D) return
    try {
      const threeScene = this.engine3D.sceneSystem3D.scene
      if (!threeScene) return
      
      this._removeAllUnfolds()
      this.nextOffsetX = 0

      // используем ShapeSystem, если он доступен; это быстрее и точнее
      let meshes = []
      if (EngineRegistry && EngineRegistry.shapeSystem) {
        meshes = Array.from(EngineRegistry.shapeSystem.entities.values())
          .map(ent => ent.mesh)
          .filter(m => m && m.userData?.selectable && m.userData?.shapeType)
      } else {
        threeScene.traverse((obj) => {
          if (obj.isMesh && obj.userData?.selectable && obj.userData?.shapeType) {
            meshes.push(obj)
          }
        })
      }

      for (const mesh of meshes) {
        this._createUnfoldForShape(mesh)
      }
    } catch (e) {
      console.warn('[SyncSystem] rebuildAllFrom3D error', e)
    }
  }

  _removeAllUnfolds() {
    // Сохраняем параметры разверток перед удалением
    for (const [uuid, unfoldMeshes] of this.trackedShapes.entries()) {
      const paramsArray = []
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
        
        // также убираем связанную «плоскость» (она не хранится в unfoldMeshes)
        if (m.userData?.selectionPlane) {
          try { this.engine2D.sceneSystem2D.remove(m.userData.selectionPlane) } catch (e) {}
        }

        // Сохраняем параметры в кэш
        if (m.userData?.unfoldParams) {
          paramsArray.push({ ...m.userData.unfoldParams })
        }
        
        // Удаляем из UnfoldSystem
        if (m.userData?.unfoldId) {
          EngineRegistry.unfoldSystem?.remove(m.userData.unfoldId)
        }
      }
      // Кэшируем параметры по UUID фигуры
      if (paramsArray.length > 0) {
        this.unfoldParamsCache.set(uuid, paramsArray)
      }
    }

    // Дополнительная страховка: удалим все оставшиеся плоскости на сцене
    try {
      this.engine2D.sceneSystem2D.unfoldObjects.traverse(obj => {
        if (obj.userData?.isSelectionPlane) {
          try { this.engine2D.sceneSystem2D.remove(obj) } catch (e) {}
        }
      })
    } catch (e) {
      // ignore
    }

    this.trackedShapes.clear()
  }



  _createUnfoldForShape(obj3D) {
    try {
      // создаём экземпляр формы по реестру
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

      // Восстанавливаем сохраненные параметры из кэша, если есть
      const cachedParams = this.unfoldParamsCache.get(obj3D.uuid) || []

      // Позиционируем и добавляем в 2D-сцену
      clones.forEach((clone, index) => {
        // нормализуем центр относительно центра развёртки
        clone.position.x -= center.x
        clone.position.y -= center.y

        // переносим на следующую свободную позицию
        clone.position.x += this.nextOffsetX + width / 2

        // завернём в UnfoldDetail (или используем вашу обёртку)
        const unfoldDetail = new UnfoldDetail(clone, obj3D.uuid)

        // Восстанавливаем сохраненные параметры позиции и ротации из кэша, если они есть
        if (cachedParams[index]) {
          clone.userData.unfoldParams = { ...cachedParams[index] }
          unfoldDetail.applyStoredTransform()
        }

        // Добавляем в 2D-сцену
        this.engine2D.sceneSystem2D.add(unfoldDetail.mesh)
        
        // Создаем и добавляем невидимую плоскость для лучшего выделения
        const selectionPlane = unfoldDetail.createInvisibleSelectionPlane()
        if (selectionPlane) {
          // сохраняем ссылку рядом с мешем для дальнейшей очистки
          unfoldDetail.mesh.userData.selectionPlane = selectionPlane
          this.engine2D.sceneSystem2D.add(selectionPlane)
        }
        
        // Регистрируем в UnfoldSystem
        EngineRegistry.unfoldSystem.add(unfoldDetail)

        unfoldMeshes.push(unfoldDetail.mesh)
      })

      // Запоминаем и очищаем кэш для этой фигуры
      this.trackedShapes.set(obj3D.uuid, unfoldMeshes)
      this.unfoldParamsCache.delete(obj3D.uuid)
      this.nextOffsetX += width + gap
    } catch (e) {
      console.warn('[SyncSystem] createUnfoldForShape failed for', obj3D.userData?.shapeType, e)
    }
  }


  dispose() {
    this._removeAllUnfolds()
    this.engine2D = null
    this.engine3D = null
  }
}