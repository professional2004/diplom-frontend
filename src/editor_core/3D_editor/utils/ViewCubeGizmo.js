import * as THREE from 'three'

export class ViewCubeGizmo {
  constructor(mainCamera, mainControls) {
    this.mainCamera = mainCamera
    this.mainControls = mainControls

    // Своя сцена и камера для Гизмо
    this.scene = new THREE.Scene()
    
    // Используем ортографическую камеру для CAD-вида
    const d = 1.8
    this.camera = new THREE.OrthographicCamera(-d, d, d, -d, 0.1, 100)
    this.camera.position.set(0, 0, 5)

    // Создаем куб
    this.cube = this.createCube()
    this.scene.add(this.cube)

    // Инструменты для взаимодействия
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    // Размер гизмо на экране (в пикселях)
    this.gizmoSize = 120 
  }

  createCube() {
    const geometry = new THREE.BoxGeometry(1.6, 1.6, 1.6)
    const colors = [0xff4444, 0xcc0000, 0x44ff44, 0x00cc00, 0x4444ff, 0x0000cc]
    const labels = ['Right', 'Left', 'Top', 'Bottom', 'Front', 'Back']
    
    const materials = labels.map((label, i) => this.createFaceMaterial(label, colors[i]))
    const mesh = new THREE.Mesh(geometry, materials)

    // Направления для каждой грани (куда должна смотреть камера при клике)
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

  createFaceMaterial(text, color) {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#' + new THREE.Color(color).getHexString()
    ctx.fillRect(0, 0, 128, 128)
    
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 8
    ctx.strokeRect(0, 0, 128, 128)

    ctx.font = 'bold 28px Arial'
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text.toUpperCase(), 64, 64)

    const texture = new THREE.CanvasTexture(canvas)
    return new THREE.MeshBasicMaterial({ map: texture })
  }

  update() {
    // Проверка: если камера или контроллеры еще не подтянулись, выходим из метода
    if (!this.mainCamera || !this.mainControls || !this.mainControls.target) {
      return;
    }

    try {
      const eye = new THREE.Vector3();
      // Безопасно копируем векторы
      const cameraPos = this.mainCamera.position;
      const targetPos = this.mainControls.target;

      // Вычисляем вектор взгляда
      eye.subVectors(cameraPos, targetPos).normalize();
      
      // Дистанция в 3 единицы для камеры Гизмо
      this.camera.position.copy(eye.multiplyScalar(3));
      this.camera.lookAt(0, 0, 0);
    } catch (e) {
      console.warn("[ViewCubeGizmo] Update failed:", e);
    }
  }

  // Метод отрисовки, вызываемый из RenderSystem3D
  render(renderer) {
    const size = renderer.getSize(new THREE.Vector2())
    
    // Отрисовываем Гизмо в углу (Viewport)
    renderer.setViewport(size.x - this.gizmoSize, size.y - this.gizmoSize, this.gizmoSize, this.gizmoSize)
    renderer.setScissor(size.x - this.gizmoSize, size.y - this.gizmoSize, this.gizmoSize, this.gizmoSize)
    renderer.setScissorTest(true)
    
    renderer.render(this.scene, this.camera)
    
    // Сбрасываем настройки рендера обратно в полный экран
    renderer.setViewport(0, 0, size.x, size.y)
    renderer.setScissor(0, 0, size.x, size.y)
    renderer.setScissorTest(false)
  }

  // Метод обработки клика. Вызывается из InputSystem3D
  handlePointer(clientX, clientY, container) {
    const rect = container.getBoundingClientRect()
    
    // Проверяем, попал ли клик в область Гизмо (правый верхний угол)
    const isInsideGizmo = 
      clientX > (rect.right - this.gizmoSize) && 
      clientY < (rect.top + this.gizmoSize)

    if (!isInsideGizmo) return false

    // Локальные координаты внутри квадрата Гизмо
    const x = ((clientX - (rect.right - this.gizmoSize)) / this.gizmoSize) * 2 - 1
    const y = -((clientY - rect.top) / this.gizmoSize) * 2 + 1
    
    this.mouse.set(x, y)
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.cube)

    if (intersects.length > 0) {
      const faceIndex = intersects[0].face.materialIndex
      const direction = this.cube.userData.directions[faceIndex]
      this.snapCameraToDirection(direction)
      return true // Клик обработан Гизмо
    }

    return false
  }

  snapCameraToDirection(direction) {
    // В идеале здесь должна быть анимация (Tween), 
    // но для начала просто переставляем камеру:
    const dist = this.mainCamera.position.distanceTo(this.mainControls.target)
    const newPos = direction.clone().multiplyScalar(dist).add(this.mainControls.target)
    
    this.mainCamera.position.copy(newPos)
    this.mainControls.update()
  }

  dispose() {
    this.scene.clear()
    this.cube.geometry.dispose()
    this.cube.material.forEach(m => m.map.dispose())
    this.cube.material.forEach(m => m.dispose())
  }
}