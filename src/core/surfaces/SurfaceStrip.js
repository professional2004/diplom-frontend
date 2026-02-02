import { BezierCurve } from '@/core/curves/BezierCurve'
import { SurfaceRegistry } from './SurfaceRegistry'
import * as THREE from 'three'

export class SurfaceStrip {
  constructor(surfaceType, surfaceParams = {}, stripContour = null) {
    this.surfaceType = surfaceType
    this.surfaceParams = { ...surfaceParams }
    
    // Создаем базовую поверхность для доступа к методам маппинга
    this.baseSurface = SurfaceRegistry.create(this.surfaceType, this.surfaceParams)
    
    // Инициализация контура
    if (stripContour instanceof BezierCurve) {
      this.stripContour = stripContour.clone()
    } else if (stripContour) {
      this.stripContour = BezierCurve.fromJSON(stripContour)
    } else {
      this.stripContour = this._createDefaultStripContour()
    }
  }

  /**
   * Создает 3D Mesh методом "Grid Culling":
   * 1. Создаем плотную сетку (PlaneGeometry) по габаритам развертки.
   * 2. Удаляем треугольники, центры которых лежат вне контура (stripContour).
   * 3. Оставшиеся вершины маппим из 2D в 3D.
   */
  createMesh() {
    // 1. Получаем границы развертки, чтобы создать покрывающую сетку
    const bounds = this.getUnfoldBounds()
    
    // Плотность сетки критична для гладкости изгиба. 
    // Для цилиндра нужно много сегментов по ширине (X).
    const segmentsX = 80 
    const segmentsY = 40
    
    const geometry = new THREE.PlaneGeometry(
        bounds.width, bounds.height, 
        segmentsX, segmentsY
    )
    
    // Сдвигаем Plane так, чтобы он совпадал с координатами развертки
    // PlaneGeometry создается в центре (0,0), а развертка может быть где угодно (обычно от 0,0 в плюс)
    const posAttribute = geometry.attributes.position
    const centerOffsetX = bounds.min.x + bounds.width / 2
    const centerOffsetY = bounds.min.y + bounds.height / 2
    
    geometry.translate(centerOffsetX, centerOffsetY, 0)

    // 2. Фильтрация треугольников (Culling)
    // Нам нужно удалить faces, которые не попадают в контур
    this._cullFacesByContour(geometry)

    // 3. Деформация вершин: 2D Plane -> 3D Surface
    // Важно: делаем это ПОСЛЕ фильтрации, но можно и до, порядок не важен для топологии,
    // но важен для производительности raycasting (лучше делать в 2D).
    
    const vertex = new THREE.Vector3()
    for (let i = 0; i < posAttribute.count; i++) {
      vertex.fromBufferAttribute(posAttribute, i)
      
      // vertex.x, vertex.y - это координаты на 2D развертке
      // Преобразуем их в 3D
      const p3d = this.baseSurface.mapUVTo3D(vertex.x, vertex.y)
      
      // Обновляем координаты
      posAttribute.setXYZ(i, p3d.x, p3d.y, p3d.z)
    }

    geometry.computeVertexNormals()
    
    // Материал: DoubleSide обязательно, так как это тонкая оболочка
    const mat = new THREE.MeshStandardMaterial({
      color: 0x156289, // Приятный синий цвет, чтобы отличался
      emissive: 0x072534,
      side: THREE.DoubleSide,
      flatShading: false, // Гладкое затенение
      metalness: 0.1,
      roughness: 0.5
    })

    const mesh = new THREE.Mesh(geometry, mat)
    this._setupUserData(mesh)
    return mesh
  }

  /**
   * Удаляет треугольники (faces) из геометрии, если их центр вне контура
   */
  _cullFacesByContour(geometry) {
      const posAttr = geometry.attributes.position
      const indexAttr = geometry.index
      const indices = indexAttr.array
      const newIndices = []
      
      // Получаем точки контура для алгоритма "Point in Polygon"
      // Берем достаточно точек, чтобы аппроксимировать кривые Безье
      const contourPoints = this.stripContour.getPoints(100)
      
      const vA = new THREE.Vector3()
      const vB = new THREE.Vector3()
      const vC = new THREE.Vector3()
      const centroid = new THREE.Vector2()

      // Проходим по всем треугольникам
      for (let i = 0; i < indices.length; i += 3) {
          const a = indices[i]
          const b = indices[i+1]
          const c = indices[i+2]
          
          vA.fromBufferAttribute(posAttr, a)
          vB.fromBufferAttribute(posAttr, b)
          vC.fromBufferAttribute(posAttr, c)
          
          // Считаем центр треугольника в 2D (UV пространство)
          centroid.set(
              (vA.x + vB.x + vC.x) / 3,
              (vA.y + vB.y + vC.y) / 3
          )
          
          // Проверяем, лежит ли центр внутри контура
          if (this._isPointInPolygon(centroid, contourPoints)) {
              newIndices.push(a, b, c)
          }
      }
      
      // Обновляем индексы геометрии
      geometry.setIndex(newIndices)
  }
  
  // Алгоритм Ray Casting для проверки вхождения точки в полигон
  _isPointInPolygon(p, polygon) {
      let inside = false
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const xi = polygon[i].x, yi = polygon[i].y
          const xj = polygon[j].x, yj = polygon[j].y
          
          const intersect = ((yi > p.y) !== (yj > p.y)) &&
              (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)
          
          if (intersect) inside = !inside
      }
      return inside
  }

  _createDefaultStripContour() {
    // Получаем реальные границы развертки
    const outline = this.baseSurface.getUnfoldOutline()
    
    // Упрощенная логика: создаем простой прямоугольник или трапецию,
    // вписанную в BoundingBox развертки, но с небольшим отступом.
    // Не копируем весь сложный outline конуса, чтобы не создавать 100 точек.
    
    if (outline && outline.length > 0) {
        const box = new THREE.Box2().setFromPoints(outline)
        
        // Отступ 10%
        const w = box.max.x - box.min.x
        const h = box.max.y - box.min.y
        const marginX = w * 0.1
        const marginY = h * 0.1
        
        const p1 = new THREE.Vector2(box.min.x + marginX, box.min.y + marginY)
        const p2 = new THREE.Vector2(box.max.x - marginX, box.min.y + marginY)
        const p3 = new THREE.Vector2(box.max.x - marginX, box.max.y - marginY)
        const p4 = new THREE.Vector2(box.min.x + marginX, box.max.y - marginY)
        
        // Для конуса развертка веерная, но 4 точки - хорошая база для начала редактирования.
        // Пользователь сам добавит точки, если нужно.
        return new BezierCurve([p1, p2, p3, p4], true)
    }

    // Fallback
    return new BezierCurve([
        new THREE.Vector2(0,0), new THREE.Vector2(1,0), 
        new THREE.Vector2(1,1), new THREE.Vector2(0,1)
    ], true)
  }

  _setupUserData(mesh) {
    mesh.userData.surfaceType = this.surfaceType.endsWith('-strip') ? this.surfaceType : `${this.surfaceType}-strip`
    mesh.userData.isStrip = true
    mesh.userData.stripData = this.toJSON()
    mesh.userData.selectable = true
  }

  createUnfold2D() {
    // Создаем группу: Границы развертки (серые) + Контур отреза (Красный)
    const group = this.baseSurface.createUnfold2D()
    this._addStripContourToUnfold(group)
    return group
  }

  _addStripContourToUnfold(group) {
    const points = this.stripContour.getPoints(100)
    // Z = 0.05 чтобы быть чуть выше фона
    const pts3 = points.map(p => new THREE.Vector3(p.x, p.y, 0.05)) 
    const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts3),
        new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 })
    )
    group.add(line)
  }
  
  getUnfoldBounds() {
      const outline = this.getUnfoldOutlinePoints()
      if (!outline || outline.length === 0) {
          return { min: {x:0,y:0}, max: {x:10,y:10}, width: 10, height: 10 }
      }
      const box = new THREE.Box2().setFromPoints(outline)
      return {
          min: box.min, max: box.max,
          width: box.max.x - box.min.x, height: box.max.y - box.min.y
      }
  }

  // Делегирование
  getBaseCurve() { return this.baseSurface.getBaseCurve() }
  setBaseCurve(curve) {
      this.baseSurface.setBaseCurve(curve)
      this.surfaceParams = { ...this.baseSurface.params }
  }
  getStripContour() { return this.stripContour.clone() }
  setStripContour(contour) { 
    this.stripContour = (contour instanceof BezierCurve) ? contour.clone() : BezierCurve.fromJSON(contour)
  }
  getUnfoldOutlinePoints() { return this.baseSurface.getUnfoldOutline() }
  
  toJSON() {
    return {
      type: 'strip',
      surfaceType: this.surfaceType,
      surfaceParams: this.surfaceParams,
      stripContourData: this.stripContour.toJSON()
    }
  }

  static fromJSON(data) {
    return new SurfaceStrip(data.surfaceType, data.surfaceParams, data.stripContourData)
  }
}