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

    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)

    container.addEventListener('pointerdown', this.onPointerDown)
    container.addEventListener('pointermove', this.onPointerMove)
    container.addEventListener('pointerup', this.onPointerUp)
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
      return hit.object.userData?.id
    } else {
      return null
    }
  }

  onPointerDown(event) {
    this.updateMouse(event)
    this.pointeredThing = this.getIntersectedObject()
    this.pointeredAtPointerDownThing = this.pointeredThing
    this.selectedThing = this.pointeredThing
    this.updateStore()
  }

  onPointerMove(event) {
    this.updateMouse(event)
    this.pointeredThing = this.getIntersectedObject()
    this.updateStore()
  }

  onPointerUp(event) {
    this.updateMouse(event)
    this.pointeredThing = this.getIntersectedObject()
    if (this.pointeredAtPointerDownThing != this.pointeredThing) { this.selectedThing = null }
    this.pointeredAtPointerDownThing = null
    this.updateStore()
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