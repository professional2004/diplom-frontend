import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export class ViewCubeGizmo {
  constructor(container, mainCamera, mainControls, onFaceClick) {
    this.container = container
    this.mainCamera = mainCamera
    this.mainControls = mainControls
    this.onFaceClick = onFaceClick

    // 1. Инициализация сцены и рендера
    this.scene = new THREE.Scene()
    
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.container.appendChild(this.renderer.domElement)

    // 2. Камера Gizmo (всегда смотрит на 0,0,0)
    const aspect = container.clientWidth / container.clientHeight
    const d = 1.8
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 100)
    this.camera.position.set(0, 0, 10)

    // 3. Создаем Куб
    this.cube = this._createCube()
    this.scene.add(this.cube)

    // 4. Raycaster для кликов
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    // 5. НОВОЕ: Контроллер вращения для куба
    // Мы привязываем его к канвасу куба, но управляем ГЛАВНОЙ камерой
    this.gizmoControls = new OrbitControls(this.mainCamera, this.renderer.domElement)
    this.gizmoControls.enableZoom = false // Зум на кубе не нужен
    this.gizmoControls.enablePan = false  // Пан на кубе не нужен
    this.gizmoControls.enableDamping = false // Мгновенная реакция
    this.gizmoControls.rotateSpeed = 0.5 // Чуть медленнее для точности

    // 6. Обработка событий (различаем Клик и Драг)
    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)
    
    // Используем pointerdown/up на renderer.domElement
    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown)
    this.renderer.domElement.addEventListener('pointerup', this._onPointerUp)

    // Переменные для отслеживания драга
    this.dragStart = { x: 0, y: 0 }
    this.isDragging = false
  }

  _createCube() {
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5)
    
    const colors = [0xff3333, 0xaa0000, 0x33ff33, 0x00aa00, 0x3333ff, 0x0000aa]
    const labels = ['Right', 'Left', 'Top', 'Bottom', 'Front', 'Back']
    const materials = labels.map((label, i) => this._createFaceMaterial(label, colors[i]))

    const mesh = new THREE.Mesh(geometry, materials)
    
    // Нормали для выравнивания камеры
    mesh.userData.directions = [
      new THREE.Vector3(1, 0, 0),  // Right
      new THREE.Vector3(-1, 0, 0), // Left
      new THREE.Vector3(0, 1, 0),  // Top
      new THREE.Vector3(0, -1, 0), // Bottom
      new THREE.Vector3(0, 0, 1),  // Front
      new THREE.Vector3(0, 0, -1), // Back
    ]
    
    return mesh
  }

  _createFaceMaterial(text, color) {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    
    ctx.fillStyle = '#' + new THREE.Color(color).getHexString()
    ctx.fillRect(0, 0, 128, 128)
    
    ctx.lineWidth = 10
    ctx.strokeStyle = '#fff'
    ctx.strokeRect(0, 0, 128, 128)
    
    ctx.font = 'bold 32px Arial'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text.toUpperCase(), 64, 64)

    return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) })
  }

  update() {
    // 1. Обновляем контроллеры (нужно, чтобы синхронизировать таргет)
    // Важно: если основная камера сместилась (pan), gizmoControls должен знать новый target
    this.gizmoControls.target.copy(this.mainControls.target)
    this.gizmoControls.update()

    // 2. Синхронизация визуального куба с главной камерой
    const dir = new THREE.Vector3()
    dir.subVectors(this.mainCamera.position, this.mainControls.target)
    dir.normalize()

    this.camera.position.copy(dir.multiplyScalar(5))
    this.camera.lookAt(0, 0, 0)

    this.renderer.render(this.scene, this.camera)
  }

  _onPointerDown(event) {
    this.dragStart.x = event.clientX
    this.dragStart.y = event.clientY
    this.isDragging = false
  }

  _onPointerUp(event) {
    // Вычисляем, насколько сдвинулась мышь
    const dx = event.clientX - this.dragStart.x
    const dy = event.clientY - this.dragStart.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Если сдвиг больше 3 пикселей, считаем это вращением, а не кликом
    if (dist > 3) {
      this.isDragging = true
      return // Прерываем, не обрабатываем клик по грани
    }

    // Логика клика (Raycasting)
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.cube)

    if (intersects.length > 0) {
      const faceIndex = intersects[0].face.materialIndex
      const direction = this.cube.userData.directions[faceIndex]
      if (this.onFaceClick && direction) {
        this.onFaceClick(direction)
      }
    }
  }

  dispose() {
    this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown)
    this.renderer.domElement.removeEventListener('pointerup', this._onPointerUp)
    
    this.gizmoControls.dispose() // Не забываем удалить контроллер
    this.renderer.dispose()
    this.scene.clear()
  }
}