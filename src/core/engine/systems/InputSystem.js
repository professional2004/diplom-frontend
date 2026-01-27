import * as THREE from 'three'
import { MoveShapeCommand } from '@/core/commands/MoveShapeCommand'
import { RotateShapeCommand } from '@/core/commands/RotateShapeCommand'
import { ScaleShapeCommand } from '@/core/commands/ScaleShapeCommand'

export class InputSystem {
  constructor(container) {
    this.container = container
    this.engine = null // Ссылка на движок будет установлена позже
    this.store = null  // Ссылка на Pinia store для обновления UI

    // Основные инструменты
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    // Плоскость, по которой будем тащить объект (виртуальная)
    this.dragPlane = new THREE.Plane()
    this.planeIntersectPoint = new THREE.Vector3()
    
    // Состояние перетаскивания
    this.isDragging = false
    this.dragObject = null
    this.dragOffset = new THREE.Vector3()
    this.startPosition = new THREE.Vector3() // Для Undo
    
    // Состояние трансформирования (поворот, масштаб)
    this.transformMode = null // 'move' | 'rotate' | 'scale'
    this.startRotation = new THREE.Euler()
    this.startScale = new THREE.Vector3()
    this.lastMouseX = 0
    this.lastMouseY = 0

    // Привязка контекста
    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)

    // Слушатели событий
    container.addEventListener('pointerdown', this.onPointerDown)
    container.addEventListener('pointermove', this.onPointerMove)
    container.addEventListener('pointerup', this.onPointerUp)
    document.addEventListener('keydown', this.onKeyDown)
  }

  // Метод для инъекции зависимости (вызывается из Engine)
  setEngine(engine) {
    this.engine = engine
  }

  // Метод для инъекции Store зависимости (вызывается из editorStore)
  setStore(store) {
    this.store = store
  }

  // Вспомогательный метод обновления координат мыши
  updateMouse(event) {
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  onPointerDown(event) {
    if (!this.engine) return
    this.updateMouse(event)

    // 1. Ищем пересечения с объектами
    this.raycaster.setFromCamera(this.mouse, this.engine.cameraSystem.camera)
    
    // Фильтруем только те объекты, которые помечены как selectable
    // (Это задается в AddCubeCommand: mesh.userData.selectable = true)
    const intersects = this.raycaster.intersectObjects(this.engine.sceneSystem.scene.children)
      .filter(hit => hit.object.userData.selectable)

    if (intersects.length > 0) {
      // НАЖАЛИ НА ФИГУРУ -> РЕЖИМ ТРАНСФОРМИРОВАНИЯ (по умолчанию ПЕРЕМЕЩЕНИЕ)
      const hit = intersects[0]
      this.dragObject = hit.object
      this.isDragging = true
      
      // Сохраняем начальные значения для всех видов трансформирования
      this.startPosition.copy(this.dragObject.position)
      this.startRotation.copy(this.dragObject.rotation)
      this.startScale.copy(this.dragObject.scale)
      
      // Сохраняем начальную позицию мыши для расчета дельты
      this.lastMouseX = event.clientX
      this.lastMouseY = event.clientY

      // Отключаем управление камерой, чтобы она не вращалась пока тащим
      if (this.engine.cameraSystem.controls) {
        this.engine.cameraSystem.controls.enabled = false
      }

      // Выделяем объект через SelectionSystem
      this.engine.selectionSystem.setSelected(this.dragObject)

      // Обновляем store для реактивности UI
      if (this.store) {
        this.store.updateSelectedShape(this.dragObject)
      }

      // Если режим не поворота или масштаба, настраиваем плоскость перетаскивания для режима перемещения
      if (this.transformMode !== 'rotate' && this.transformMode !== 'scale') {
        this.dragPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0), // Нормаль вверх
          this.dragObject.position
        )

        // Вычисляем смещение (offset), чтобы объект не "прыгал" центром к курсору
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
          this.dragOffset.subVectors(this.dragObject.position, this.planeIntersectPoint)
        }
      }

    } else {
      // НАЖАЛИ В ПУСТОТУ -> очищаем выделение
      this.engine.selectionSystem.clear()
      
      // Обновляем store для реактивности UI
      if (this.store) {
        this.store.updateSelectedShape(null)
      }
    }
  }

  onPointerMove(event) {
    if (!this.engine) return
    this.updateMouse(event)

    if (this.isDragging && this.dragObject) {
      const deltaX = event.clientX - this.lastMouseX
      const deltaY = event.clientY - this.lastMouseY
      this.lastMouseX = event.clientX
      this.lastMouseY = event.clientY

      // Выбираем режим трансформирования
      if (this.transformMode === 'rotate') {
        // РЕЖИМ ПОВОРОТА: используем движение мыши для вращения вокруг осей
        const rotationSpeed = 0.005
        this.dragObject.rotation.y += deltaX * rotationSpeed
        this.dragObject.rotation.x += deltaY * rotationSpeed
      } else if (this.transformMode === 'scale') {
        // РЕЖИМ МАСШТАБИРОВАНИЯ: движение мыши вверх = увеличение, вниз = уменьшение
        const scaleSpeed = 0.005
        const scaleFactor = 1 + (deltaY * scaleSpeed * -1) // инвертируем Y для интуитивности
        this.dragObject.scale.multiplyScalar(scaleFactor)
        // Ограничиваем минимальный размер
        const minScale = 0.1
        if (this.dragObject.scale.x < minScale) this.dragObject.scale.set(minScale, minScale, minScale)
      } else {
        // РЕЖИМ ПЕРЕМЕЩЕНИЯ (по умолчанию): таскаем по плоскости
        this.raycaster.setFromCamera(this.mouse, this.engine.cameraSystem.camera)

        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
          // Новая позиция = точка пересечения луча с плоскостью + смещение
          const newPos = new THREE.Vector3().addVectors(this.planeIntersectPoint, this.dragOffset)
          this.dragObject.position.copy(newPos)
        }
      }
    } else {
      // HOVER отслеживание - проверяем пересечения мышью
      this.raycaster.setFromCamera(this.mouse, this.engine.cameraSystem.camera)
      const intersects = this.raycaster.intersectObjects(this.engine.sceneSystem.scene.children)
        .filter(hit => hit.object.userData.selectable)

      if (intersects.length > 0) {
        // Наводимся на объект
        const hoveredObject = intersects[0].object
        this.engine.selectionSystem.setHovered(hoveredObject)
      } else {
        // Больше не наводимся ни на что
        if (this.engine.selectionSystem.getHovered() && 
            this.engine.selectionSystem.getHovered() !== this.engine.selectionSystem.getSelected()) {
          this.engine.selectionSystem.setHovered(null)
        }
      }
    }
  }

  onPointerUp(event) {
    if (this.isDragging && this.dragObject) {
      // Завершение перетаскивания - записываем команду в историю в зависимости от режима
      
      // Сохраняем текущее состояние объекта для сравнения
      const currentPosition = this.dragObject.position.clone()
      const currentRotation = this.dragObject.rotation.clone()
      const currentScale = this.dragObject.scale.clone()

      // Проверяем какой режим был активен и создаем соответствующую команду
      if (this.transformMode === 'rotate') {
        // Если поворот действительно изменился, записываем в историю
        if (!currentRotation.equals(this.startRotation)) {
          const cmd = new RotateShapeCommand(
            this.dragObject,
            currentRotation,
            this.startRotation
          )
          this.engine.historySystem.execute(cmd)
        }
      } else if (this.transformMode === 'scale') {
        // Если масштаб действительно изменился, записываем в историю
        if (!currentScale.equals(this.startScale)) {
          const cmd = new ScaleShapeCommand(
            this.dragObject,
            currentScale,
            this.startScale
          )
          this.engine.historySystem.execute(cmd)
        }
      } else {
        // РЕЖИМ ПЕРЕМЕЩЕНИЯ (по умолчанию)
        if (!currentPosition.equals(this.startPosition)) {
          const cmd = new MoveShapeCommand(
            this.dragObject,
            currentPosition,
            this.startPosition
          )
          this.engine.historySystem.execute(cmd)
        }
      }

      // Обновляем состояние UI через store
      if (this.store && this.store.updateUndoRedo) {
        this.store.updateUndoRedo()
      }

      this.isDragging = false
      this.dragObject = null
    }

    // В любом случае включаем камеру обратно
    if (this.engine && this.engine.cameraSystem.controls) {
      this.engine.cameraSystem.controls.enabled = true
    }
  }

  update(engine) {
    // В методе update больше не нужно обрабатывать лучи, 
    // всё происходит событийно в onPointer...
  }

  onKeyDown(event) {
    if (!this.engine) return

    // Обработка Delete клавиши для удаления выбранной фигуры
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selected = this.engine.selectionSystem.getSelected()
      if (selected) {
        window.dispatchEvent(new CustomEvent('deleteSelectedShape', { detail: selected }))
      }
    }

    // Undo: Ctrl+Z (или Cmd+Z на Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault()
      window.dispatchEvent(new CustomEvent('undo'))
    }

    // Redo: Ctrl+Shift+Z (или Cmd+Shift+Z на Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
      event.preventDefault()
      window.dispatchEvent(new CustomEvent('redo'))
    }

    // Redo: Ctrl+Y (альтернативный вариант)
    if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
      event.preventDefault()
      window.dispatchEvent(new CustomEvent('redo'))
    }

    // Активация режимов трансформирования для выбранного объекта
    const selected = this.engine.selectionSystem.getSelected()
    if (!selected) return

    // R - режим поворота (Rotation mode)
    if (event.key === 'r' || event.key === 'R') {
      this.transformMode = this.transformMode === 'rotate' ? null : 'rotate'
      console.log('Rotation mode:', this.transformMode ? 'ON' : 'OFF')
    }

    // S - режим масштабирования (Scale mode)
    if (event.key === 's' || event.key === 'S') {
      this.transformMode = this.transformMode === 'scale' ? null : 'scale'
      console.log('Scale mode:', this.transformMode ? 'ON' : 'OFF')
    }

    // G - режим перемещения (Grab/Move mode) - по умолчанию
    if (event.key === 'g' || event.key === 'G') {
      this.transformMode = this.transformMode === 'move' ? null : 'move'
      console.log('Move mode:', this.transformMode ? 'ON' : 'OFF')
    }

    // ESC - отмена режима трансформирования
    if (event.key === 'Escape') {
      this.transformMode = null
    }
  }

  dispose() {
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
    document.removeEventListener('keydown', this.onKeyDown)
  }
}