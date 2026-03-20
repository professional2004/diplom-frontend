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
// Хелперы
import { GeneratePreviewHelper } from '@/editor_core/utils/project_helpers/GeneratePreviewHelper'
import { ExportUnfoldingsSVGHelper } from '@/editor_core/utils/project_helpers/ExportUnfoldingsSVGHelper'
import { ExportUnfoldingsPDFHelper } from '@/editor_core/utils/project_helpers/ExportUnfoldingsPDFHelper'

export class Engine {
  constructor(container2D, container3D) {
    this.container2D = container2D
    this.container3D = container3D

    // Инициализация систем 2D
    this.cameraSystem2D = new CameraSystem2D(this.container2D)
    this.interactionSystem2D = new InteractionSystem2D(this, this.container2D)
    this.renderSystem2D = new RenderSystem2D(this, this.container2D)
    this.sceneSystem2D = new SceneSystem2D()

    this.renderSystem2D.onResize = (w, h) => {
      this.cameraSystem2D.setAspect(w, h)
      this.renderSystem2D.setSize(w, h)
    }

    this.systems2D = [
      this.cameraSystem2D,
      this.interactionSystem2D,
      this.renderSystem2D, 
      this.sceneSystem2D
    ]

    // Инициализация систем 3D
    this.cameraSystem3D = new CameraSystem3D(this.container3D)
    this.interactionSystem3D = new InteractionSystem3D(this, this.container3D)
    this.renderSystem3D = new RenderSystem3D(this, this.container3D)
    this.sceneSystem3D = new SceneSystem3D()

    this.renderSystem3D.onResize = (w, h) => {
      this.cameraSystem3D.setAspect(w, h)
      this.renderSystem3D.setSize(w, h)
    }

    this.systems3D = [
      this.cameraSystem3D,
      this.interactionSystem3D,
      this.renderSystem3D, 
      this.sceneSystem3D
    ]

    // Итоговая инициализация и задание состояния движка
    this.systems = [
      this.systems2D,
      this.systems3D
    ]

    this.project = new Project()

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
  }


}
