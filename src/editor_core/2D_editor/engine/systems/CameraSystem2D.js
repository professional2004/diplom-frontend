import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls'

export class CameraSystem2D {
  constructor(container) {
    // Безопасное вычисление соотношения сторон
    const w = container.clientWidth || 1
    const h = container.clientHeight || 1
    const aspect = w / h

    this.camera = new THREE.OrthographicCamera(-20 * aspect, 20 * aspect, 20, -20, 0.1, 1000)
    this.camera.position.set(0, 0, 50)
    this.camera.zoom = 1

    // Сохраняем начальное состояние для reset
    this.initial = {
      position: this.camera.position.clone(),
      zoom: this.camera.zoom,
      leftRightFactor: 20 // фиксированная половина высоты в юнитах
    }

    this.controls = new MapControls(this.camera, container)
    this.controls.enableRotate = false 
    this.controls.screenSpacePanning = true
    this.controls.enableDamping = false // ОТКЛЮЧАЕМ damping — чтобы движение следовало за мышью без задержек
    this.controls.minZoom = 0.5
    this.controls.maxZoom = 5
  }

  update() {
    // при enableDamping=false вызов update всё ещё безопасен, просто ничего не сглаживает
    this.controls.update()
  }

  setAspect(width, height) {
    const safeWidth = width || 1
    const safeHeight = height || 1
    const aspect = safeWidth / safeHeight

    // left/right зависят от aspect и базового "top" (=20)
    const halfHeight = 20
    this.camera.left = -halfHeight * aspect
    this.camera.right = halfHeight * aspect
    this.camera.top = halfHeight
    this.camera.bottom = -halfHeight
    this.camera.updateProjectionMatrix()
  }

  zoom(factor = 1.1) {
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