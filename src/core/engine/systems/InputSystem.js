import * as THREE from 'three'

export class InputSystem {
  constructor(container) {
    this.container = container
    this.mouse = new THREE.Vector2()
    this.raycaster = new THREE.Raycaster()
    this.lastPointer = null
    this.onPick = null

    this.onPointerDown = (e) => { this.lastPointer = e }
    container.addEventListener('pointerdown', this.onPointerDown)
  }

  update(engine) {
    if (!this.lastPointer) return

    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((this.lastPointer.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((this.lastPointer.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, engine.cameraSystem.camera)

    // Фильтровать по selectable можно в SelectionSystem
    const intersects = this.raycaster.intersectObjects(engine.sceneSystem.scene.children, true)

    const picked = intersects.length ? intersects[0].object : null
    if (this.onPick) this.onPick(picked)
    this.lastPointer = null
  }

  dispose() {
    this.container.removeEventListener('pointerdown', this.onPointerDown)
  }
}
