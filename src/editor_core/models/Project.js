import { v4 as uuidv4 } from 'uuid';
// поверхности
import { ConicalSurface } from '@/editor_core/models/surfaces/ConicalSurface'
import { CylindricalSurface } from '@/editor_core/models/surfaces/CylindricalSurface'
import { FlatSurface } from '@/editor_core/models/surfaces/FlatSurface'
// детали
import { StraightRandomDetail } from '@/editor_core/models/details/StraightRandomDetail'
import { SlopeRandomDetail } from '@/editor_core/models/details/SlopeRandomDetail'

export class Project {
  constructor() {
    this.project_data = [] 

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

  // десериализация данных проекта
  deserialize(jsonData) {
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
      this.project_data = parsed?.project_data || []
    } catch (error) {
      console.error('Ошибка десериализации проекта:', error)
      this.project_data = []
    }
  }

  // сериализация данных проекта
  serialize() {
    return JSON.stringify({
      project_data: this.project_data
    })
  }

  // очистить проект
  clear() {
    this.project_data = []
  }



  // ------------------------------- хелперы -------------------------------


  generateDetailSurfaceMeshes(type){
    const detailClass = this.detailClasses[type]
    const detail = detailClass.createDetail()
    const meshes = []
    for (const surface of detail.surfaces) {
      const surfaceClass = this.surfaceClasses[surface.type]
      let materials = []
      if (this.project_data?.data?.materials) {
        materials = this.project_data.data.materials
      } else {
        materials = [
          {
            id: "default",
            name: "default",
            color: "cccccc"
          }
        ]
      }
      let mesh = surfaceClass.generateMesh(surface, materials);
      meshes.push(mesh)
    }
    return meshes
  }
}