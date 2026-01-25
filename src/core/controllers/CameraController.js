import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'


export class CameraController {
  constructor(container, cameraOptions = {}) {
    const { fov = 45, near = 0.1, far = 1000 } = cameraOptions

    this.camera = new THREE.PerspectiveCamera(fov, container.clientWidth / container.clientHeight, near, far)

    // начальное состояние камеры
    this.initial = {
      position: new THREE.Vector3(0, 10, 20),
      target: new THREE.Vector3(0, 0, 0)
    }

    this.camera.position.copy(this.initial.position)

    // OrbitControls
    this.controls = new OrbitControls(this.camera, container)
    this.controls.target.copy(this.initial.target)
    this.controls.update()
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.screenSpacePanning = false

    // Можно хранить min/max дистанции
    this.minDistance = 0.5
    this.maxDistance = 500
  }

  setAspect(width, height) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  update() {
    if (this.controls) this.controls.update()
  }

  setPosition(pos) {
    if (!pos) return
    this.camera.position.set(pos.x, pos.y, pos.z)
    this.controls.update()
  }

  setTarget(target) {
    if (!target) return
    this.controls.target.set(target.x, target.y, target.z)
    this.controls.update()
  }

  zoom(factor = 1.1) {
    // масштабируем позицию относительно target
    const dir = new THREE.Vector3()
    dir.subVectors(this.camera.position, this.controls.target).multiplyScalar(factor)
    this.camera.position.copy(this.controls.target).add(dir)
    this.controls.update()
  }

  reset() {
    this.camera.position.copy(this.initial.position)
    this.controls.target.copy(this.initial.target)
    this.controls.reset()
    this.controls.update()
  }

  dispose() {
    if (this.controls) this.controls.dispose()
  }
}