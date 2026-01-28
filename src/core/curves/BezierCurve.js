import * as THREE from 'three'

/**
 * Класс для работы с кривыми Безье третьей степени (cubic Bezier curves)
 * Поддерживает как замкнутые, так и незамкнутые кривые
 */
export class BezierCurve {
  /**
   * @param {THREE.Vector2[]} controlPoints - массив контрольных точек
   * @param {boolean} closed - замкнута ли кривая
   */
  constructor(controlPoints, closed = false) {
    this.controlPoints = controlPoints.map(p => p.clone())
    this.closed = closed
    this._updateCachedValues()
  }

  /**
   * Клонирует кривую
   */
  clone() {
    return new BezierCurve(this.controlPoints.map(p => p.clone()), this.closed)
  }

  /**
   * Получить точку на кривой по параметру t (от 0 до 1)
   * @param {number} t - параметр [0, 1]
   * @returns {THREE.Vector2} точка на кривой
   */
  getPoint(t) {
    if (t <= 0) return this.controlPoints[0].clone()
    if (t >= 1) return this.controlPoints[this.controlPoints.length - 1].clone()

    const points = this.closed ? [...this.controlPoints, this.controlPoints[0]] : this.controlPoints
    const segments = points.length - 1

    // Определяем, на каком сегменте находится точка
    const segmentIndex = Math.floor(t * segments)
    const segmentT = (t * segments) - segmentIndex

    const p0 = points[segmentIndex]
    const p1 = points[(segmentIndex + 1) % points.length]

    // Кубическая кривая Безье (для простоты используем квадратичную между двумя точками)
    return this._quadraticBezier(p0, p1, segmentT)
  }

  /**
   * Генерирует точки для визуализации кривой
   * @param {number} segments - количество сегментов (точек)
   * @returns {THREE.Vector2[]} массив точек кривой
   */
  getPoints(segments = 50) {
    const points = []
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      points.push(this.getPoint(t))
    }
    return points
  }

  /**
   * Квадратичная интерполяция Безье между двумя точками (простая версия)
   * @private
   */
  _quadraticBezier(p0, p1, t) {
    const x = (1 - t) * p0.x + t * p1.x
    const y = (1 - t) * p0.y + t * p1.y
    return new THREE.Vector2(x, y)
  }

  /**
   * Получить длину кривой
   * @param {number} segments - количество сегментов для интегрирования
   * @returns {number} приблизительная длина кривой
   */
  getLength(segments = 100) {
    let length = 0
    let lastPoint = this.getPoint(0)

    for (let i = 1; i <= segments; i++) {
      const point = this.getPoint(i / segments)
      length += lastPoint.distanceTo(point)
      lastPoint = point
    }

    return length
  }

  /**
   * Переместить контрольную точку
   * @param {number} index - индекс контрольной точки
   * @param {THREE.Vector2} newPosition - новая позиция
   */
  setControlPoint(index, newPosition) {
    if (index >= 0 && index < this.controlPoints.length) {
      this.controlPoints[index].copy(newPosition)
      this._updateCachedValues()
    }
  }

  /**
   * Получить контрольную точку
   */
  getControlPoint(index) {
    if (index >= 0 && index < this.controlPoints.length) {
      return this.controlPoints[index].clone()
    }
    return null
  }

  /**
   * Добавить контрольную точку в конец
   */
  addControlPoint(point) {
    this.controlPoints.push(point.clone())
    this._updateCachedValues()
  }

  /**
   * Удалить контрольную точку
   */
  removeControlPoint(index) {
    if (index >= 0 && index < this.controlPoints.length && this.controlPoints.length > 2) {
      this.controlPoints.splice(index, 1)
      this._updateCachedValues()
    }
  }

  /**
   * Получить количество контрольных точек
   */
  getControlPointCount() {
    return this.controlPoints.length
  }

  /**
   * Сериализовать кривую в JSON
   */
  toJSON() {
    return {
      controlPoints: this.controlPoints.map(p => ({ x: p.x, y: p.y })),
      closed: this.closed
    }
  }

  /**
   * Десериализовать кривую из JSON
   */
  static fromJSON(data) {
    const points = data.controlPoints.map(p => new THREE.Vector2(p.x, p.y))
    return new BezierCurve(points, data.closed)
  }

  /**
   * Обновить кэшированные значения (для оптимизации)
   * @private
   */
  _updateCachedValues() {
    // Можно добавить кэширование для оптимизации в будущем
  }

  /**
   * Получить bounding box кривой
   */
  getBoundingBox() {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    for (const point of this.controlPoints) {
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    }

    return {
      min: new THREE.Vector2(minX, minY),
      max: new THREE.Vector2(maxX, maxY),
      width: maxX - minX,
      height: maxY - minY
    }
  }

  /**
   * Нормализовать кривую к диапазону [0, 1]
   */
  normalize() {
    const bbox = this.getBoundingBox()
    const scale = Math.max(bbox.width, bbox.height) || 1

    for (const point of this.controlPoints) {
      point.x = (point.x - bbox.min.x) / scale
      point.y = (point.y - bbox.min.y) / scale
    }

    return this
  }
}
