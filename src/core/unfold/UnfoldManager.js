import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import { SurfaceRegistry } from '@/core/surfaces/SurfaceRegistry'

export class UnfoldManager {
  constructor(container) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf0f0f0)

    const aspect = container.clientWidth / container.clientHeight
    // Увеличим зум камеры по умолчанию
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
    // Полная очистка сцены развертки перед перерисовкой
    this.scene.clear()

    // Сетка для фона
    const grid = new THREE.GridHelper(100, 50, 0xddd, 0xeee)
    grid.rotation.x = -Math.PI / 2
    this.scene.add(grid)

    let offsetX = 0
    const gap = 5 // Отступ между развертками

    threeScene.traverse((obj) => {
      // Ищем объекты, которые являются поверхностями нашего редактора
      if (obj.isMesh && obj.userData.selectable && obj.userData.surfaceType) {
        
        try {
          // 1. Воссоздаем инстанс поверхности через реестр, передавая параметры
          const surfaceInstance = SurfaceRegistry.create(obj.userData.surfaceType, obj.userData.params)
          
          // 2. Генерируем 2D развертку
          const unfoldGroup = surfaceInstance.createUnfold2D()
          
          // 3. Расставляем в ряд (Auto-Layout)
          const bbox = new THREE.Box3().setFromObject(unfoldGroup)
          const width = bbox.max.x - bbox.min.x
          
          // Центрируем локально
          const center = new THREE.Vector3()
          bbox.getCenter(center)
          unfoldGroup.position.sub(center)

          // Ставим на позицию в лэйауте
          unfoldGroup.position.x += offsetX + width / 2
          
          this.scene.add(unfoldGroup)

          // Сдвигаем курсор раскладки
          offsetX += width + gap
        } catch (e) {
          console.warn('Failed to unfold surface:', obj.userData.surfaceType, e)
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