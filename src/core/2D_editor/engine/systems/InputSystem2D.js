import * as THREE from 'three'
import { MoveUnfoldDetailCommand } from '@/core/2D_editor/commands/MoveUnfoldDetailCommand'
import { RotateUnfoldDetailCommand } from '@/core/2D_editor/commands/RotateUnfoldDetailCommand'

export class InputSystem2D {
  constructor(container) {
    this.container = container
    this.raycaster = new THREE.Raycaster()
    // Уменьшиваем толщину выделения для Line объектов
    this.raycaster.params.Line.threshold = 0.01
    
    this.mouse = new THREE.Vector2()
    this.prevMouse = new THREE.Vector2()
    this.mouseDown = new THREE.Vector2()
    
    // Плоскость перетаскивания совпадает с плоскостью Z=0
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0) 
    this.planeIntersectPoint = new THREE.Vector3()
    
    this.isDragging = false
    this.isRotating = false
    this.dragObject = null
    this.dragOffset = new THREE.Vector3()
    this.startPosition = new THREE.Vector3()
    this.startRotation = 0
    this.rotationCenter = new THREE.Vector3()

    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)

    container.addEventListener('pointerdown', this.onPointerDown)
    container.addEventListener('pointermove', this.onPointerMove)
    container.addEventListener('pointerup', this.onPointerUp)
  }

  setEngine(engine2D) { this.engine2D = engine2D }

  updateMouse(event) {
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  getIntersectedObject() {
    this.raycaster.setFromCamera(this.mouse, this.engine2D.cameraSystem2D.camera)
    const objects = this.engine2D.sceneSystem2D.unfoldObjects.children
    // Включаем рекурсивный поиск по дереву — нужно для корректной работы
    // с вложенными объектами (линии, группы, невидимые плоскости)
    const intersects = this.raycaster.intersectObjects(objects, true)

    // Ищем родительскую UnfoldDetail, помеченную как selectable
    // Если пересекаем невидимую плоскость, используем linkedMesh
    for (let hit of intersects) {
      let obj = hit.object
      
      // Если это невидимая плоскость, используем связанный mesh
      if (obj.userData.isSelectionPlane && obj.userData.linkedMesh) {
        obj = obj.userData.linkedMesh
      }
      
      // Проверяем, есть ли объект с флагом selectable
      while (obj && !obj.userData?.selectable) {
        obj = obj.parent
      }
      
      if (obj && obj.userData.selectable) {
        return obj
      }
    }
    return null
  }

  onPointerDown(event) {
    if (!this.engine2D) return
    this.updateMouse(event)
    this.mouseDown.copy(this.mouse)
    this.prevMouse.copy(this.mouse)
    
    const hitObject = this.getIntersectedObject()

    if (hitObject) {
      this.dragObject = hitObject
      this.engine2D.cameraSystem2D.controls.enabled = false
      this.engine2D.selectionSystem2D.setSelected(this.dragObject)

      if (event.shiftKey) {
        // Режим поворота (Shift + клик)
        this.isRotating = true
        this.startRotation = this.dragObject.rotation.z
        this.rotationCenter.copy(this.dragObject.position)
      } else {
        // Режим перемещения
        this.isDragging = true
        this.startPosition.copy(this.dragObject.position)

        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
          this.dragOffset.subVectors(this.dragObject.position, this.planeIntersectPoint)
        }
      }
    } else {
      this.engine2D.selectionSystem2D.clear()
    }
  }

  onPointerMove(event) {
    if (!this.engine2D) return
    this.updateMouse(event)

    if (this.isRotating && this.dragObject) {
      // Режим поворота: вычисляем угол по смещению мыши от начального положения
      const deltaX = this.mouse.x - this.mouseDown.x
      
      // Преобразуем горизонтальное смещение в радианы
      // 2 единицы нормализованных координат = Pi радиан (полный поворот)
      const rotationDelta = deltaX * Math.PI
      
      // Применяем поворот относительно начального угла
      this.dragObject.rotation.z = this.startRotation + rotationDelta
    } else if (this.isDragging && this.dragObject) {
      // Режим перемещения
      this.raycaster.setFromCamera(this.mouse, this.engine2D.cameraSystem2D.camera)
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
        const newPos = new THREE.Vector3().addVectors(this.planeIntersectPoint, this.dragOffset)
        this.dragObject.position.copy(newPos)
      }
    } else {
      // Нет перемещения или поворота, проверяем наведение
      const hitObject = this.getIntersectedObject()
      this.engine2D.selectionSystem2D.setHovered(hitObject || null)
    }
  }

  onPointerUp() {
    if (this.isRotating && this.dragObject) {
      if (this.dragObject.rotation.z !== this.startRotation) {
        const cmd = new RotateUnfoldDetailCommand(
          this.dragObject,
          this.dragObject.rotation.z,
          this.startRotation
        )
        this.engine2D.registry.executeCommand(cmd)
      }
      this.isRotating = false
      this.dragObject = null
    } else if (this.isDragging && this.dragObject) {
      if (!this.dragObject.position.equals(this.startPosition)) {
        const cmd = new MoveUnfoldDetailCommand(this.dragObject, this.dragObject.position, this.startPosition)
        this.engine2D.registry.executeCommand(cmd) 
      }
      this.isDragging = false
      this.dragObject = null
    }
    if (this.engine2D) this.engine2D.cameraSystem2D.controls.enabled = true
  }

  dispose() {
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
  }
}