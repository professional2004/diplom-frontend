import * as THREE from 'three'
import { MoveCommand } from '@/core/commands/MoveCommand'

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
      // НАЖАЛИ НА ФИГУРУ -> РЕЖИМ ПЕРЕМЕЩЕНИЯ
      const hit = intersects[0]
      this.dragObject = hit.object
      this.isDragging = true
      
      // Сохраняем начальную позицию для Undo
      this.startPosition.copy(this.dragObject.position)

      // Отключаем управление камерой, чтобы она не вращалась пока тащим
      if (this.engine.cameraSystem.controls) {
        this.engine.cameraSystem.controls.enabled = false
      }

      // Выделяем объект через SelectionSystem (новый метод setSelected)
      this.engine.selectionSystem.setSelected(this.dragObject)

      // Обновляем store для реактивности UI
      if (this.store) {
        this.store.updateSelectedShape(this.dragObject)
      }

      // Настраиваем плоскость перетаскивания.
      // Мы создаем плоскость, проходящую через центр объекта и направленную вверх (нормаль Y),
      // чтобы таскать по "полу".
      // Если нужно таскать вертикально, логику можно усложнить (зависит от угла камеры).
      this.dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0), // Нормаль вверх
        this.dragObject.position
      )

      // Вычисляем смещение (offset), чтобы объект не "прыгал" центром к курсору
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
        this.dragOffset.subVectors(this.dragObject.position, this.planeIntersectPoint)
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
      // Логика перемещения
      this.raycaster.setFromCamera(this.mouse, this.engine.cameraSystem.camera)

      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
        // Новая позиция = точка пересечения луча с плоскостью + смещение
        const newPos = new THREE.Vector3().addVectors(this.planeIntersectPoint, this.dragOffset)
        this.dragObject.position.copy(newPos)
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
      // Завершение перетаскивания
      
      // Если позиция реально изменилась, записываем в историю
      if (!this.dragObject.position.equals(this.startPosition)) {
        const cmd = new MoveCommand(
          this.dragObject,
          this.dragObject.position,
          this.startPosition
        )
        // Добавляем команду в стек истории, но не выполняем её повторно (т.к. объект уже сдвинут)
        // В HistorySystem нужно учесть такой кейс, либо просто сделать execute, который перезапишет то же самое.
        // Для простоты вызовем execute через систему.
        this.engine.historySystem.execute(cmd)
        
        // ВАЖНО: Обновляем состояние кнопок Undo/Redo в UI (через Store пока не можем напрямую, 
        // но Store сам может подписаться или мы просто полагаемся на реактивность Vue, 
        // но здесь чистый JS. Обычно EditorStore дергает updateUndoRedo после действий.
        // В текущей архитектуре UI обновляется при клике на кнопки, но чтобы кнопки активировались, 
        // нам нужен триггер. Пока оставим как есть, кнопки обновятся при следующем взаимодействии или можно добавить EventBus).
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
        // Эмитим событие через engine или вызываем команду напрямую
        // Для этого нужно передать в InputSystem какой-то callback,
        // или испольвать глобальный обработчик.
        // Пока вызовем Delete через store (это будет сделано в UI)
        // Но здесь мы можем эмитить кастомное событие для store
        
        // Создаем кастомное событие, которое слушает Store
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
  }

  dispose() {
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
    document.removeEventListener('keydown', this.onKeyDown)
  }
}