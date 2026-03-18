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

    // Для анимации перелета
    this.isAnimating = false
    this.targetPosition = new THREE.Vector3()
    this.animStartTime = 0
    this.animDuration = 0
    this.startPosition = new THREE.Vector3()

    // Можно хранить min/max дистанции
    // this.minDistance = 0.5
    // this.maxDistance = 500
  }

  update() {
    if (this.controls) this.controls.update()
    this._updateAnimation()
  }


  // НОВЫЙ МЕТОД: Плавный перелет к заданной позиции
  flyTo(directionVector) {
    // directionVector - это нормаль грани (например, 0, 1, 0 для верха)
    // Нам нужно поставить камеру на определенное расстояние от цели (0,0,0)
    const distance = this.camera.position.distanceTo(this.controls.target)
    
    // Новая позиция = Цель + (Направление * Дистанцию)
    const endPos = new THREE.Vector3().copy(this.controls.target).add(
      directionVector.clone().multiplyScalar(distance)
    )

    this._startAnimation(endPos, 600) // 600ms длительность
  }


  _startAnimation(targetPos, duration) {
    this.isAnimating = true
    this.targetPosition.copy(targetPos)
    this.startPosition.copy(this.camera.position)
    this.animStartTime = performance.now()
    this.animDuration = duration
    this.controls.enabled = false // Блокируем управление во время полета
  }

  _updateAnimation() {
    if (!this.isAnimating) return

    const now = performance.now()
    const progress = Math.min((now - this.animStartTime) / this.animDuration, 1)

    // Easing function (плавный старт и финиш)
    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress

    this.camera.position.lerpVectors(this.startPosition, this.targetPosition, ease)

    if (progress >= 1) {
      this.isAnimating = false
      this.controls.enabled = true
      this.controls.update()
    }
  }

  setAspect(width, height) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
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