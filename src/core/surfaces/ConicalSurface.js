import * as THREE from 'three'
import { BaseSurface } from './BaseSurface'
import { BezierCurve } from '@/core/curves/BezierCurve'

/**
 * Коническая поверхность
 * Основание определяется кривой Безье (замкнутой)
 * Параметры: baseCurve (BezierCurve или параметры кривой), height, radialSegments
 */
export class ConicalSurface extends BaseSurface {
  get defaultParams() {
    return {
      baseCurveData: null, // Данные кривой для десериализации
      height: 3,
      radialSegments: 32
    }
  }

  /**
   * Создает стандартную коническую кривую (круг по умолчанию)
   */
  static createDefaultBaseCurve() {
    const points = []
    const segments = 12
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector2(Math.cos(angle) * 2, Math.sin(angle) * 2))
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
      this.baseCurve = ConicalSurface.createDefaultBaseCurve()
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

    // Создаем вершины: основание + вершина конуса
    const vertices = []
    const indices = []

    const halfHeight = height / 2

    // Добавляем вершины основания (y = -height/2)
    for (let i = 0; i < basePointCount; i++) {
      const p = basePoints[i]
      vertices.push(p.x, -halfHeight, p.y)
    }

    // Добавляем вершину конуса (в центре, на y = height/2)
    const apexIndex = basePointCount
    vertices.push(0, halfHeight, 0)

    // Создаем боковую поверхность (треугольники от основания к вершине)
    for (let i = 0; i < basePointCount - 1; i++) {
      const baseA = i
      const baseB = i + 1
      
      // Каждый треугольник: две точки основания + вершина конуса
      indices.push(baseA, baseB, apexIndex)
    }

    // Замыкаем конус (соединяем последнюю точку основания с первой + вершина)
    const lastBase = basePointCount - 1
    const firstBase = 0
    indices.push(lastBase, firstBase, apexIndex)

    // Создаем буфер геометрию
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
    geometry.computeVertexNormals()

    const mesh = new THREE.Mesh(geometry, this.getStandardMaterial())
    
    this._setupUserData(mesh, 'conical')
    return mesh
  }

  createUnfold2D() {
    const { height } = this.params
    const group = new THREE.Group()
    const mat = this.getLineMaterial()

    // Развертка конуса с произвольным основанием:
    // Представляет собой сектор с вершиной в начале координат
    // и радиусами, равными образующим конуса

    const segmentCount = 50
    const basePoints = this.baseCurve.getPoints(segmentCount)

    // Вычисляем длину образующей (расстояние от вершины до точек основания)
    const slantHeights = basePoints.map(p => {
      const baseDistance = Math.sqrt(p.x * p.x + p.y * p.y)
      return Math.sqrt(height * height + baseDistance * baseDistance)
    })

    // Вычисляем периметр основания
    let totalPerimeter = 0
    for (let i = 0; i < basePoints.length - 1; i++) {
      const p1 = basePoints[i]
      const p2 = basePoints[i + 1]
      totalPerimeter += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
    }

    // Средняя длина образующей
    const avgSlantHeight = slantHeights.reduce((a, b) => a + b, 0) / slantHeights.length

    // Угол развертки (в радианах)
    const unfoldAngle = totalPerimeter / avgSlantHeight

    // Рисуем развертку как сектор
    const apex = new THREE.Vector3(0, 0, 0)
    let currentAngle = -unfoldAngle / 2
    const unfoldPoints = [apex.clone()]

    for (let i = 0; i < basePoints.length; i++) {
      const slantHeight = slantHeights[i]
      const x = slantHeight * Math.cos(currentAngle)
      const y = slantHeight * Math.sin(currentAngle)
      unfoldPoints.push(new THREE.Vector3(x, y, 0))

      // Обновляем угол для следующей точки
      if (i < basePoints.length - 1) {
        const p1 = basePoints[i]
        const p2 = basePoints[i + 1]
        const segmentLength = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
        const avgLocalSlantHeight = (slantHeights[i] + slantHeights[i + 1]) / 2
        currentAngle += segmentLength / avgLocalSlantHeight
      }
    }

    // Замыкаем развертку обратно к вершине
    unfoldPoints.push(apex.clone())

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
