import * as THREE from 'three'
import { Move2DCommand } from '@/core/2D_editor/commands/MoveUnfoldDetailCommand'

export class InputSystem2D {
  constructor(container) {
    this.container = container
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    // Плоскость перетаскивания совпадает с плоскостью Z=0
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0) 
    this.planeIntersectPoint = new THREE.Vector3()
    
    this.isDragging = false
    this.dragObject = null
    this.dragOffset = new THREE.Vector3()
    this.startPosition = new THREE.Vector3()

    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)

    container.addEventListener('pointerdown', this.onPointerDown)
    container.addEventListener('pointermove', this.onPointerMove)
    container.addEventListener('pointerup', this.onPointerUp)
  }

  setEngine(engine) { this.engine = engine }

  updateMouse(event) {
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  getIntersectedObject() {
    this.raycaster.setFromCamera(this.mouse, this.engine.cameraSystem.camera)
    const objects = this.engine.sceneSystem.unfoldObjects.children
    const intersects = this.raycaster.intersectObjects(objects, true)
    
    // Ищем родительскую группу-кусок (UnfoldPart), помеченную как selectable
    for (let hit of intersects) {
      let obj = hit.object
      while (obj && !obj.userData.selectable) obj = obj.parent
      if (obj) return obj
    }
    return null
  }

  onPointerDown(event) {
    if (!this.engine) return
    this.updateMouse(event)
    const hitObject = this.getIntersectedObject()

    if (hitObject) {
      this.dragObject = hitObject
      this.isDragging = true
      this.startPosition.copy(this.dragObject.position)
      this.engine.cameraSystem.controls.enabled = false
      this.engine.selectionSystem.setSelected(this.dragObject)

      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
        this.dragOffset.subVectors(this.dragObject.position, this.planeIntersectPoint)
      }
    } else {
      this.engine.selectionSystem.clear()
    }
  }

  onPointerMove(event) {
    if (!this.engine) return
    this.updateMouse(event)

    if (this.isDragging && this.dragObject) {
      this.raycaster.setFromCamera(this.mouse, this.engine.cameraSystem.camera)
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
        const newPos = new THREE.Vector3().addVectors(this.planeIntersectPoint, this.dragOffset)
        this.dragObject.position.copy(newPos)
      }
    } else {
      const hitObject = this.getIntersectedObject()
      this.engine.selectionSystem.setHovered(hitObject || null)
    }
  }

  onPointerUp() {
    if (this.isDragging && this.dragObject) {
      if (!this.dragObject.position.equals(this.startPosition)) {
        const cmd = new Move2DCommand(this.dragObject, this.dragObject.position, this.startPosition)
        // Записываем команду в общую HistorySystem, если она передана в движок
        if (this.engine.historySystem) {
          this.engine.historySystem.execute(cmd)
          window.dispatchEvent(new Event('updateUndoRedo')) // Сигнал для UI
        }
      }
      this.isDragging = false
      this.dragObject = null
    }
    if (this.engine) this.engine.cameraSystem.controls.enabled = true
  }

  dispose() {
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
  }
}