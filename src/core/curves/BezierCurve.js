import * as THREE from 'three'

export class BezierCurve {
  constructor(controlPoints, closed = false) {
    // Копируем точки, чтобы избежать мутаций извне
    this.controlPoints = controlPoints.map(p => p.clone())
    this.closed = closed
    this._cache = { length: null, arcLengths: null }
  }

  clone() {
    return new BezierCurve(this.controlPoints.map(p => p.clone()), this.closed)
  }

  // --- Геометрия ---

  getPoint(t) {
    if (this.controlPoints.length < 2) return new THREE.Vector2()
    
    // Обработка замкнутости и выхода за границы
    if (this.closed) {
      t = t - Math.floor(t) // 1.2 -> 0.2
    } else {
      t = Math.max(0, Math.min(1, t))
    }

    const count = this.controlPoints.length
    const segments = this.closed ? count : count - 1
    
    // Глобальный t -> локальный индекс сегмента
    const globalT = t * segments
    let i = Math.floor(globalT)
    const localT = globalT - i
    
    // Замыкание индексов
    if (this.closed) i = i % count
    const nextI = (i + 1) % count
    
    // Защита для незамкнутых
    if (!this.closed && i >= segments) {
        return this.controlPoints[count - 1].clone()
    }

    const p0 = this.controlPoints[i]
    const p1 = this.controlPoints[nextI]

    // Линейная интерполяция (для оснований САПР обычно достаточно полилинии, 
    // если нужна кривизна Безье между точками - можно раскомментировать кубическую логику)
    return new THREE.Vector2(
      p0.x + (p1.x - p0.x) * localT,
      p0.y + (p1.y - p0.y) * localT
    )
  }

  getPoints(segments = 50) {
    const points = []
    for (let i = 0; i <= segments; i++) {
      points.push(this.getPoint(i / segments))
    }
    return points
  }

  // --- Работа с длиной (для разверток) ---

  _updateLengthCache(segments = 200) {
    let length = 0
    let lastPoint = this.getPoint(0)
    const arcLengths = [0]

    for (let i = 1; i <= segments; i++) {
      const t = i / segments
      const point = this.getPoint(t)
      length += lastPoint.distanceTo(point)
      arcLengths.push(length)
      lastPoint = point
    }
    
    this._cache.length = length
    this._cache.arcLengths = arcLengths
    this._cache.segments = segments
  }

  getLength() {
    if (this._cache.length === null) this._updateLengthCache()
    return this._cache.length
  }

  /**
   * Найти параметр t (0..1) соответствующий расстоянию dist от начала кривой
   */
  getTAtDist(dist) {
    if (this._cache.length === null) this._updateLengthCache()
    
    const totalLength = this._cache.length
    
    if (dist <= 0) return 0
    if (dist >= totalLength) return 1

    // Бинарный поиск по кэшу длин
    const list = this._cache.arcLengths
    let low = 0, high = list.length - 1
    while (low <= high) {
        const mid = (low + high) >>> 1
        if (list[mid] < dist) low = mid + 1
        else high = mid - 1
    }
    
    // Интерполяция внутри сегмента кэша
    const idx = low 
    const prevDist = list[idx - 1]
    const nextDist = list[idx]
    const segmentFrac = (dist - prevDist) / (nextDist - prevDist)
    
    const tStep = 1 / this._cache.segments
    return (idx - 1) * tStep + segmentFrac * tStep
  }

  getPointAtDist(dist) {
      const t = this.getTAtDist(dist)
      return this.getPoint(t)
  }

  // --- Редактирование ---

  setControlPoint(index, newPosition) {
    if (index >= 0 && index < this.controlPoints.length) {
      this.controlPoints[index].copy(newPosition)
      this._cache.length = null // Сброс кэша
    }
  }

  getControlPoint(index) {
    return this.controlPoints[index]?.clone() || null
  }

  getControlPointCount() {
    return this.controlPoints.length
  }

  // Добавить точку (в конец)
  addControlPoint(point) {
    this.controlPoints.push(point.clone())
    this._cache.length = null
  }

  // Вставить точку на кривую (разбиение сегмента)
  // Ищет ближайший сегмент к точке pos и вставляет туда
  insertControlPointAt(pos) {
    let minIsoDist = Infinity
    let insertIndex = -1
    
    const pts = this.controlPoints
    const count = this.closed ? pts.length : pts.length - 1

    for(let i=0; i<count; i++) {
        const p1 = pts[i]
        const p2 = pts[(i+1)%pts.length]
        
        // Расстояние от точки до отрезка
        const dist = this._distToSegment(pos, p1, p2)
        if (dist < minIsoDist) {
            minIsoDist = dist
            insertIndex = (i + 1)
        }
    }

    if (insertIndex !== -1) {
        this.controlPoints.splice(insertIndex, 0, new THREE.Vector2(pos.x, pos.y))
        this._cache.length = null
        return insertIndex
    }
    return -1
  }

  removeControlPoint(index) {
    if (this.controlPoints.length <= 3 && this.closed) return // Не ломать минимум для замкнутой
    if (this.controlPoints.length <= 2 && !this.closed) return

    if (index >= 0 && index < this.controlPoints.length) {
      this.controlPoints.splice(index, 1)
      this._cache.length = null
    }
  }

  // Вспомогательный метод: расстояние от точки P до отрезка AB
  _distToSegment(p, a, b) {
      const l2 = a.distanceToSquared(b)
      if (l2 === 0) return p.distanceTo(a)
      let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2
      t = Math.max(0, Math.min(1, t))
      const proj = new THREE.Vector2(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y))
      return p.distanceTo(proj)
  }

  // --- Сериализация ---

  toJSON() {
    return {
      controlPoints: this.controlPoints.map(p => ({ x: p.x, y: p.y })),
      closed: this.closed
    }
  }

  static fromJSON(data) {
    const points = data.controlPoints.map(p => new THREE.Vector2(p.x, p.y))
    return new BezierCurve(points, data.closed)
  }
}