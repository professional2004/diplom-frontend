import * as THREE from 'three'
import { ShapeRegistry } from '@/core/3D_editor/shapes/ShapeRegistry'
import { UnfoldPart } from '@/core/2D_editor/entities/UnfoldPart'

export class SyncSystem2D {
  constructor(engine) {
    this.engine = engine
    this.trackedShapes = new Map() // Карта: uuid 3D-фигуры -> массив 2D-кусочков
    this.nextOffsetX = 0 // Смещение для размещения новых фигур без нахлеста
    this.lastHistoryIndex = -1 // Для отслеживания изменений истории
  }

  update(engine) {
    // Встроено в цикл рендера: проверяем, изменилась ли история в 3D-редакторе
    if (!engine.engine3D?.historySystem) return
    
    const currentHistoryIndex = engine.engine3D.historySystem.index
    if (currentHistoryIndex !== this.lastHistoryIndex) {
      this.lastHistoryIndex = currentHistoryIndex
      this.sync(engine.engine3D.sceneSystem.scene)
    }
  }

  sync(threeScene) {
    if (!threeScene) return
    const current3DUUIDs = new Set()

    // 1. Ищем новые 3D-фигуры и собираем список текущих UUID
    threeScene.traverse((obj) => {
      if (obj.isMesh && obj.userData.selectable && obj.userData.shapeType) {
        current3DUUIDs.add(obj.uuid)

        // Если развертки для этой 3D-фигуры еще нет в 2D, создаем её
        if (!this.trackedShapes.has(obj.uuid)) {
          this.createUnfoldForShape(obj)
        }
      }
    })

    // 2. Ищем удаленные 3D-фигуры (есть в памяти 2D, но пропали из 3D-сцены)
    for (const [uuid, parts] of this.trackedShapes.entries()) {
      if (!current3DUUIDs.has(uuid)) {
        parts.forEach(partMesh => {
          this.engine.sceneSystem.remove(partMesh)
          // Если удаленный кусочек был выделен, сбрасываем выделение
          if (this.engine.selectionSystem.selected === partMesh) {
            this.engine.selectionSystem.clear()
          }
        })
        this.trackedShapes.delete(uuid)
      }
    }
  }

  createUnfoldForShape(obj) {
    try {
      const shapeInstance = ShapeRegistry.create(obj.userData.shapeType, obj.userData.params)
      const unfoldGroup = shapeInstance.createUnfold2D()

      if (unfoldGroup.children.length === 0) return

      const bbox = new THREE.Box3()
      unfoldGroup.children.forEach(child => bbox.expandByObject(child))
      const width = bbox.max.x - bbox.min.x
      const center = bbox.getCenter(new THREE.Vector3())
      
      const gap = 5
      const parts = []

      // Копируем массив children, так как добавление в sceneSystem меняет исходный массив
      const children = [...unfoldGroup.children]
      
      children.forEach(child => {
        child.position.x -= center.x
        child.position.y -= center.y
        child.position.x += this.nextOffsetX + width / 2

        const part = new UnfoldPart(child, obj.uuid)
        this.engine.sceneSystem.add(part.mesh)
        parts.push(part.mesh)
      })

      // Запоминаем созданные кусочки
      this.trackedShapes.set(obj.uuid, parts)
      this.nextOffsetX += width + gap
    } catch (e) {
      console.warn('Failed to unfold shape:', obj.userData.shapeType, e)
    }
  }
}