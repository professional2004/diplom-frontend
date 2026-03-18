import * as THREE from 'three'

export class InteractionController {
  constructor(camera, scene, renderer) {
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.camera = camera
    this.scene = scene
    this.domElement = renderer.domElement
    
    // Биндим контекст, чтобы можно было удалить слушатели
    this._onPointerDown = this.onPointerDown.bind(this)
    this.domElement.addEventListener('pointerdown', this._onPointerDown)
  }

  onPointerDown(event) {
    // 1. Нормализация координат мыши (-1 до +1)
    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // 2. Пускаем луч
    this.raycaster.setFromCamera(this.mouse, this.camera)

    // 3. Ищем пересечения (игнорируем сетку, ищем только фигуры)
    // Важно: нужно фильтровать объекты, которые можно выбирать
    const intersects = this.raycaster.intersectObjects(this.scene.children, false)

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object
      console.log('Выбрана фигура:', selectedObject)
      // Тут вызываем событие или метод стора: selectObject(selectedObject.uuid)
    } else {
      console.log('Клик в пустоту (снять выделение)')
    }
  }

  dispose() {
    this.domElement.removeEventListener('pointerdown', this._onPointerDown)
  }
}