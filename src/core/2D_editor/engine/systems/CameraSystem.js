import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls'

export class CameraSystem2D {
  constructor(container) {
    // ИСПРАВЛЕНИЕ: Безопасное вычисление соотношения сторон
    const w = container.clientWidth || 1
    const h = container.clientHeight || 1
    const aspect = w / h

    this.camera = new THREE.OrthographicCamera(-20 * aspect, 20 * aspect, 20, -20, 0.1, 1000)
    this.camera.position.set(0, 0, 50)

    this.controls = new MapControls(this.camera, container)
    this.controls.enableRotate = false 
    this.controls.screenSpacePanning = true
    this.controls.enableDamping = true
    this.controls.minZoom = 0.5
    this.controls.maxZoom = 5
  }

  update() {
    this.controls.update()
  }

  setAspect(width, height) {
    const safeWidth = width || 1
    const safeHeight = height || 1
    const aspect = safeWidth / safeHeight
    
    this.camera.left = -20 * aspect
    this.camera.right = 20 * aspect
    this.camera.top = 20
    this.camera.bottom = -20
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    this.controls.dispose()
  }
}