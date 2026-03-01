import * as THREE from 'three'
import { MoveShapeCommand } from '@/editor_core/3D_editor/commands/MoveShapeCommand'
// Импорт команды добавления связи
import { AddConnectionCommand } from '@/editor_core/3D_editor/commands/AddConnectionCommand'

export class InputSystem3D {
  constructor(container) {
    this.container = container
    this.engine3D = null  // Ссылка на движок будет установлена позже
    this.store = null  // Ссылка на Pinia store для обновления UI

    // Основные инструменты
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    // Плоскость, по которой будем тащить объект
    this.dragPlane = new THREE.Plane()
    this.planeIntersectPoint = new THREE.Vector3()
    
    // Состояние перетаскивания
    this.isDragging = false
    this.dragObject = null
    this.dragOffset = new THREE.Vector3()
    this.startPosition = new THREE.Vector3() 

    // Состояния для режима привязки (Connection Mode)
    this.isConnectingMode = false
    this.connectionStep = 0 // 0 = ждем родителя, 1 = ждем потомка
    this.parentEdgeData = null // Данные о первом клике
    this.hoveredEdgeData = null // Текущее наведенное ребро
    this.helpersGroup = new THREE.Group() // Группа для отрисовки подсветки ребер

    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)

    container.addEventListener('pointerdown', this.onPointerDown)
    container.addEventListener('pointermove', this.onPointerMove)
    container.addEventListener('pointerup', this.onPointerUp)
    document.addEventListener('keydown', this.onKeyDown)
  }

  setEngine(engine3D) {
    this.engine3D = engine3D
    // Добавляем группу хелперов на сцену
    if (this.engine3D && this.engine3D.sceneSystem3D) {
      this.engine3D.sceneSystem3D.scene.add(this.helpersGroup)
    }

    // Слушаем включение/выключение режима из UI
    this.engine3D.registry.emitter.on('mode:connecting', (isConnecting) => {
      this.isConnectingMode = isConnecting
      if (!isConnecting) this._resetConnectingMode()
    })
  }

  setStore(store) {
    this.store = store
  }

  updateMouse(event) {
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  onPointerDown(event) {
    if (!this.engine3D) return

    if (this.engine3D.viewCubeGizmo) {
      const handled = this.engine3D.viewCubeGizmo.handlePointer(
        event.clientX, 
        event.clientY, 
        this.container
      );
      if (handled) return;
    }

    this.updateMouse(event)

    // Логика клика в режиме связывания
    if (this.isConnectingMode) {
      if (this.hoveredEdgeData) {
        if (this.connectionStep === 0) {
          // Клик 1: Запоминаем ребро-Родитель
          this.parentEdgeData = this.hoveredEdgeData
          this.connectionStep = 1
          this._drawHelperLines() // Перерисуем, чтобы зафиксировать цвет
        } else if (this.connectionStep === 1) {
          // Клик 2: Ребро-Потомок. Проверяем, что не кликнули на ту же фигуру
          if (this.parentEdgeData.shapeId === this.hoveredEdgeData.shapeId) return

          // Формируем команду создания связи
          const connInfo = {
            id: THREE.MathUtils.generateUUID(),
            type: 'EDGE_TO_EDGE',
            parentId: this.parentEdgeData.shapeId,
            parentEdgeIndex: this.parentEdgeData.edgeIndex,
            childId: this.hoveredEdgeData.shapeId,
            childEdgeIndex: this.hoveredEdgeData.edgeIndex
          }

          const cmd = new AddConnectionCommand(connInfo)
          this.engine3D.registry.executeCommand(cmd)

          // Сбрасываем режим и обновляем UI
          if (this.store) this.store.toggleConnectMode()
          this._resetConnectingMode()
        }
      }
      return // В режиме связывания обычное выделение не работает
    }

    // Обычная логика выделения и перетаскивания
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

    // Логика подсветки (hover) ребер в режиме связывания
    if (this.isConnectingMode) {
      this.raycaster.setFromCamera(this.mouse, this.engine3D.cameraSystem3D.camera)
      const intersects = this.raycaster.intersectObjects(this.engine3D.sceneSystem3D.scene.children)
        .filter(hit => hit.object.userData.selectable)

      if (intersects.length > 0) {
        const hit = intersects[0]
        // Ищем ближайшее ребро к точке попадания луча
        this.hoveredEdgeData = this._getClosestEdge(hit.point, hit.object)
      } else {
        this.hoveredEdgeData = null
      }
      this._drawHelperLines()
      return // Обычный hover блокируется
    }

    if (this.isDragging && this.dragObject) {
      this.raycaster.setFromCamera(this.mouse, this.engine3D.cameraSystem3D.camera)

      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
        const newPos = new THREE.Vector3().addVectors(this.planeIntersectPoint, this.dragOffset)
        this.dragObject.position.copy(newPos)
      }
    } else {
      this.raycaster.setFromCamera(this.mouse, this.engine3D.cameraSystem3D.camera)
      const intersects = this.raycaster.intersectObjects(this.engine3D.sceneSystem3D.scene.children)
        .filter(hit => hit.object.userData.selectable)

      if (intersects.length > 0) {
        const hoveredObject = intersects[0].object
        this.engine3D.selectionSystem3D.setHovered(hoveredObject)
      } else {
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

  onKeyDown(event) {
    if (!this.engine3D) return
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.engine3D.selectionSystem3D.getSelected()) {
         this.engine3D.registry.emitUIUpdate('ui:deleteSelected')
      }
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      this.engine3D.registry.emitUIUpdate('ui:undo')
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
      this.engine3D.registry.emitUIUpdate('ui:redo')
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
      this.engine3D.registry.emitUIUpdate('ui:redo')
    }
  }

  dispose() {
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
    document.removeEventListener('keydown', this.onKeyDown)
    this._resetConnectingMode()
  }

  // ================= Вспомогательные методы для связей =================

  // Вычисляет ближайшее ребро к точке клика
  _getClosestEdge(hitPoint, mesh) {
    const ent = this.engine3D.registry.shapeSystem.getByMesh(mesh)
    if (!ent || !ent.owner) return null

    const edges = ent.owner.getBoundaryEdges()
    let closestEdge = null
    let minDistance = Infinity

    edges.forEach(edgeLocal => {
      const edgeWorld = ent.owner.getWorldEdge(edgeLocal.index, mesh)
      if (!edgeWorld) return

      const pts = edgeWorld.points3D
      // Проверяем расстояние от точки пересечения до каждого отрезка ребра
      for (let i = 0; i < pts.length - 1; i++) {
        const line = new THREE.Line3(pts[i], pts[i+1])
        const closestPt = new THREE.Vector3()
        line.closestPointToPoint(hitPoint, true, closestPt)
        const dist = closestPt.distanceTo(hitPoint)

        if (dist < minDistance) {
          minDistance = dist
          closestEdge = edgeWorld
        }
      }
    })

    // Порог чувствительности (можно менять)
    if (minDistance < 2.0) {
      return { shapeId: mesh.uuid, edgeIndex: closestEdge.index, edge: closestEdge, mesh }
    }
    return null
  }

  // Отрисовывает подсветку для выбранного и наведенного ребра
  _drawHelperLines() {
    this.helpersGroup.clear()

    // Функция создания линии
    const createLine = (edgeData, color) => {
      if (!edgeData) return
      const pts = edgeData.edge.points3D
      const geometry = new THREE.BufferGeometry().setFromPoints(pts)
      const material = new THREE.LineBasicMaterial({ color, linewidth: 3, depthTest: false })
      const line = new THREE.Line(geometry, material)
      line.renderOrder = 999 // Поверх всего
      this.helpersGroup.add(line)
    }

    // Зеленая линия — уже зафиксированный родитель
    if (this.parentEdgeData) {
      // Обновляем координаты на случай, если фигура сдвинулась
      const ent = this.engine3D.registry.shapeSystem.getByMesh(this.parentEdgeData.mesh)
      if (ent) {
        this.parentEdgeData.edge = ent.owner.getWorldEdge(this.parentEdgeData.edgeIndex, this.parentEdgeData.mesh)
        createLine(this.parentEdgeData, 0x00ff00)
      }
    }

    // Синяя линия — текущее наведенное ребро
    if (this.hoveredEdgeData && (!this.parentEdgeData || this.parentEdgeData.shapeId !== this.hoveredEdgeData.shapeId)) {
      createLine(this.hoveredEdgeData, 0x0000ff)
    }
  }

  _resetConnectingMode() {
    this.isConnectingMode = false
    this.connectionStep = 0
    this.parentEdgeData = null
    this.hoveredEdgeData = null
    this.helpersGroup.clear()
  }
}