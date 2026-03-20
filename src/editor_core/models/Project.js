// поверхности
import { ConicalSurface } from '@/editor_core/models/surfaces/ConicalSurface'
import { CylindricalSurface } from '@/editor_core/models/surfaces/CylindricalSurface'
import { FlatSurface } from '@/editor_core/models/surfaces/FlatSurface'
// детали
import { StraightRandomDetail } from '@/editor_core/models/details/StraightRandomDetail'
import { SlopeRandomDetail } from '@/editor_core/models/details/SlopeRandomDetail'
// развертки
import { Unfolding } from '@/editor_core/models/unfoldings/Unfolding'

export class Project {
  constructor() {
    this.project_data = {}

    // инициализация классов поверхностей
    this.conicalSurface = new ConicalSurface()
    this.cylindricalSurface = new CylindricalSurface()
    this.flatSurface = new FlatSurface()

    this.surfaceClasses = {
      "conical": this.conicalSurface,
      "cylindrical": this.cylindricalSurface,
      "flat": this.flatSurface,
    }

    // инициализация классов деталей
    this.straightRandomDetail = new StraightRandomDetail()
    this.slopeRandomDetail = new SlopeRandomDetail()

    this.detailClasses = {
      "straight_random": this.straightRandomDetail,
      "slope_random": this.slopeRandomDetail,
    }

    // инициализация разверток
    this.unfoldingClass = new Unfolding()
  }

  // установить данные проекта
  setProjectData(projectData) {
    this.project_data = projectData
  }

  // получить данные проекта
  getProjectData() {
    return this.project_data
  }

  // очистить данные проекта
  clearProjectData() {
    this.project_data = {}
  }

  // ----- геттеры -----
  getDetails() { return this.project_data?.entities?.details }
  getMaterials() { return this.project_data?.materials }





  // создание данных детали
  createDetail(type) {
    const detailClass = this.detailClasses[type]
    const detail = detailClass.create()
    return detail
  }

  // зарегистрировать деталь
  registerDetail(detail) {
    if (!this.project_data.entities) {
      this.project_data.entities = {
        details: []
      }
    }
    this.project_data.entities.details.push(detail)
  }


  // сгенерировать меши поверхностей и разверток детали
  generateDetailMeshes(detail) {
    const surfaceMeshes = []
    const unfoldingMeshes = []
    if (!this.project_data.materials) {
      this.project_data.materials = [
        {
          id: "default",
          name: "default",
          color: "cccccc"
        }
      ]
    }
    const materials = this.project_data.materials
    for (const surface of detail.surfaces) {
      const surfaceClass = this.surfaceClasses[surface.type]
      let surfaceMesh = surfaceClass.generateMesh(surface, materials);
      surfaceMeshes.push(surfaceMesh)
      let unfoldingMesh = this.unfoldingClass.generateMesh(surface.unfolding, materials);
      unfoldingMeshes.push(unfoldingMesh)
    }

    return { surfaceMeshes, unfoldingMeshes }
  }


}