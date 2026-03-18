import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls'

export class CameraSystem2D {
  constructor(container) {
    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.OrthographicCamera(-20 * aspect, 20 * aspect, 20, -20, 0.1, 1000)
    this.camera.position.set(0, 0, 50)
    this.camera.zoom = 1

    // Сохраняем начальное состояние для reset
    this.initial = {
      position: this.camera.position.clone(),
      zoom: this.camera.zoom
    }

    this.controls = new MapControls(this.camera, container)
    this.controls.enableRotate = false 
    this.controls.screenSpacePanning = true
    this.controls.enableDamping = false
    this.controls.minZoom = 0.5
    this.controls.maxZoom = 5
  }

  getCamera() {
    return this.camera
  }

  update() {
    this.controls.update()
  }

  setAspect(width, height) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  zoom(where) {
    const factor = where ? 1.1 : 0.9
    const newZoom = Math.min(this.controls.maxZoom, Math.max(this.controls.minZoom, this.camera.zoom * factor))
    this.camera.zoom = newZoom
    this.camera.updateProjectionMatrix()
    this.controls.update()
  }

  reset() {
    this.camera.position.copy(this.initial.position)
    this.camera.zoom = this.initial.zoom
    this.camera.updateProjectionMatrix()
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

  dispose() {
    this.controls.dispose()
  }
}