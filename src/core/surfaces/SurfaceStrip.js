import { BezierCurve } from '@/core/curves/BezierCurve'
import { SurfaceRegistry } from './SurfaceRegistry'
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
    return SurfaceRegistry.create(this.surfaceType, this.surfaceParams)
  }

  /**
   * Создает 3D mesh отреза поверхности
   * Для упрощения в текущей версии возвращает весь mesh поверхности
   * В будущем может быть оптимизирован для показа только части поверхности
   */
  createMesh() {
    const baseSurface = this._createBaseSurfaceInstance()
    return baseSurface.createMesh()
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
   * Создает контур по умолчанию (полная развертка)
   * Контур соответствует точным границам развертки
   * @private
   */
  _createDefaultStripContour() {
    const baseSurface = this._createBaseSurfaceInstance()
    
    // Получаем границы развертки
    const unfoldGroup = baseSurface.createUnfold2D()
    const bbox = new THREE.Box3().setFromObject(unfoldGroup)
    
    // Создаем контур, который точно совпадает с границами развертки
    // Небольшой отступ (0.05) чтобы не было проблем с граничными условиями
    const margin = 0.05
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
}
