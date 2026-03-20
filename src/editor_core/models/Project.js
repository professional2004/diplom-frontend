// поверхности
import { ConicalSurface } from '@/editor_core/models/surfaces/ConicalSurface'
import { CylindricalSurface } from '@/editor_core/models/surfaces/CylindricalSurface'
import { FlatSurface } from '@/editor_core/models/surfaces/FlatSurface'
// детали
import { StraightRandomDetail } from '@/editor_core/models/details/StraightRandomDetail'
import { SlopeRandomDetail } from '@/editor_core/models/details/SlopeRandomDetail'

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





  // создать деталь
  createDetail(type) {
    // создание данных детали
    const detailClass = this.detailClasses[type]
    const detail = detailClass.create()

    // регистрация
    if (!this.project_data.entities) {
      this.project_data.entities = {
        details: []
      }
    }
    this.project_data.entities.details.push(detail)

    // генерация мешей
    const meshes = this.generateDetailMeshes(detail)

    return meshes
  }


  // сгенерировать меши поверхностей детали
  generateDetailMeshes(detail) {
    const meshes = []
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
      let mesh = surfaceClass.generateMesh(surface, materials);
      meshes.push(mesh)
    }

    return meshes
  }


}