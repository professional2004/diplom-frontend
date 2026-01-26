import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import { ShapeRegistry } from '@/core/shapes/ShapeRegistry'

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
    // (В продакшене лучше делать diff, но для простоты — clear)
    this.scene.clear()

    // Сетка для фона (опционально)
    const grid = new THREE.GridHelper(100, 50, 0xddd, 0xeee)
    grid.rotation.x = -Math.PI / 2
    this.scene.add(grid)

    let offsetX = 0
    const gap = 5 // Отступ между развертками

    threeScene.traverse((obj) => {
      // Ищем объекты, которые являются фигурами нашего редактора
      if (obj.isMesh && obj.userData.selectable && obj.userData.shapeType) {
        
        try {
          // 1. Воссоздаем инстанс фигуры через реестр, передавая параметры
          const shapeInstance = ShapeRegistry.create(obj.userData.shapeType, obj.userData.params)
          
          // 2. Генерируем 2D графику
          const unfoldGroup = shapeInstance.createUnfold2D()
          
          // 3. Расставляем в ряд (Auto-Layout)
          // Вычисляем примерную ширину (можно точнее через Box3, но пока просто сдвигаем)
          const bbox = new THREE.Box3().setFromObject(unfoldGroup)
          const width = bbox.max.x - bbox.min.x
          
          // Центрируем локально
          const center = new THREE.Vector3()
          bbox.getCenter(center)
          unfoldGroup.position.sub(center) // сдвиг чтобы центр был в 0,0

          // Ставим на позицию в лэйауте
          unfoldGroup.position.x += offsetX + width / 2
          
          // Добавляем подпись (ID или Тип) - опционально
          // (Three.js FontLoader сложен для примера, поэтому без текста пока)
          
          this.scene.add(unfoldGroup)

          // Сдвигаем курсор раскладки
          offsetX += width + gap
        } catch (e) {
          console.warn('Failed to unfold shape:', obj.userData.shapeType, e)
        }
      }
    })
  }

  update() {
    this.controls.update()
    // ВАЖНО: Мы больше не обновляем позиции разверток в цикле. 
    // Они статичны, пока не изменится состав сцены (вызов sync).
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