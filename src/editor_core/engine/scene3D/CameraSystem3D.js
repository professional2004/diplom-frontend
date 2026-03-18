import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export class CameraSystem3D {
  constructor(container) {
    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
    this.camera.position.set(0, 10, 20)

    // Сохраняем начальное состояние для reset
    this.initial = {
      position: this.camera.position.clone(),
      target: new THREE.Vector3(0, 0, 0)
    }

    this.controls = new OrbitControls(this.camera, container)
    this.controls.target.copy(this.initial.target)
    this.controls.enableDamping = false
    this.controls.screenSpacePanning = false
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
    const direction = new THREE.Vector3()
    direction.subVectors(this.camera.position, this.controls.target).multiplyScalar(factor)
    this.camera.position.copy(this.controls.target).add(direction)
    this.controls.update()
  }

  reset() {
    this.camera.position.copy(this.initial.position)
    this.controls.target.copy(this.initial.target)
    this.controls.update()
  }

  dispose() {
    this.controls.dispose()
  }
}
