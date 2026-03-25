import * as THREE from 'three'
import _ from 'lodash'

export class InteractionSystem3D {
  constructor(container) {
    this.store = null
    this.engine = null
    this.container = container
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.pointeredThing = null
    this.selectedThing = null
    // вспомогательные временные переменные
    this.pointeredAtPointerDownThing = null

    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)

    container.addEventListener('pointerdown', this.onPointerDown)
    container.addEventListener('pointermove', this.onPointerMove)
    container.addEventListener('pointerup', this.onPointerUp)
  }

  setEngine(engine, store) { 
    this.engine = engine 
    this.store = store
  }


  // Вспомогательный метод обновления координат мыши
  updateMouse(event) {
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  // Возвращает id детали по id поверхности
  getDetailIdBySurfaceId(surfaceId) {
    if (!surfaceId || !this.engine?.project?.getDetails) return null

    const details = this.engine.project.getDetails() || []
    for (const detail of details) {
      if (detail?.surfaces?.some(surface => surface?.id === surfaceId)) {
        return detail.id
      }
    }
    return null
  }

  getIntersectedObject() {
    const selectingMode = this.store.getScene3DSettings().selectingMode || 'surface'

    this.raycaster.setFromCamera(this.mouse, this.engine.cameraSystem3D.getCamera())
    const objects = this.engine.sceneSystem3D.getObjects()
    const intersects = this.raycaster.intersectObjects(objects).filter(hit => hit.object.userData?.selectable)

    if (intersects.length === 0) {
      return null
    }

    const hit = intersects[0]
    const surfaceId = hit.object.userData?.id
    const surfaceClass = hit.object.userData?.class

    if (selectingMode === 'detail') {
      // получаем id родительской детали
      if (surfaceClass === 'surface') {
        const detailId = this.getDetailIdBySurfaceId(surfaceId)
        return detailId ? { id: detailId, class: 'detail' } : { id: surfaceId, class: 'surface' }
      }
      // если по какой-то причине попалось не surface, возвращаем исходный id
      return { id: surfaceId, class: surfaceClass || 'surface' }
    }
    return { id: surfaceId, class: surfaceClass || 'surface' }
  }

  onPointerDown(event) {
    this.updateMouse(event)
    this.pointeredThing = this.getIntersectedObject()
    this.pointeredAtPointerDownThing = this.pointeredThing
    this.selectedThing = this.pointeredThing
    this.updateStore()
  }

  onPointerMove(event) {
    this.updateMouse(event)
    this.pointeredThing = this.getIntersectedObject()
    this.updateStore()
  }

  onPointerUp(event) {
    this.updateMouse(event)
    this.pointeredThing = this.getIntersectedObject()
    if (!_.isEqual(this.pointeredAtPointerDownThing, this.pointeredThing)) { this.selectedThing = null }
    this.pointeredAtPointerDownThing = null
    this.updateStore()
  }

  // сбросить наведение и выделение фигур
  resetInteraction() { 
    this.pointeredThing = null
    this.selectedThing = null
    this.pointeredAtPointerDownThing = null
    this.updateStore()
  }

  // обновить состояние store
  updateStore() { 
    this.store.setScene3DState({
      pointeredThing: this.pointeredThing,
      selectedThing: this.selectedThing
    })
  }

  dispose() {
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
  }
}