import * as THREE from 'three'

export class InteractionSystemMini2D {
  constructor(container) {
    this.store = null
    this.engine = null
    this.container = container
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.pointeredThing = null
    this.selectedThing = null
    // вспомогательные временные переменные
    this.pointeredAtPointerDownThing = null
    this.draggingPointIndex = null
    this.isDraggingPoint = false

    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)
    this.onDoubleClick = this.onDoubleClick.bind(this)

    container.addEventListener('pointerdown', this.onPointerDown)
    container.addEventListener('pointermove', this.onPointerMove)
    container.addEventListener('pointerup', this.onPointerUp)
    container.addEventListener('dblclick', this.onDoubleClick)
  }

  setEngine(engine, store) { 
    this.engine = engine 
    this.store = store
  }


  // Вспомогательный метод обновления координат мыши
  updateMouse(event) {
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  getIntersectedObject() {
    this.raycaster.setFromCamera(this.mouse, this.engine.cameraSystemMini2D.getCamera())
    const objects = this.engine.sceneSystemMini2D.getObjects()
    const intersects = this.raycaster.intersectObjects(objects).filter(hit => hit.object.userData?.selectable)

    if (intersects.length > 0) {
      const hit = intersects[0]
      const id = hit.object.userData?.id
      const classType = hit.object.userData?.class || 'none'
      return { id, class: classType }
    } else {
      return null
    }
  }

  getWorldPointFromMouse() {
    this.raycaster.setFromCamera(this.mouse, this.engine.cameraSystemMini2D.getCamera())
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const point = new THREE.Vector3()
    this.raycaster.ray.intersectPlane(plane, point)
    return point
  }

  onPointerDown(event) {
    this.updateMouse(event)
    this.pointeredThing = this.getIntersectedObject()
    this.pointeredAtPointerDownThing = this.pointeredThing
    this.selectedThing = this.pointeredThing

    if (this.pointeredThing?.class === 'mini-control-point') {
      this.draggingPointIndex = this.pointeredThing.id
      this.isDraggingPoint = false
      this.engine.cameraSystemMini2D.disableControls()
    } else {
      this.draggingPointIndex = null
      this.isDraggingPoint = false
      this.engine.cameraSystemMini2D.enableControls()
    }

    this.updateStore()
  }

  onPointerMove(event) {
    if (this.draggingPointIndex !== null) {
      this.updateMouse(event)
      const worldPos = this.getWorldPointFromMouse()
      if (worldPos && this.engine?.onMiniPointDragged) {
        this.engine.onMiniPointDragged(this.draggingPointIndex, { x: worldPos.x, y: worldPos.y })
      }
      this.isDraggingPoint = true
      return
    }
    this.updateMouse(event)
    this.pointeredThing = this.getIntersectedObject()
    this.updateStore()
  }

  onPointerUp(event) {
    this.updateMouse(event)
    const currentThing = this.getIntersectedObject()

    if (this.draggingPointIndex !== null) {
      if (!this.isDraggingPoint && this.pointeredAtPointerDownThing?.class === 'mini-control-point' && currentThing?.id === this.pointeredAtPointerDownThing.id) {
        if (this.engine?.onMiniPointRemoved) {
          this.engine.onMiniPointRemoved(this.draggingPointIndex)
        }
      }
      this.draggingPointIndex = null
      this.isDraggingPoint = false
    }

    this.engine.cameraSystemMini2D.enableControls()

    this.pointeredThing = currentThing
    this.selectedThing = this.pointeredThing
    if (this.pointeredAtPointerDownThing && currentThing && this.pointeredAtPointerDownThing.id !== currentThing.id) {
      this.selectedThing = null
    }
    this.pointeredAtPointerDownThing = null
    this.updateStore()
  }

  onDoubleClick(event) {
    this.updateMouse(event)
    const worldPos = this.getWorldPointFromMouse()
    if (!worldPos) return
    if (this.engine?.onMiniPointAdded) {
      this.engine.onMiniPointAdded({ x: worldPos.x, y: worldPos.y })
    }
  }

  // обновить состояние store
  updateStore() { 
    this.store.setSceneMiniState({
      pointeredThing: this.pointeredThing,
      selectedThing: this.selectedThing
    })
  }

  dispose() {
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
  }
}