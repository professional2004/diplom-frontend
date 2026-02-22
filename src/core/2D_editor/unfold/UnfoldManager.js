import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls'
import { ShapeRegistry } from '@/core/3D_editor/shapes/ShapeRegistry'

export class UnfoldManager {
  constructor(container) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf0f0f0)

    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.OrthographicCamera(-20 * aspect, 20 * aspect, 20, -20, 0.1, 1000)
    this.camera.position.set(0, 0, 50)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(this.renderer.domElement)

    this.controls = new MapControls(this.camera, this.renderer.domElement)
    this.controls.enableRotate = false
    this.controls.screenSpacePanning = true
    this.controls.enableDamping = true
    this.controls.minZoom = 0.5
    this.controls.maxZoom = 5
  }

  sync(threeScene) {
    this.scene.clear()

    const grid = new THREE.GridHelper(100, 50, 0xddd, 0xeee)
    grid.rotation.x = -Math.PI / 2
    this.scene.add(grid)

    let offsetX = 0
    const gap = 5 // отступ между развёртками разных фигур

    threeScene.traverse((obj) => {
      if (obj.isMesh && obj.userData.selectable && obj.userData.shapeType) {
        try {
          const shapeInstance = ShapeRegistry.create(obj.userData.shapeType, obj.userData.params)
          const unfoldGroup = shapeInstance.createUnfold2D() // группа, содержащая все грани (каждая грань — потомок)

          // Если граней нет — пропускаем
          if (unfoldGroup.children.length === 0) return

          // Вычисляем общий bounding box всех граней этой развёртки
          const bbox = new THREE.Box3()
          unfoldGroup.children.forEach(child => bbox.expandByObject(child))
          const width = bbox.max.x - bbox.min.x
          const center = bbox.getCenter(new THREE.Vector3())

          // Центрируем развёртку и размещаем в ряду
          unfoldGroup.children.forEach(child => {
            child.position.x -= center.x
            child.position.y -= center.y
            child.position.x += offsetX + width / 2

            this.scene.add(child) // каждая грань становится отдельным объектом сцены
          })

          offsetX += width + gap
        } catch (e) {
          console.warn('Failed to unfold shape:', obj.userData.shapeType, e)
        }
      }
    })
  }

  update() {
    this.controls.update()
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  resize(w, h) {
    this.renderer.setSize(w, h)
    const aspect = w / h
    this.camera.left = -20 * aspect
    this.camera.right = 20 * aspect
    this.camera.top = 20
    this.camera.bottom = -20
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    this.renderer.dispose()
    this.controls.dispose()
  }
}