import { watch } from 'vue'
import { Project } from '@/editor_core/models/Project'
// 2D системы
import { CameraSystem2D } from '@/editor_core/engine/scene2D/CameraSystem2D'
import { InteractionSystem2D } from '@/editor_core/engine/scene2D/InteractionSystem2D'
import { RenderSystem2D } from '@/editor_core/engine/scene2D/RenderSystem2D'
import { SceneSystem2D } from '@/editor_core/engine/scene2D/SceneSystem2D'
// 3D системы
import { CameraSystem3D } from '@/editor_core/engine/scene3D/CameraSystem3D'
import { InteractionSystem3D } from '@/editor_core/engine/scene3D/InteractionSystem3D'
import { RenderSystem3D } from '@/editor_core/engine/scene3D/RenderSystem3D'
import { SceneSystem3D } from '@/editor_core/engine/scene3D/SceneSystem3D'
// мини системы
import { CameraSystemMini2D } from '@/editor_core/engine/sceneMini/CameraSystemMini2D'
import { InteractionSystemMini2D } from '@/editor_core/engine/sceneMini/InteractionSystemMini2D'
import { RenderSystemMini2D } from '@/editor_core/engine/sceneMini/RenderSystemMini2D'
import { SceneSystemMini2D } from '@/editor_core/engine/sceneMini/SceneSystemMini2D'
// Хелперы
import { MiniPolylineEditor } from '@/editor_core/utils/editor_helpers/MiniPolylineEditor'
import { GeneratePreviewHelper } from '@/editor_core/utils/project_helpers/GeneratePreviewHelper'
import { ExportUnfoldingsSVGHelper } from '@/editor_core/utils/project_helpers/ExportUnfoldingsSVGHelper'
import { ExportUnfoldingsPDFHelper } from '@/editor_core/utils/project_helpers/ExportUnfoldingsPDFHelper'
import * as THREE from 'three'

export class Engine {
  constructor(store, container2D, container3D, containerMini) {
    this.store = store
    this.container2D = container2D
    this.container3D = container3D
    this.containerMini = containerMini

    // Инициализация систем 2D
    this.cameraSystem2D = new CameraSystem2D(this.container2D)
    this.interactionSystem2D = new InteractionSystem2D(this.container2D)
    this.renderSystem2D = new RenderSystem2D(this.container2D)
    this.sceneSystem2D = new SceneSystem2D()

    this.renderSystem2D.onResize = (w, h) => {
      this.cameraSystem2D.setAspect(w, h)
      this.renderSystem2D.setSize(w, h)
    }

    // Установить ссылки на движок и store
    this.interactionSystem2D.setEngine(this, this.store)
    this.renderSystem2D.setEngine(this)

    this.systems2D = [
      this.cameraSystem2D,
      this.interactionSystem2D,
      this.renderSystem2D, 
      this.sceneSystem2D
    ]

    // Инициализация систем 3D
    this.cameraSystem3D = new CameraSystem3D(this.container3D)
    this.interactionSystem3D = new InteractionSystem3D(this.container3D)
    this.renderSystem3D = new RenderSystem3D(this.container3D)
    this.sceneSystem3D = new SceneSystem3D()

    this.renderSystem3D.onResize = (w, h) => {
      this.cameraSystem3D.setAspect(w, h)
      this.renderSystem3D.setSize(w, h)
    }

    // Установить ссылки на движок и store
    this.interactionSystem3D.setEngine(this, this.store)
    this.renderSystem3D.setEngine(this)
    this.sceneSystem3D.setEngine(this)

    this.systems3D = [
      this.cameraSystem3D,
      this.interactionSystem3D,
      this.renderSystem3D, 
      this.sceneSystem3D
    ]

    // Инициализация систем мини
    this.cameraSystemMini2D = new CameraSystemMini2D(this.containerMini)
    this.interactionSystemMini2D = new InteractionSystemMini2D(this.containerMini)
    this.renderSystemMini2D = new RenderSystemMini2D(this.containerMini)
    this.sceneSystemMini2D = new SceneSystemMini2D()

    this.renderSystemMini2D.onResize = (w, h) => {
      this.cameraSystemMini2D.setAspect(w, h)
      this.renderSystemMini2D.setSize(w, h)
    }

    this.systemsMini = [
      this.cameraSystemMini2D,
      this.interactionSystemMini2D,
      this.renderSystemMini2D, 
      this.sceneSystemMini2D
    ]

    // Установить ссылки на движок и store
    this.interactionSystemMini2D.setEngine(this, this.store)
    this.renderSystemMini2D.setEngine(this)

    // Итоговая инициализация и задание состояния движка
    this.systems = [
      this.systems2D,
      this.systems3D,
      this.systemsMini
    ]

    // создает модель данных проекта
    this.project = new Project()

    // мини-редактор полилинии
    this.miniPolylineEditor = new MiniPolylineEditor()
    this.miniSelectedDetailId = null

    // подписываемся на изменения в editorStore
    watch(() => this.store.scene3DState, () => { this.onScene3DStateChanged()})
    watch(() => this.store.scene3DSettings, () => { this.onScene3DSettingsChanged()})
    watch(() => this.store.scene2DState, () => { this.onScene2DStateChanged()})
    watch(() => this.store.sceneMiniState, () => { this.onSceneMiniStateChanged()})

    this.running = true
    this.loop = this.loop.bind(this)
    requestAnimationFrame(this.loop)
  }

  loop() {
    if (!this.running) return
    for (const systemList of this.systems) {
      for (const system of systemList) {
        if (typeof system.update === 'function') system.update(this)
      }
    }
    requestAnimationFrame(this.loop)
  }

  dispose() {
    this.running = false
    for (const systemList of this.systems) {
      for (const system of systemList) {
        system.dispose?.()
      }
    }
  }


  // ----------- функции над проектом -----------


  // развернуть проект
  deserializeProject(project) {
    this.project.setProjectData(project)
    this.buildDetails()
  }

  // запаковать проект
  serializeProject() {
    return JSON.stringify(this.project.getProjectData())
  }

  // построить все детали
  buildDetails() {
    const details = this.project.getDetails()
    if (details) {
      for (const detail of details) {
        const { surfaceMeshes, unfoldingMeshes } = this.project.generateDetailMeshes(detail)
        for (const surfaceMesh of surfaceMeshes) {
          this.sceneSystem3D.add(surfaceMesh)
        }
        for (const unfoldingMesh of unfoldingMeshes) {
          this.sceneSystem2D.add(unfoldingMesh)
        }
      }      
    }
    this.restoreStoreDetails()
    this.restoreStoreMaterials()
  }


  // сгенерировать превью
  generateProjectPreview() {
    return GeneratePreviewHelper.help(this.sceneSystem3D)
  }



  // очистить проект
  clearProject() {
    this.project.clearProjectData()
    this.sceneSystem3D.clearObjects()
    this.sceneSystem2D.clearObjects()
    this.restoreStoreDetails()
    this.store.setIsUnsaved(true)
  }

  // экспортировать в SVG
  exportProjectUnfoldingsSVG() {
    const unfoldings = this.project.getUnfoldings()
    const materials = this.project.getMaterials()
    const projectName = this.project.getProjectName()
    ExportUnfoldingsSVGHelper.help(unfoldings, materials, projectName)
  }

  // экспортировать в PDF
  exportProjectUnfoldingsPDF() {
    const unfoldings = this.project.getUnfoldings()
    const materials = this.project.getMaterials()
    const projectName = this.project.getProjectName()
    ExportUnfoldingsPDFHelper.help(unfoldings, materials, projectName)
  }



  // ----------- функции проекта -----------

  // зум и сброс сцены
  zoomIn3D() { this.cameraSystem3D.zoom(true) }
  zoomOut3D() { this.cameraSystem3D.zoom(false) }
  resetView3D() { this.cameraSystem3D.reset() }
  zoomIn2D() { this.cameraSystem2D.zoom(true) }
  zoomOut2D() { this.cameraSystem2D.zoom(false) }
  resetView2D() { this.cameraSystem2D.reset() }

  // добавить деталь
  addDetail(type) {
    const detail = this.project.createDetail(type)
    this.project.registerDetail(detail)

    const { surfaceMeshes, unfoldingMeshes } = this.project.generateDetailMeshes(detail)
    for (const surfaceMesh of surfaceMeshes) {
      this.sceneSystem3D.add(surfaceMesh)
    }
    for (const unfoldingMesh of unfoldingMeshes) {
      this.sceneSystem2D.add(unfoldingMesh)
    }
    this.restoreStoreDetails()
    this.restoreStoreMaterials()
    this.store.setIsUnsaved(true)
  }



  // ------- функции над материалами -------

  createMaterial() {
    this.project.createMaterial()
    this.restoreStoreMaterials()
    this.store.setIsUnsaved(true)
  }

  renameMaterial(id, name) {
    this.project.renameMaterial(id, name)
    this.restoreStoreMaterials()
    this.store.setIsUnsaved(true)
  }

  changeMaterialColor(id, color) {
    this.project.changeMaterialColor(id, color)
    this.restoreStoreMaterials()
    this.store.setIsUnsaved(true)
  }

  deleteMaterial(id) {
    this.project.deleteMaterial(id)
    this.restoreStoreMaterials()
    this.store.setIsUnsaved(true)
  }









  
  // ----------- обработчики изменения состояний store -----------

  // обновить details в store
  restoreStoreDetails() {
    const detailsToStore = []
    const details = this.project.getDetails()
    if (!details) { return }
    for (const detail of details) {
      const detailToStore = {
        id: detail.id,
        surfaces: []
      }
      for (const surface of detail.surfaces) {
        detailToStore.surfaces.push({ id: surface.id })
      }
      detailsToStore.push(detailToStore)
    }
    this.store.setDetails(detailsToStore)
  }

  // обновить materials в store
  restoreStoreMaterials() {
    this.store.setMaterials(this.project.getMaterials())
  }



  // Обработчики событий из InteractionSystems 

  // 3D-сцена

  onScene3DStateChanged() {
    this.hoverAndSelectObjectsScene3D()
    const { selectedThing } = this.store.getScene3DState()
    if (selectedThing && selectedThing.class === 'detail') {
      this.setMiniPolylineFromDetail(selectedThing.id)
    } else {
      this.clearMiniPolyline()
    }
  }

  onScene3DSettingsChanged() {
    this.interactionSystem3D.resetInteraction()
    this.onScene3DStateChanged()
  }


  hoverAndSelectObjectsScene3D() {
    const { pointeredThing, selectedThing } = this.store.getScene3DState()
    if (pointeredThing) {
      this.sceneSystem3D.setHightlightForHoveredObject(pointeredThing)
    } else {
      this.sceneSystem3D.clearHightlightForHoveredObject()
    }
    if (selectedThing) {
      this.sceneSystem3D.setHightlightForSelectedObject(selectedThing)
    } else {
      this.sceneSystem3D.clearHightlightForSelectedObject()
    }
  }

  setMiniPolylineFromDetail(detailId) {
    const details = this.project.getDetails() || []
    const detail = details.find(d => d.id === detailId)
    if (!detail || !detail.parameters || !detail.parameters.shape_polyline) {
      this.clearMiniPolyline()
      return
    }

    this.miniSelectedDetailId = detailId
    this.miniPolylineEditor.setPoints(detail.parameters.shape_polyline.points)
    this.updateMiniSceneFromPolyline()
  }

  clearMiniPolyline() {
    this.miniSelectedDetailId = null
    this.miniPolylineEditor.clear()
    this.sceneSystemMini2D.clearObjects()
  }

  updateMiniSceneFromPolyline() {
    this.sceneSystemMini2D.clearObjects()

    const points = this.miniPolylineEditor.getPoints()
    if (!points.length) return

    // рисуем линию
    if (points.length >= 2) {
      const linePoints = points.map(p => new THREE.Vector3(p.x, p.y, 0))
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints)
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00aa00 })
      const line = new THREE.Line(lineGeometry, lineMaterial)
      line.userData = { id: 'mini-polyline', class: 'mini-polyline', selectable: false }
      this.sceneSystemMini2D.add(line)
    }

    // рисуем контролы для точек
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      const sphereGeometry = new THREE.SphereGeometry(0.2, 12, 8)
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff })
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
      sphere.position.set(p.x, p.y, 0)
      sphere.userData = { id: i, class: 'mini-control-point', selectable: true }
      this.sceneSystemMini2D.add(sphere)
    }
  }

  applyMiniPolylineChanges() {
    if (!this.miniSelectedDetailId) return
    const details = this.project.getDetails() || []
    const detail = details.find(d => d.id === this.miniSelectedDetailId)
    if (!detail) return

    const points = this.miniPolylineEditor.getPoints().map(p => ({ x: p.x, y: p.y }))
    detail.parameters = detail.parameters || {}
    detail.parameters.shape_polyline = detail.parameters.shape_polyline || {}
    detail.parameters.shape_polyline.points = points

    const detailClass = this.project.detailClasses[detail.type]
    if (detailClass && typeof detailClass.calculateSurfaces === 'function') {
      detail.surfaces = detailClass.calculateSurfaces(detail.parameters)
    }

    this.sceneSystem3D.clearObjects()
    this.sceneSystem2D.clearObjects()
    this.buildDetails()
    this.store.setIsUnsaved(true)

    this.onScene3DStateChanged()
  }

  onMiniPointDragged(index, worldPos) {
    this.miniPolylineEditor.movePoint(index, worldPos)
    this.updateMiniSceneFromPolyline()
    this.applyMiniPolylineChanges()
  }

  onMiniPointRemoved(index) {
    const removed = this.miniPolylineEditor.removePoint(index)
    if (!removed) return
    this.updateMiniSceneFromPolyline()
    this.applyMiniPolylineChanges()
  }

  onMiniPointAdded(worldPos) {
    this.miniPolylineEditor.addPointAtNearestSegment(worldPos)
    this.updateMiniSceneFromPolyline()
    this.applyMiniPolylineChanges()
  }

  // 2D-сцена

  onScene2DStateChanged() {

  }

  // мини-сцена

  onSceneMiniStateChanged() {

  }

}
