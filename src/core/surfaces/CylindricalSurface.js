import * as THREE from 'three'
import { BaseSurface } from './BaseSurface'
import { BezierCurve } from '@/core/curves/BezierCurve'

export class CylindricalSurface extends BaseSurface {
  get defaultParams() {
    return {
      baseCurveData: null,
      height: 3,
      radialSegments: 64
    }
  }

  static createDefaultBaseCurve() {
    const points = []
    const segments = 12
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector2(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5))
    }
    return new BezierCurve(points, true)
  }

  constructor(params = {}) {
    super(params)
    if (params.baseCurve instanceof BezierCurve) {
      this.baseCurve = params.baseCurve.clone()
    } else if (this.params.baseCurveData) {
      this.baseCurve = BezierCurve.fromJSON(this.params.baseCurveData)
    } else {
      this.baseCurve = CylindricalSurface.createDefaultBaseCurve()
    }
    this.params.baseCurveData = this.baseCurve.toJSON()
  }

  // --- Математика проецирования ---

  mapUVTo3D(u, v) {
      // u: координата X на развертке (соответствует длине дуги основания)
      // v: координата Y на развертке (соответствует высоте Y в 3D)
      
      const height = this.params.height
      const halfHeight = height / 2
      
      // Находим точку на кривой основания, соответствующую длине дуги u
      // Для замкнутой кривой u может быть больше периметра, BezierCurve.getPointAtDist это обрабатывает
      const basePoint = this.baseCurve.getPointAtDist(u)
      
      // Формируем 3D точку: x,z из кривой, y из v (с учетом центрирования)
      // Развертка идет от 0 до height по Y. В сцене от -half до +half
      return new THREE.Vector3(basePoint.x, v - halfHeight, basePoint.y)
  }

  getUnfoldOutline() {
      // Для цилиндра развертка - это прямоугольник
      const perimeter = this.baseCurve.getLength()
      const h = this.params.height
      return [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(perimeter, 0),
          new THREE.Vector2(perimeter, h),
          new THREE.Vector2(0, h)
      ]
  }

  // --- Стандартные методы ---

  createMesh() {
    const { height, radialSegments } = this.params
    // Генерация стандартной трубы (без отреза)
    // Используем mapUVTo3D для генерации вершин, чтобы логика была единой
    
    const segmentsX = Math.max(radialSegments, 50)
    const segmentsY = 1
    const perimeter = this.baseCurve.getLength()
    
    const geometry = new THREE.PlaneGeometry(perimeter, height, segmentsX, segmentsY)
    const pos = geometry.attributes.position
    
    // Деформируем плоскость в цилиндр
    for(let i=0; i<pos.count; i++) {
        // PlaneGeometry создает прямоугольник с центром в 0,0
        // Нам нужно перевести локальные coords PlaneGeometry в coords Развертки (0..P, 0..H)
        const lx = pos.getX(i) + perimeter/2
        const ly = pos.getY(i) + height/2
        
        const p3d = this.mapUVTo3D(lx, ly)
        pos.setXYZ(i, p3d.x, p3d.y, p3d.z)
    }
    
    geometry.computeVertexNormals()
    
    // Добавляем крышки если нужно (здесь опускаем для краткости, фокус на боковине)
    
    const mesh = new THREE.Mesh(geometry, this.getStandardMaterial())
    this._setupUserData(mesh, 'cylindrical')
    return mesh
  }

  createUnfold2D() {
    const outline = this.getUnfoldOutline()
    // Преобразуем Vector2 -> Vector3
    const pts = [...outline, outline[0]].map(p => new THREE.Vector3(p.x, p.y, 0))
    
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const group = new THREE.Group()
    group.add(new THREE.Line(geo, this.getLineMaterial()))
    return group
  }

  getBaseCurve() { return this.baseCurve }
  setBaseCurve(curve) {
    if (curve instanceof BezierCurve) {
      this.baseCurve = curve.clone()
      this.params.baseCurveData = this.baseCurve.toJSON()
    }
  }
}