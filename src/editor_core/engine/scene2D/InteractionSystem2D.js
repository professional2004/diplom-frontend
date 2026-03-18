import * as THREE from 'three'

export class InteractionSystem2D {
  constructor(engine, container) {
    this.engine = engine
    this.container = container
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)

    container.addEventListener('pointerdown', this.onPointerDown)
    container.addEventListener('pointermove', this.onPointerMove)
    container.addEventListener('pointerup', this.onPointerUp)
  }

  // Вспомогательный метод обновления координат мыши
  updateMouse(event) {
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  getIntersectedObject() {
    this.raycaster.setFromCamera(this.mouse, this.engine.cameraSystem2D.getCamera())
    const objects = this.engine.sceneSystem2D.getObjects()
    const intersects = this.raycaster.intersectObjects(objects).filter(hit => hit.object.userData.selectable)

    if (intersects.length > 0) {
      const hit = intersects[0]
      return hit
    } else {
      return null
    }
  }

  onPointerDown(event) {
    this.updateMouse(event)
  }

  onPointerMove(event) {
    this.updateMouse(event)
  }

  onPointerUp(event) {
    this.updateMouse(event)
    const hitObject = this.getIntersectedObject()
    console.log('Нажатый объект: ', hitObject)
  }

  dispose() {
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
  }
}