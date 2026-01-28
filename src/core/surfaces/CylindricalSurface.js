import * as THREE from 'three'
import { BaseSurface } from './BaseSurface'
import { BezierCurve } from '@/core/curves/BezierCurve'

/**
 * Цилиндрическая поверхность
 * Основание определяется кривой Безье (замкнутой)
 * Параметры: baseCurve (BezierCurve или параметры кривой), height, radialSegments
 */
export class CylindricalSurface extends BaseSurface {
  get defaultParams() {
    return {
      baseCurveData: null, // Данные кривой для десериализации
      height: 3,
      radialSegments: 32
    }
  }

  /**
   * Создает стандартную круговую кривую (основание цилиндра по умолчанию)
   */
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
    
    // Инициализируем базовую кривую
    if (params.baseCurve instanceof BezierCurve) {
      this.baseCurve = params.baseCurve.clone()
    } else if (this.params.baseCurveData) {
      this.baseCurve = BezierCurve.fromJSON(this.params.baseCurveData)
    } else {
      this.baseCurve = CylindricalSurface.createDefaultBaseCurve()
    }

    // Сохраняем кривую в параметры для сериализации
    this.params.baseCurveData = this.baseCurve.toJSON()
  }

  createMesh() {
    const { height, radialSegments } = this.params

    // Получаем точки кривой основания - значительно больше сегментов для гладкости
    const segmentCount = Math.max(radialSegments, 50)
    const basePoints = this.baseCurve.getPoints(segmentCount)
    const basePointCount = basePoints.length

    // Создаем вершины: нижнее основание, верхнее основание, и возможно центры (для закрытия)
    const vertices = []
    const indices = []

    const halfHeight = height / 2

    // Добавляем вершины нижнего основания (y = -height/2)
    for (let i = 0; i < basePointCount; i++) {
      const p = basePoints[i]
      vertices.push(p.x, -halfHeight, p.y)
    }

    // Добавляем вершины верхнего основания (y = height/2)
    for (let i = 0; i < basePointCount; i++) {
      const p = basePoints[i]
      vertices.push(p.x, halfHeight, p.y)
    }

    // Создаем боковую поверхность (только стороны призмы, без оснований)
    for (let i = 0; i < basePointCount - 1; i++) {
      const a = i
      const b = i + 1
      const c = basePointCount + i
      const d = basePointCount + i + 1

      // Два треугольника для каждого квадрата
      // Нижний треугольник
      indices.push(a, b, c)
      // Верхний треугольник
      indices.push(b, d, c)
    }

    // Замыкаем кривую (соединяем последнюю точку с первой)
    const lastLower = basePointCount - 1
    const firstLower = 0
    const lastUpper = basePointCount + basePointCount - 1
    const firstUpper = basePointCount

    // Нижний треугольник замыкания
    indices.push(lastLower, firstLower, lastUpper)
    // Верхний треугольник замыкания
    indices.push(firstLower, firstUpper, lastUpper)

    // Создаем буфер геометрию
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
    geometry.computeVertexNormals()

    const mesh = new THREE.Mesh(geometry, this.getStandardMaterial())
    
    this._setupUserData(mesh, 'cylindrical')
    return mesh
  }

  createUnfold2D() {
    const { height } = this.params
    const group = new THREE.Group()
    const mat = this.getLineMaterial()

    // Развертка прямой призмы: прямоугольник с шириной = периметр основания, высота = height
    const segmentCount = 50
    const basePoints = this.baseCurve.getPoints(segmentCount)
    
    // Вычисляем длину периметра кривой
    let perimeter = 0
    for (let i = 0; i < basePoints.length - 1; i++) {
      const p1 = basePoints[i]
      const p2 = basePoints[i + 1]
      perimeter += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
    }

    // Рисуем развертку как "прямоугольник"
    // Нижняя сторона основания
    const unfoldPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(perimeter, 0, 0),
      new THREE.Vector3(perimeter, height, 0),
      new THREE.Vector3(0, height, 0),
      new THREE.Vector3(0, 0, 0)
    ]

    const unfoldGeo = new THREE.BufferGeometry().setFromPoints(unfoldPoints)
    group.add(new THREE.Line(unfoldGeo, mat))

    return group
  }

  /**
   * Получить базовую кривую
   */
  getBaseCurve() {
    return this.baseCurve
  }

  /**
   * Установить новую базовую кривую
   */
  setBaseCurve(curve) {
    if (curve instanceof BezierCurve) {
      this.baseCurve = curve.clone()
      this.params.baseCurveData = this.baseCurve.toJSON()
    }
  }
}
