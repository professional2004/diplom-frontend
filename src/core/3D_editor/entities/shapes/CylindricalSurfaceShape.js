import * as THREE from 'three'
import { BaseShape } from '../BaseShape'

export class CylindricalSurfaceShape extends BaseShape {
  get defaultParams() {
    return {
      width: 0.5,
      polyline: [
        [-1, 0],
        [1, 0]
      ],
      polygon: [
        [0, -0.25],
        [1, -0.25],
        [1, 0.25],
        [0, 0.25]
      ],
      posX: 0,
      posY: 0,
      posZ: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0
    }
  }

  get parameterDefinitions() {
    return {
      width: { label: 'Ширина (для отображения рамки)', type: 'number', min: 0.001, step: 0.01 },
      polyline: { label: 'Ломаная основания', type: 'object' },
      polygon: { label: 'Ограничивающий многоугольник (u,v)', type: 'object' },
      posX: { label: 'Позиция X', type: 'number', step: 0.1 },
      posY: { label: 'Позиция Y', type: 'number', step: 0.1 },
      posZ: { label: 'Позиция Z', type: 'number', step: 0.1 },
      rotationX: { label: 'Поворот X (рад)', type: 'number', step: 0.1 },
      rotationY: { label: 'Поворот Y (рад)', type: 'number', step: 0.1 },
      rotationZ: { label: 'Поворот Z (рад)', type: 'number', step: 0.1 }
    }
  }

  _toVec3Array(polyline) {
    return polyline.map(p => new THREE.Vector3(p[0], 0, p[1]))
  }

  _computeArcLengths(pts) {
    const lens = [0]
    let acc = 0
    for (let i = 1; i < pts.length; i++) {
      acc += pts[i].distanceTo(pts[i - 1])
      lens.push(acc)
    }
    return { lens, total: acc }
  }

  // Метод, который разрезает массив треугольников вертикальной линией X = L
  _sliceTriangles(triangles, L) {
    const out = []
    
    for (let i = 0; i < triangles.length; i++) {
      const tri = triangles[i]
      
      const aL = tri[0].x < L
      const bL = tri[1].x < L
      const cL = tri[2].x < L

      // Если треугольник полностью по одну из сторон от линии реза — сохраняем как есть
      if ((aL && bL && cL) || (!aL && !bL && !cL)) {
        out.push(tri)
        continue
      }

      // Если треугольник пересекает линию реза, определяем изолированную вершину
      let v0, v1, v2
      if (bL === cL) { v0 = tri[0]; v1 = tri[1]; v2 = tri[2] }
      else if (aL === cL) { v0 = tri[1]; v1 = tri[2]; v2 = tri[0] }
      else { v0 = tri[2]; v1 = tri[0]; v2 = tri[1] }

      // Находим точки пересечения ребер с линией X = L
      const t1 = (L - v0.x) / (v1.x - v0.x)
      const i1 = { x: L, y: v0.y + t1 * (v1.y - v0.y) }

      const t2 = (L - v0.x) / (v2.x - v0.x)
      const i2 = { x: L, y: v0.y + t2 * (v2.y - v0.y) }

      // Разбиваем исходный треугольник пересекающий линию на 3 новых
      out.push([v0, i1, i2])
      out.push([v1, v2, i2])
      out.push([v1, i2, i1])
    }
    
    return out
  }

  createMesh() {
    const polyline2D = this.params.polyline?.length >= 2
      ? this.params.polyline
      : this.defaultParams.polyline

    const polyline = this._toVec3Array(polyline2D)
    const { lens } = this._computeArcLengths(polyline)

    const polygonRaw = this.params.polygon || this.defaultParams.polygon

    // 1. Создаем плоскую геометрию
    const shape = new THREE.Shape()
    if (polygonRaw.length >= 3) {
      shape.moveTo(polygonRaw[0][0], polygonRaw[0][1])
      for (let i = 1; i < polygonRaw.length; i++) {
        shape.lineTo(polygonRaw[i][0], polygonRaw[i][1])
      }
      shape.closePath()
    }

    const geom2D = new THREE.ShapeGeometry(shape)
    const pos2D = geom2D.attributes.position
    const index2D = geom2D.index

    // 2. Извлекаем сырые треугольники из полигона (в координатах u, v)
    let triangles = []
    if (index2D) {
      for (let i = 0; i < index2D.count; i += 3) {
        const a = index2D.getX(i)
        const b = index2D.getX(i + 1)
        const c = index2D.getX(i + 2)
        triangles.push([
          { x: pos2D.getX(a), y: pos2D.getY(a) },
          { x: pos2D.getX(b), y: pos2D.getY(b) },
          { x: pos2D.getX(c), y: pos2D.getY(c) }
        ])
      }
    } else {
      for (let i = 0; i < pos2D.count; i += 3) {
        triangles.push([
          { x: pos2D.getX(i), y: pos2D.getY(i) },
          { x: pos2D.getX(i + 1), y: pos2D.getY(i + 1) },
          { x: pos2D.getX(i + 2), y: pos2D.getY(i + 2) }
        ])
      }
    }

    // 3. Разрезаем все треугольники по линиям изгиба цилиндрической поверхности
    // Это ключевой шаг для математической точности
    for (let i = 1; i < lens.length - 1; i++) {
        triangles = this._sliceTriangles(triangles, lens[i])
    }

    // 4. Формируем финальную 3D геометрию
    const positions = new Float32Array(triangles.length * 9)
    let pIdx = 0

    for (let i = 0; i < triangles.length; i++) {
      const tri = triangles[i]

      // Поскольку мы разрезали треугольники по изгибам, каждый треугольник
      // теперь гарантированно лежит только внутри ОДНОГО прямого сегмента ломаной.
      // Найдем этот сегмент по центру масс треугольника по оси X (u).
      const cx = (tri[0].x + tri[1].x + tri[2].x) / 3
      
      let sec = 0
      for (let j = 0; j < lens.length - 1; j++) {
        if (cx >= lens[j] && cx <= lens[j+1]) {
          sec = j
          break
        }
        if (cx > lens[j+1]) sec = j
      }

      const L0 = lens[sec]
      const L1 = lens[sec + 1]
      const lenSec = L1 - L0
      const p0 = polyline[sec]
      const p1 = polyline[sec + 1]

      // Сворачиваем каждый вертекс треугольника в 3D
      for (let vIdx = 0; vIdx < 3; vIdx++) {
        const pt = tri[vIdx]
        
        // Ограничиваем t краями сегмента, чтобы избежать микро-погрешностей при float
        const t = lenSec > 0 ? Math.max(0, Math.min(1, (pt.x - L0) / lenSec)) : 0

        const x = p0.x + (p1.x - p0.x) * t
        const z = p0.z + (p1.z - p0.z) * t
        const y = pt.y 

        positions[pIdx++] = x
        positions[pIdx++] = y
        positions[pIdx++] = z
      }
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    geom.computeVertexNormals()

    const mat = this.getStandardMaterial()
    mat.side = THREE.DoubleSide

    const mesh = new THREE.Mesh(geom, mat)

    mesh.userData.owner = this 
    mesh.userData.shapeType = 'cylindrical'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    this.applyTransformToMesh(mesh)

    return mesh
  }

  createUnfold2D() {
    const group = new THREE.Group()
    const mat = this.getLineMaterial()

    // 1. Отрисовываем сам обрезающий многоугольник (это и есть точная развертка)
    const polygonRaw = this.params.polygon || this.defaultParams.polygon
    if (polygonRaw.length >= 3) {
      const points = polygonRaw.map(p => new THREE.Vector3(p[0], p[1], 0))
      points.push(points[0].clone())
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      group.add(new THREE.Line(geo, mat))
    }

    // 2. Вспомогательные линии (ось "позвоночника" развертки и засечки сегментов)
    const polyline2D = this.params.polyline?.length >= 2 ? this.params.polyline : this.defaultParams.polyline
    const polyline = this._toVec3Array(polyline2D)
    const { total, lens } = this._computeArcLengths(polyline)
    const faintMat = new THREE.LineBasicMaterial({ color: 0xcccccc })
    
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(total, 0, 0)]), 
      faintMat
    ))

    for (let L of lens) {
      group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(L, -0.1, 0), new THREE.Vector3(L, 0.1, 0)]), 
        faintMat
      ))
    }

    return group
  }
}
