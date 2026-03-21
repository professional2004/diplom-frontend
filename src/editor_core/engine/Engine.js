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
import { GeneratePreviewHelper } from '@/editor_core/utils/project_helpers/GeneratePreviewHelper'
import { ExportUnfoldingsSVGHelper } from '@/editor_core/utils/project_helpers/ExportUnfoldingsSVGHelper'
import { ExportUnfoldingsPDFHelper } from '@/editor_core/utils/project_helpers/ExportUnfoldingsPDFHelper'

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

    // подписываемся на изменения в editorStore
    watch(() => this.store.scene3DState, () => { this.onScene3DInteractionChanged()})
    watch(() => this.store.scene2DState, () => { this.onScene2DInteractionChanged()})
    watch(() => this.store.sceneMiniState, () => { this.onSceneMiniInteractionChanged()})

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
    this.buildProject()
  }

  // запаковать проект
  serializeProject() {
    return JSON.stringify(this.project.getProjectData())
  }

  // построить все детали
  buildProject() {
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
    this.store.getIsUnsaved(true)
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
    this.store.getIsUnsaved(true)
  }






  
  // ----------- обработчики изменения состояний store -----------

  restoreStoreDetails() {
    // обновить details в store
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



  // Обработчики событий из InteractionSystems 

  onScene3DInteractionChanged() {
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

  onScene2DInteractionChanged() {

  }

  onSceneMiniInteractionChanged() {

  }
}
