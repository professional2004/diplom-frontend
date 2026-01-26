import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export class CameraSystem {
  constructor(domElement, options = {}) {
    if (!domElement) { throw new Error('[CameraSystem.js] domElement is requireв')}
    const { fov = 45, near = 0.1, far = 1000 } = options
    this.camera = new THREE.PerspectiveCamera(fov, domElement.clientWidth / domElement.clientHeight, near, far)
    
    // начальное состояние
    this.initial = {
      position: new THREE.Vector3(0, 10, 20),
      target: new THREE.Vector3(0, 0, 0)
    }
    this.camera.position.copy(this.initial.position)

    this.controls = new OrbitControls(this.camera, domElement)
    this.controls.target.copy(this.initial.target)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.screenSpacePanning = false

    // анимация перелётов
    this.isAnimating = false
    this.startPos = new THREE.Vector3()
    this.targetPos = new THREE.Vector3()
    this.t0 = 0
    this.duration = 0
  }

  update() {
    if (this.controls) this.controls.update()
    this.updateAnimation()
  }

  setAspect(width, height) {
    if (!width || !height) return
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  zoom(factor = 1.1) {
    const dir = new THREE.Vector3()
    dir.subVectors(this.camera.position, this.controls.target).multiplyScalar(factor)
    this.camera.position.copy(this.controls.target).add(dir)
    this.controls.update()
  }

  reset() {
    this.camera.position.copy(this.initial.position)
    this.controls.target.copy(this.initial.target)
    this.controls.update()
  }

  flyTo(directionVector, duration = 600) {
    // Устанавливаем камеру на направлении от target на текущую дистанцию
    if (!directionVector) return
    const distance = this.camera.position.distanceTo(this.controls.target)
    const endPos = new THREE.Vector3().copy(this.controls.target).add(directionVector.clone().multiplyScalar(distance))
    this.startAnimation(endPos, duration)
  }

  startAnimation(targetPos, duration) {
    this.isAnimating = true
    this.startPos.copy(this.camera.position)
    this.targetPos.copy(targetPos)
    this.t0 = performance.now()
    this.duration = duration
    this.controls.enabled = false
  }

  updateAnimation() {
    if (!this.isAnimating) return
    const now = performance.now()
    const progress = Math.min((now - this.t0) / this.duration, 1)
    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress
    this.camera.position.lerpVectors(this.startPos, this.targetPos, ease)
    if (progress >= 1) {
      this.isAnimating = false
      this.controls.enabled = true
      this.controls.update()
    }
  }

  dispose() {
    this.controls.dispose()
  }
}
