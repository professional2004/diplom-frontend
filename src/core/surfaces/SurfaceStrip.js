import { BezierCurve } from '@/core/curves/BezierCurve'
import { CylindricalSurface } from './CylindricalSurface'
import { ConicalSurface } from './ConicalSurface'
import * as THREE from 'three'

/**
 * Класс для работы с отрезами поверхностей (Surface Strips)
 * 
 * Отрез поверхности - это часть поверхности (цилиндрической или конической),
 * ограниченная замкнутой кривой Безье (контур отреза).
 * 
 * Когда контур вырезается из развертки 2D и собирается обратно в 3D,
 * получается отрез поверхности.
 */
export class SurfaceStrip {
  /**
   * @param {string} surfaceType - тип поверхности ('cylindrical' или 'conical')
   * @param {object} surfaceParams - параметры базовой поверхности
   * @param {BezierCurve} stripContour - замкнутая кривая контура отреза (в 2D координатах развертки)
   */
  constructor(surfaceType, surfaceParams = {}, stripContour = null) {
    this.surfaceType = surfaceType
    this.surfaceParams = { ...surfaceParams }
    
    // Инициализируем контур отреза - если не передан, создаем контур по границе развертки
    if (stripContour instanceof BezierCurve) {
      this.stripContour = stripContour.clone()
    } else if (stripContour) {
      this.stripContour = BezierCurve.fromJSON(stripContour)
    } else {
      this.stripContour = this._createDefaultStripContour()
    }
  }

  /**
   * Создает развертку всей поверхности (без учета отреза)
   * @private
   */
  _createBaseSurfaceInstance() {
    if (this.surfaceType === 'cylindrical') {
      return new CylindricalSurface(this.surfaceParams)
    } else if (this.surfaceType === 'conical') {
      return new ConicalSurface(this.surfaceParams)
    }
    throw new Error(`Unknown surface type: ${this.surfaceType}`)
  }

  /**
   * Создает 3D mesh отреза поверхности
   * Применяет контур отреза к базовой поверхности
   */
  createMesh() {
    const baseSurface = this._createBaseSurfaceInstance()
    const baseMesh = baseSurface.createMesh()
    return this._applyStripContourToMesh(baseMesh)
  }

  _applyStripContourToMesh(mesh) {
    if (this.surfaceType !== 'cylindrical' && this.surfaceType !== 'conical') {
      return mesh
    }
    
    // Если контур еще не инициализирован, возвращаем mesh как есть
    if (!this.stripContour) {
      return mesh
    }
    
    const geometry = mesh.geometry
    const positions = geometry.attributes.position.array
    const indices = geometry.index ? geometry.index.array : null
    const vertexCount = positions.length / 3
    
    // Если нет вершин или индексов, возвращаем mesh как есть
    if (vertexCount === 0 || !indices) {
      return mesh
    }
    
    const vertexMask = new Uint8Array(vertexCount)
    const { height } = this.surfaceParams
    const halfHeight = height / 2
    let perimeter = 0
    
    if (this.surfaceType === 'cylindrical') {
      const baseSurface = this._createBaseSurfaceInstance()
      const baseCurve = baseSurface.getBaseCurve()
      const basePoints = baseCurve.getPoints(50)
      for (let i = 0; i < basePoints.length - 1; i++) {
        const p1 = basePoints[i]
        const p2 = basePoints[i + 1]
        perimeter += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
      }
    }
    
    // Проверяем каждую вершину
    for (let i = 0; i < vertexCount; i++) {
      const x = positions[i * 3]
      const y = positions[i * 3 + 1]
      const z = positions[i * 3 + 2]
      let unfoldX = this._calculateUnfoldX(x, z, perimeter)
      let unfoldY = y + halfHeight
      const point = new THREE.Vector2(unfoldX, unfoldY)
      
      if (this.isPointInsideContour(point)) {
        vertexMask[i] = 1
      }
    }
    
    // Проверяем, остались ли вообще вершины
    let remainingVertexCount = 0
    for (let i = 0; i < vertexCount; i++) {
      if (vertexMask[i]) remainingVertexCount++
    }
    
    // Если остались все вершины, возвращаем исходный mesh
    if (remainingVertexCount === vertexCount) {
      return mesh
    }
    
    // Если не осталось ни одной вершины, возвращаем пустой mesh
    if (remainingVertexCount === 0) {
      const emptyGeometry = new THREE.BufferGeometry()
      const emptyMesh = new THREE.Mesh(emptyGeometry, mesh.material)
      emptyMesh.userData = { ...mesh.userData }
      return emptyMesh
    }
    
    const newPositions = []
    const newIndices = []
    const indexMap = new Int32Array(vertexCount)
    let newVertexCount = 0
    
    for (let i = 0; i < vertexCount; i++) {
      if (vertexMask[i]) {
        indexMap[i] = newVertexCount
        newPositions.push(positions[i * 3])
        newPositions.push(positions[i * 3 + 1])
        newPositions.push(positions[i * 3 + 2])
        newVertexCount++
      } else {
        indexMap[i] = -1
      }
    }
    
    if (indices) {
      for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i]
        const i1 = indices[i + 1]
        const i2 = indices[i + 2]
        if (indexMap[i0] !== -1 && indexMap[i1] !== -1 && indexMap[i2] !== -1) {
          newIndices.push(indexMap[i0])
          newIndices.push(indexMap[i1])
          newIndices.push(indexMap[i2])
        }
      }
    }
    
    const newGeometry = new THREE.BufferGeometry()
    newGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPositions), 3))
    if (newIndices.length > 0) {
      newGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(newIndices), 1))
    }
    newGeometry.computeVertexNormals()
    const newMesh = new THREE.Mesh(newGeometry, mesh.material)
    newMesh.userData = { ...mesh.userData }
    return newMesh
  }

  _calculateUnfoldX(x, z, perimeter) {
    const angle = Math.atan2(z, x)
    const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle
    return (normalizedAngle / (Math.PI * 2)) * perimeter
  }

  /**
   * Создает 2D развертку поверхности с видимым контуром отреза
   */
  createUnfold2D() {
    const baseSurface = this._createBaseSurfaceInstance()
    const group = baseSurface.createUnfold2D()

    // Добавляем контур отреза на развертку
    this._addStripContourToUnfold(group)

    return group
  }

  /**
   * Добавляет контур отреза к развертке (как красную кривую)
   * @private
   */
  _addStripContourToUnfold(unfoldGroup) {
    const points = this.stripContour.getPoints(100)
    const threePoints = points.map(p => new THREE.Vector3(p.x, p.y, 0.1)) // Небольшой Z offset

    const geometry = new THREE.BufferGeometry().setFromPoints(threePoints)
    const material = new THREE.LineBasicMaterial({ 
      color: 0xff0000, 
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    })
    const line = new THREE.Line(geometry, material)
    unfoldGroup.add(line)

    // Добавляем точки контура отреза для визуализации
    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(threePoints)
    const pointsMaterial = new THREE.PointsMaterial({ 
      color: 0xff0000, 
      size: 0.15,
      transparent: true,
      opacity: 0.8
    })
    const pointsVisualization = new THREE.Points(pointsGeometry, pointsMaterial)
    unfoldGroup.add(pointsVisualization)
  }

  /**
   * Создает контур по умолчанию
   * Контур следует форме развертки, используя те же управляющие точки
   * Небольшой отступ (margin) от границ развертки
   * @private
   */
  _createDefaultStripContour() {
    const baseSurface = this._createBaseSurfaceInstance()
    
    // Получаем базовую информацию
    const unfoldGroup = baseSurface.createUnfold2D()
    const bbox = new THREE.Box3().setFromObject(unfoldGroup)
    const margin = 0.1
    
    // Для цилиндрической поверхности: контур следует периметру развертки
    if (this.surfaceType === 'cylindrical') {
      const { height } = this.surfaceParams
      const unfoldWidth = bbox.max.x - bbox.min.x
      
      // Создаем контур как замкнутую кривую вдоль границ развертки с отступом
      const points = [
        new THREE.Vector2(bbox.min.x + margin, bbox.min.y + margin),
        new THREE.Vector2(bbox.max.x - margin, bbox.min.y + margin),
        new THREE.Vector2(bbox.max.x - margin, bbox.max.y - margin),
        new THREE.Vector2(bbox.min.x + margin, bbox.max.y - margin)
      ]
      
      return new BezierCurve(points, true)
    }
    
    // Для конической поверхности: аналогично
    if (this.surfaceType === 'conical') {
      const points = [
        new THREE.Vector2(bbox.min.x + margin, bbox.min.y + margin),
        new THREE.Vector2(bbox.max.x - margin, bbox.min.y + margin),
        new THREE.Vector2(bbox.max.x - margin, bbox.max.y - margin),
        new THREE.Vector2(bbox.min.x + margin, bbox.max.y - margin)
      ]
      
      return new BezierCurve(points, true)
    }
    
    // Fallback: прямоугольник
    const points = [
      new THREE.Vector2(bbox.min.x + margin, bbox.min.y + margin),
      new THREE.Vector2(bbox.max.x - margin, bbox.min.y + margin),
      new THREE.Vector2(bbox.max.x - margin, bbox.max.y - margin),
      new THREE.Vector2(bbox.min.x + margin, bbox.max.y - margin)
    ]
    
    return new BezierCurve(points, true)
  }

  /**
   * Получить контур отреза
   */
  getStripContour() {
    return this.stripContour.clone()
  }

  /**
   * Установить новый контур отреза
   */
  setStripContour(contour) {
    if (contour instanceof BezierCurve) {
      this.stripContour = contour.clone()
    } else if (contour) {
      this.stripContour = BezierCurve.fromJSON(contour)
    }
  }

  /**
   * Получить базовую кривую поверхности (основание)
   */
  getBaseCurve() {
    const baseSurface = this._createBaseSurfaceInstance()
    return baseSurface.getBaseCurve()
  }

  /**
   * Установить новую базовую кривую для поверхности
   */
  setBaseCurve(curve) {
    if (curve instanceof BezierCurve) {
      this.surfaceParams = {
        ...this.surfaceParams,
        baseCurveData: curve.toJSON()
      }
    }
  }

  /**
   * Сериализовать в JSON (для сохранения)
   */
  toJSON() {
    return {
      type: 'strip',
      surfaceType: this.surfaceType,
      surfaceParams: this.surfaceParams,
      stripContourData: this.stripContour.toJSON()
    }
  }

  /**
   * Десериализовать из JSON
   */
  static fromJSON(data) {
    return new SurfaceStrip(
      data.surfaceType,
      data.surfaceParams,
      data.stripContourData
    )
  }

  /**
   * Проверить, находится ли точка внутри контура отреза
   */
  isPointInsideContour(point) {
    // Ray casting algorithm для проверки точки внутри многоугольника
    const p = new THREE.Vector2(point.x, point.y)
    const contourPoints = this.stripContour.getPoints(200)
    
    let isInside = false
    for (let i = 0, j = contourPoints.length - 1; i < contourPoints.length; j = i++) {
      const xi = contourPoints[i].x, yi = contourPoints[i].y
      const xj = contourPoints[j].x, yj = contourPoints[j].y

      const intersect = ((yi > p.y) !== (yj > p.y)) &&
        (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)
      if (intersect) isInside = !isInside
    }

    return isInside
  }

  /**
   * Получить границы развертки
   */
  getUnfoldBounds() {
    const baseSurface = this._createBaseSurfaceInstance()
    const unfoldGroup = baseSurface.createUnfold2D()
    const bbox = new THREE.Box3().setFromObject(unfoldGroup)
    
    return {
      min: { x: bbox.min.x, y: bbox.min.y },
      max: { x: bbox.max.x, y: bbox.max.y },
      width: bbox.max.x - bbox.min.x,
      height: bbox.max.y - bbox.min.y
    }
  }

  /**
   * Проверить, находится ли точка внутри границ развертки
   */
  isPointInsideUnfoldBounds(point) {
    const bounds = this.getUnfoldBounds()
    return point.x >= bounds.min.x && point.x <= bounds.max.x &&
           point.y >= bounds.min.y && point.y <= bounds.max.y
  }

  /**
   * Ограничить точку границами развертки
   */
  constrainPointToUnfoldBounds(point) {
    const bounds = this.getUnfoldBounds()
    const margin = 0.05
    
    return new THREE.Vector2(
      Math.max(bounds.min.x + margin, Math.min(point.x, bounds.max.x - margin)),
      Math.max(bounds.min.y + margin, Math.min(point.y, bounds.max.y - margin))
    )
  }
}
