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
  
  Создает 3D Mesh методом "Elastic Grid":
  
  Создаем плотную сетку (чтобы поверхность могла гнуться).
  
  Удаляем полигоны, которые целиком снаружи контура.
  
  Вершины на краях "притягиваем" к контуру Безье (убираем зубчатость).
  
  Маппим полученную плотную геометрию в 3D. */

  createMesh() {
    // 1. Получаем точный контур 
    const contourPoints = this.stripContour.getPoints(200) // 200 точек для высокой точности края

    // 2. Определяем границы и создаем плотную сетку
    const bounds = this.getUnfoldBounds()
    // Плотность сетки: чем выше, тем лучше сгибается, но тяжелее рендер. 60x60 - хороший баланс.
    const SEGMENTS_X = 64
    const SEGMENTS_Y = 64

    const geometry = new THREE.PlaneGeometry(bounds.width, bounds.height, SEGMENTS_X, SEGMENTS_Y)

    // Сдвигаем сетку в нужные координаты (PlaneGeometry создается в 0,0)
    const centerX = bounds.min.x + bounds.width / 2
    const centerY = bounds.min.y + bounds.height / 2
    geometry.translate(centerX, centerY, 0)

    // 3. Отсечение и Снэппинг (Главная магия)
    const success = this._processGridGeometry(geometry, contourPoints)

    if (!success) {
      // Fallback на случай, если фигура слишком мелкая для сетки
      return new THREE.Mesh()
    }

    // 4. Маппинг в 3D (сворачивание)
    const posAttribute = geometry.attributes.position
    const vertex = new THREE.Vector3()

    for (let i = 0; i < posAttribute.count; i++) {
      vertex.fromBufferAttribute(posAttribute, i)

      // Используем координаты плоской сетки как входные данные для маппинга
      const p3d = this.baseSurface.mapUVTo3D(vertex.x, vertex.y)

      posAttribute.setXYZ(i, p3d.x, p3d.y, p3d.z)
    }

    geometry.computeVertexNormals()

    // Материал
    const mat = new THREE.MeshStandardMaterial({
      color: 0x156289,
      emissive: 0x072534,
      side: THREE.DoubleSide,
      flatShading: false, // Важно false для гладкого цилиндра/конуса
      metalness: 0.1,
      roughness: 0.5
    })

    const mesh = new THREE.Mesh(geometry, mat)
    this._setupUserData(mesh)
    return mesh
  }

  /**
  
  Фильтрует грани сетки и притягивает граничные вершины к контуру */

  _processGridGeometry(geometry, contourPoints) {
    const posAttr = geometry.attributes.position
    const indexAttr = geometry.index

    // Вспомогательный массив для быстрого теста "Точка внутри полигона"
    // Используем THREE.ShapeUtils или простую проекцию
    // Преобразуем контур в формат для ShapeUtils
    const shape = new THREE.Shape(contourPoints.map(p => new THREE.Vector2(p.x, p.y)))

    // --- Шаг A: Удаление лишних граней (Culling) ---
    const newIndices = []
    const faceCount = indexAttr.count / 3
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3()
    const centroid = new THREE.Vector2()

    // Карта использования вершин: vertexIndex -> boolean
    const usedVertices = new Set()

    for (let i = 0; i < faceCount; i++) {
      const a = indexAttr.getX(3 * i)
      const b = indexAttr.getY(3 * i)
      const c = indexAttr.getZ(3 * i)

      vA.fromBufferAttribute(posAttr, a)
      vB.fromBufferAttribute(posAttr, b)
      vC.fromBufferAttribute(posAttr, c)

      // Считаем центроид треугольника
      centroid.set((vA.x + vB.x + vC.x) / 3, (vA.y + vB.y + vC.y) / 3)

      // Проверяем, внутри ли центроид
      if (this._isPointInShape(centroid, contourPoints)) {
        newIndices.push(a, b, c)
        usedVertices.add(a)
        usedVertices.add(b)
        usedVertices.add(c)
      }
    }

    if (newIndices.length === 0) return false

    // Обновляем индексы геометрии
    geometry.setIndex(newIndices)

    // --- Шаг B: Поиск граничных ребер (Boundary Edges) ---
    // Граничное ребро - это ребро, которое используется только в 1 треугольнике
    const edgeCounts = new Map() // key: "min_max", value: count

    for (let i = 0; i < newIndices.length; i += 3) {
      const idx = [newIndices[i], newIndices[i + 1], newIndices[i + 2]]
      for (let j = 0; j < 3; j++) {
        const i1 = idx[j]
        const i2 = idx[(j + 1) % 3]
        const key = i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`
        edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1)
      }
    }

    // Собираем все вершины, принадлежащие граничным ребрам
    const boundaryVertices = new Set()
    edgeCounts.forEach((count, key) => {
      if (count === 1) { // Это внешний край
        const [i1, i2] = key.split('_').map(Number)
        boundaryVertices.add(i1)
        boundaryVertices.add(i2)
      }
    })

    // --- Шаг C: Притягивание (Snapping) граничных вершин ---
    const pTemp = new THREE.Vector2()

    boundaryVertices.forEach(vIdx => {
      pTemp.fromBufferAttribute(posAttr, vIdx)

      // Находим ближайшую точку на контуре
      let minDistSq = Infinity
      let closestPoint = contourPoints[0]

      // Простой перебор точек контура (достаточно быстро для 200 точек)
      for (let i = 0; i < contourPoints.length; i++) {
        const cp = contourPoints[i]
        const dx = cp.x - pTemp.x
        const dy = cp.y - pTemp.y
        const dSq = dx * dx + dy * dy
        if (dSq < minDistSq) {
          minDistSq = dSq
          closestPoint = cp
        }
      }

      // Перемещаем вершину точно на контур
      posAttr.setXY(vIdx, closestPoint.x, closestPoint.y)
    })

    posAttr.needsUpdate = true
    return true
  }

  // Простая проверка point-in-polygon (ray casting) 
  _isPointInShape(point, vs) {
    let inside = false
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i].x, yi = vs[i].y
      const xj = vs[j].x, yj = vs[j].y

      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }

  _createDefaultStripContour() {
    const outline = this.baseSurface.getUnfoldOutline()
    if (outline && outline.length > 0) {
      const box = new THREE.Box2().setFromPoints(outline)
      const w = box.max.x - box.min.x
      const h = box.max.y - box.min.y
      const marginX = w * 0.1
      const marginY = h * 0.1

      const p1 = new THREE.Vector2(box.min.x + marginX, box.min.y + marginY)
      const p2 = new THREE.Vector2(box.max.x - marginX, box.min.y + marginY)
      const p3 = new THREE.Vector2(box.max.x - marginX, box.max.y - marginY)
      const p4 = new THREE.Vector2(box.min.x + marginX, box.max.y - marginY)
      return new BezierCurve([p1, p2, p3, p4], true)
    }
    return new BezierCurve([new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1), new THREE.Vector2(0, 1)], true)
  }

  _setupUserData(mesh) {
    mesh.userData.surfaceType = this.surfaceType.endsWith('-strip') 
      ? this.surfaceType 
      : `${this.surfaceType}-strip`
    mesh.userData.isStrip = true
    mesh.userData.stripData = this.toJSON()
    mesh.userData.selectable = true
  }

  createUnfold2D() {
    const group = this.baseSurface.createUnfold2D()
    this._addStripContourToUnfold(group)
    return group
  }

  _addStripContourToUnfold(group) {
    const points = this.stripContour.getPoints(100)
    const pts3 = points.map(p => new THREE.Vector3(p.x, p.y, 0.05))
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts3), new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 }))
    group.add(line)
  }

  getUnfoldBounds() {
    const outline = this.getUnfoldOutlinePoints()
    if (!outline || outline.length === 0) { // Fallback bounds 
      return { min: { x: 0, y: 0 }, max: { x: 10, y: 10 }, width: 10, height: 10 }
    }
    const box = new THREE.Box2().setFromPoints(outline)
    return { min: box.min, max: box.max, width: box.max.x - box.min.x, height: box.max.y - box.min.y }
  }

  // Делегирование 
  getBaseCurve() {
    return this.baseSurface.getBaseCurve()
  }

  setBaseCurve(curve) {
    this.baseSurface.setBaseCurve(curve)
    this.surfaceParams = { ...this.baseSurface.params }
  }

  getStripContour() {
    return this.stripContour.clone()
  }

  setStripContour(contour) {
    this.stripContour = (contour instanceof BezierCurve) ? contour.clone() : BezierCurve.fromJSON(contour)
  }

  getUnfoldOutlinePoints() {
    return this.baseSurface.getUnfoldOutline()
  }

  toJSON() {
    return { type: 'strip', surfaceType: this.surfaceType, surfaceParams: this.surfaceParams, stripContourData: this.stripContour.toJSON() }
  }

  static fromJSON(data) {
    return new SurfaceStrip(data.surfaceType, data.surfaceParams, data.stripContourData)
  }
}