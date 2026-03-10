import * as THREE from 'three'

export class UnfoldDetail {
  constructor(meshGroup, parentShapeId) {
    this.mesh = meshGroup
    this.selectionPlane = null  // Будет установлена createInvisibleSelectionPlane()
    
    // Помечаем объект для InputSystem и SelectionSystem
    this.mesh.userData.isUnfoldPart = true
    this.mesh.userData.selectable = true
    this.mesh.userData.parentShapeId = parentShapeId

    // Инициализируем параметры позиции и ротации для 2D развертки
    if (!this.mesh.userData.unfoldParams) {
      this.mesh.userData.unfoldParams = {
        posX: 0,
        posY: 0,
        rotation: 0
      }
    }

    // Сохраняем исходные цвета линий для SelectionSystem
    this.mesh.traverse(child => {
      if (child.isLine && child.material) {
        // Клонируем материал, чтобы изменение цвета не влияло на все развертки сразу
        child.material = child.material.clone()
        child.userData.originalColor = child.material.color.getHex()
      }
    })
  }

  // Применяет сохраненные параметры позиции и ротации к меше
  applyStoredTransform() {
    if (this.mesh.userData.unfoldParams) {
      const params = this.mesh.userData.unfoldParams
      this.mesh.position.set(params.posX ?? 0, params.posY ?? 0, 0)
      this.mesh.rotation.z = params.rotation ?? 0
    }
  }

  // Создает невидимую плоскость для улучшения выделения и перетаскивания
  createInvisibleSelectionPlane() {
    if (this.selectionPlane) return this.selectionPlane  // Уже создана

    // Вычисляем ограничивающий прямоугольник меша
    const bbox = new THREE.Box3().setFromObject(this.mesh)
    if (bbox.isEmpty()) return null

    const size = bbox.getSize(new THREE.Vector3())
    const center = bbox.getCenter(new THREE.Vector3())

    // Добавляем небольшой margin для удобства выделения
    const marginFactor = 0.1
    const planeSizeX = Math.max(size.x * (1 + marginFactor), 1)
    const planeSizeY = Math.max(size.y * (1 + marginFactor), 1)

    // Создаем невидимый mesh на основе PlaneGeometry
    const geometry = new THREE.PlaneGeometry(planeSizeX, planeSizeY)
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    })

    const plane = new THREE.Mesh(geometry, material)
    
    // Позиционируем плоскость в центре развертки
    plane.position.copy(center)
    plane.position.z = 0.1 // Чуть выше линий для приоритета выделения
    plane.rotation.z = this.mesh.rotation.z

    // Помечаем плоскость как невидимую часть развертки
    plane.userData.isUnfoldPart = true
    plane.userData.isSelectionPlane = true
    plane.userData.selectable = true
    plane.userData.parentShapeId = this.mesh.userData.parentShapeId
    plane.userData.linkedMesh = this.mesh

    // Сохраняем ссылку на плоскость
    this.selectionPlane = plane
    // записываем также на сам меш для удобства удаления
    if (this.mesh) {
      this.mesh.userData.selectionPlane = plane
    }
    return plane
  }
}