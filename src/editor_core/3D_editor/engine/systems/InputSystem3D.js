import * as THREE from 'three'
import { MoveShapeCommand } from '@/editor_core/3D_editor/commands/MoveShapeCommand'

export class InputSystem3D {
  constructor(container) {
    this.container = container
    this.engine3D = null // Ссылка на движок будет установлена позже

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
  setEngine(engine3D) {
    this.engine3D = engine3D
  }

  // Вспомогательный метод обновления координат мыши
  updateMouse(event) {
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  onPointerDown(event) {
    if (!this.engine3D) return

    // Сначала Гизмо
    if (this.engine3D.viewCubeGizmo) {
      const handled = this.engine3D.viewCubeGizmo.handlePointer(
        event.clientX, 
        event.clientY, 
        this.container
      );
      if (handled) return; // Прерываем, так как кликнули по кубу
    }

    this.updateMouse(event)

    this.raycaster.setFromCamera(this.mouse, this.engine3D.cameraSystem3D.camera)
    const intersects = this.raycaster.intersectObjects(this.engine3D.sceneSystem3D.scene.children)
      .filter(hit => hit.object.userData.selectable)

    if (intersects.length > 0) {
      const hit = intersects[0]
      this.dragObject = hit.object
      this.isDragging = true
      this.startPosition.copy(this.dragObject.position)

      if (this.engine3D.cameraSystem3D.controls) {
        this.engine3D.cameraSystem3D.controls.enabled = false
      }

      this.engine3D.selectionSystem3D.setSelected(this.dragObject)
      // отдаем логический объект из ShapeSystem
      const ent = this.engine3D.registry.shapeSystem.getByMesh(this.dragObject)
      this.engine3D.registry.emitUIUpdate('selection:changed', ent)

      this.dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        this.dragObject.position
      )

      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
        this.dragOffset.subVectors(this.dragObject.position, this.planeIntersectPoint)
      }

    } else {
      this.engine3D.selectionSystem3D.clear()
      this.engine3D.registry.emitUIUpdate('selection:changed', null)
    }
  }

  onPointerMove(event) {
    if (!this.engine3D) return
    this.updateMouse(event)

    if (this.isDragging && this.dragObject) {
      // Логика перемещения
      this.raycaster.setFromCamera(this.mouse, this.engine3D.cameraSystem3D.camera)

      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
        // Новая позиция = точка пересечения луча с плоскостью + смещение
        const newPos = new THREE.Vector3().addVectors(this.planeIntersectPoint, this.dragOffset)
        this.dragObject.position.copy(newPos)
      }
    } else {
      // HOVER отслеживание - проверяем пересечения мышью
      this.raycaster.setFromCamera(this.mouse, this.engine3D.cameraSystem3D.camera)
      const intersects = this.raycaster.intersectObjects(this.engine3D.sceneSystem3D.scene.children)
        .filter(hit => hit.object.userData.selectable)

      if (intersects.length > 0) {
        // Наводимся на объект
        const hoveredObject = intersects[0].object
        this.engine3D.selectionSystem3D.setHovered(hoveredObject)
      } else {
        // Больше не наводимся ни на что
        if (this.engine3D.selectionSystem3D.getHovered() && 
            this.engine3D.selectionSystem3D.getHovered() !== this.engine3D.selectionSystem3D.getSelected()) {
          this.engine3D.selectionSystem3D.setHovered(null)
        }
      }
    }
  }

  onPointerUp() {
    if (this.isDragging && this.dragObject) {
      if (!this.dragObject.position.equals(this.startPosition)) {
        const cmd = new MoveShapeCommand(
          this.dragObject,
          this.dragObject.position,
          this.startPosition
        )
        this.engine3D.registry.executeCommand(cmd)
        
        // Пробрасываем событие об обновлении параметров
        if (this.engine3D.registry.shapeSystem) {
          this.engine3D.registry.shapeSystem.notifyParamsChanged(this.dragObject)
        }
      }
      this.isDragging = false
      this.dragObject = null
    }

    if (this.engine3D && this.engine3D.cameraSystem3D.controls) {
      this.engine3D.cameraSystem3D.controls.enabled = true
    }
  }

  update() {}

  onKeyDown(event) {
    if (!this.engine3D) return

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.engine3D.selectionSystem3D.getSelected()) {
         this.engine3D.registry.emitUIUpdate('ui:deleteSelected')
      }
    }
    
    // Undo: Ctrl+Z (или Cmd+Z на Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      this.engine3D.registry.emitUIUpdate('ui:undo')
    }

    // Redo: Ctrl+Shift+Z (или Cmd+Shift+Z на Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
      this.engine3D.registry.emitUIUpdate('ui:redo')
    }

    // Redo: Ctrl+Y (альтернативный вариант)
    if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
      this.engine3D.registry.emitUIUpdate('ui:redo')
    }
  }

  dispose() {
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
    document.removeEventListener('keydown', this.onKeyDown)
  }
}