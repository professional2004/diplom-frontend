import * as THREE from 'three'
import { ShapeRegistry } from '@/core/3D_editor/entities/ShapeRegistry'
import { UnfoldDetail } from '@/core/2D_editor/entities/UnfoldDetail'

export class SyncSystem {
  constructor() {
    this.engine2D = null
    this.engine3D = null
    this.trackedShapes = new Map() 
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


  dispose() {
    this._removeAllUnfolds()
    this.engine2D = null
    this.engine3D = null
  }
}