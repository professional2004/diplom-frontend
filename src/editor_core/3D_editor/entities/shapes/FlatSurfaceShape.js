import { UnfoldTextureGenerator } from '@/editor_core/2D_editor/utils/UnfoldTextureGenerator'
import * as THREE from 'three'

export class FlatSurfaceShape {
  constructor(params = {}) {
    this.params = { ...this.defaultParams, ...params }
  }

  get defaultParams() {
    return {
      width: 2,
      height: 1.5,
      // polygon по умолчанию — прямоугольник, совпадающий с ограничивающим прямоугольником
      polygon: [
        [-1, -0.75],
        [1, -0.75],
        [1, 0.75],
        [-1, 0.75]
      ],
      posX: 0,
      posY: 0,
      posZ: 0,
      rotationX: -Math.PI / 2,
      rotationY: 0,
      rotationZ: 0
    }
  }

  get parameterDefinitions() {
    return {
      width: { label: 'Ширина', type: 'number', min: 0.001, step: 0.01 },
      height: { label: 'Высота', type: 'number', min: 0.001, step: 0.01 },
      polygon: { label: 'Ограничивающий многоугольник', type: 'object' },
      posX: { label: 'Позиция X', type: 'number', step: 0.1 },
      posY: { label: 'Позиция Y', type: 'number', step: 0.1 },
      posZ: { label: 'Позиция Z', type: 'number', step: 0.1 },
      rotationX: { label: 'Поворот X (рад)', type: 'number', step: 0.1 },
      rotationY: { label: 'Поворот Y (рад)', type: 'number', step: 0.1 },
      rotationZ: { label: 'Поворот Z (рад)', type: 'number', step: 0.1 }
    }
  }

  _normalizePolygon(polygon, width, height) {
    const allBetween0and1 = polygon.every(p => p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1)
    if (allBetween0and1) {
      return polygon.map(p => [
        (p[0] - 0.5) * width,
        (p[1] - 0.5) * height
      ])
    }
    return polygon
  }

  createMesh() {
    const { width, height } = this.params
    const polygonRaw = (this.params.polygon || []).slice()
    const polygon = this._normalizePolygon(polygonRaw, width, height)

    // Создаём THREE.Shape из polygon
    const shape = new THREE.Shape()
    if (!polygon || polygon.length < 3) {
      // fallback — прямоугольник
      const hw = width / 2, hh = height / 2
      shape.moveTo(-hw, -hh)
      shape.lineTo(hw, -hh)
      shape.lineTo(hw, hh)
      shape.lineTo(-hw, hh)
      shape.closePath()
    } else {
      shape.moveTo(polygon[0][0], polygon[0][1])
      for (let i = 1; i < polygon.length; i++) {
        shape.lineTo(polygon[i][0], polygon[i][1])
      }
      shape.closePath()
    }

    // Используем ShapeGeometry для создания истинной 2D-плоскости в 3D
    const geom = new THREE.ShapeGeometry(shape)
    geom.computeVertexNormals()

    const mat = this.getStandardMaterial()
    mat.side = THREE.DoubleSide // Важно, чтобы поверхность была видна с обеих сторон

    const mesh = new THREE.Mesh(geom, mat)

    mesh.userData.owner = this 
    
    mesh.userData.shapeType = 'flat'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    // Применяем позицию и ротацию
    const posX = this.params.posX ?? 0
    const posY = this.params.posY ?? 0
    const posZ = this.params.posZ ?? 0
    
    const rotX = this.params.rotationX ?? -Math.PI / 2
    const rotY = this.params.rotationY ?? 0
    const rotZ = this.params.rotationZ ?? 0
    
    mesh.position.set(posX, posY, posZ)
    mesh.rotation.set(rotX, rotY, rotZ, 'XYZ')

    return mesh
  }

  createUnfold2D() {
    const { width, height } = this.params
    const polygonArray = this._normalizePolygon(this.params.polygon || this.defaultParams.polygon, width, height)
    
    if (!polygonArray || polygonArray.length < 3) return new THREE.Mesh()
    
    const polygon = polygonArray.map(p => new THREE.Vector2(p[0], p[1]))

    // Плоская деталь не имеет линий сгиба
    return UnfoldTextureGenerator.createMeshWithTexture(polygon, []) 
  }

  getBoundaryEdges() {
    const { width, height } = this.params
    const polygonRaw = (this.params.polygon || []).slice()
    const polygon = this._normalizePolygon(polygonRaw, width, height)
    const edges = []
    
    if (!polygon || polygon.length < 3) return edges

    for (let i = 0; i < polygon.length; i++) {
      const nextI = (i + 1) % polygon.length
      
      // Создаем 3D точки (в локальной системе координат плоскости)
      const p1 = new THREE.Vector3(polygon[i][0], polygon[i][1], 0)
      const p2 = new THREE.Vector3(polygon[nextI][0], polygon[nextI][1], 0)
      
      edges.push({
        id: `flat_edge_${i}`,
        index: i,
        points3D: [p1, p2],
        length: p1.distanceTo(p2)
      })
    }
    
    return edges
  }
  
  
  // --------- общие для shapes методы ----------

  // Применяет позицию и ротацию к меше на основе параметров
  applyTransformToMesh(mesh) {
    if (!mesh) return

    // Применяем позицию
    const posX = this.params.posX ?? 0
    const posY = this.params.posY ?? mesh.position.y // сохраняем оригинальное Y если не заданы параметры
    const posZ = this.params.posZ ?? 0

    mesh.position.set(posX, posY, posZ)

    // Применяем ротацию
    const rotX = this.params.rotationX ?? 0
    const rotY = this.params.rotationY ?? 0
    const rotZ = this.params.rotationZ ?? 0

    mesh.rotation.set(rotX, rotY, rotZ, 'XYZ')
  }

  // Вспомогательный метод для материалов
  getStandardMaterial() {
    return new THREE.MeshStandardMaterial({ 
      color: Math.random() * 0xffffff,
      metalness: 0.1,
      roughness: 0.5
    })
  }

  getLineMaterial() {
    return new THREE.LineBasicMaterial({ color: 0x333333 })
  }
}