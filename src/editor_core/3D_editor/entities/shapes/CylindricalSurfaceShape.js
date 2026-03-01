import * as THREE from 'three'

export class CylindricalSurfaceShape {
  constructor(params = {}) {
    this.params = { ...this.defaultParams, ...params }
  }

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

    const polygonRaw = this.params.polygon || this.defaultParams.polygon
    if (polygonRaw.length >= 3) {
      const points = polygonRaw.map(p => new THREE.Vector3(p[0], p[1], 0))
      points.push(points[0].clone())
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      group.add(new THREE.Line(geo, mat))
    }

    return group
  }


  // Вспомогательный метод для проецирования одной 2D точки в 3D
  _mapPointTo3D(u, v, lens, polyline) {
    let sec = 0
    for (let j = 0; j < lens.length - 1; j++) {
      if (u >= lens[j] && u <= lens[j+1]) {
        sec = j
        break
      }
      if (u > lens[j+1]) sec = j
    }

    const L0 = lens[sec]
    const L1 = lens[sec + 1]
    const lenSec = L1 - L0
    const p0 = polyline[sec]
    const p1 = polyline[sec + 1]

    const t = lenSec > 0 ? Math.max(0, Math.min(1, (u - L0) / lenSec)) : 0

    return new THREE.Vector3(
      p0.x + (p1.x - p0.x) * t,
      v,
      p0.z + (p1.z - p0.z) * t
    )
  }

  getBoundaryEdges() {
    const polyline2D = this.params.polyline?.length >= 2 ? this.params.polyline : this.defaultParams.polyline
    const polyline = this._toVec3Array(polyline2D)
    const { lens } = this._computeArcLengths(polyline)
    const polygonRaw = this.params.polygon || this.defaultParams.polygon
    
    const edges = []
    if (polygonRaw.length < 3) return edges

    for (let i = 0; i < polygonRaw.length; i++) {
      const start2D = polygonRaw[i]
      const end2D = polygonRaw[(i + 1) % polygonRaw.length]
      
      const u1 = start2D[0], v1 = start2D[1]
      const u2 = end2D[0], v2 = end2D[1]
      
      const minU = Math.min(u1, u2)
      const maxU = Math.max(u1, u2)
      const points2D = [{ u: u1, v: v1, t: 0 }]
      
      // Ищем пересечения отрезка с вертикальными линиями сгиба
      for (let j = 1; j < lens.length - 1; j++) {
        const L = lens[j]
        // 1e-6 предотвращает баги с плавающей запятой на границах
        if (L > minU + 1e-6 && L < maxU - 1e-6) {
          const t = (L - u1) / (u2 - u1)
          const v = v1 + t * (v2 - v1)
          points2D.push({ u: L, v: v, t: t })
        }
      }
      
      points2D.push({ u: u2, v: v2, t: 1 })
      points2D.sort((a, b) => a.t - b.t) // Упорядочиваем по направлению от start к end
      
      // Конвертируем все 2D узлы ребра в 3D полилинию
      const points3D = points2D.map(p => this._mapPointTo3D(p.u, p.v, lens, polyline))
      
      // Считаем истинную 3D длину
      let length = 0
      for (let k = 0; k < points3D.length - 1; k++) {
        length += points3D[k].distanceTo(points3D[k+1])
      }

      edges.push({
        id: `cyl_edge_${i}`,
        index: i,
        points3D: points3D,
        length: length
      })
    }
    return edges
  }
  
  
  // --------- общие для shapes методы ----------

  // Применяет позицию и ротацию к меше на основе параметров
  applyTransformToMesh(mesh) {
    if (!mesh) return

    // Применяем позицию
    const posX = this.params.posX ?? 0
    const posY = this.params.posY ?? mesh.position.y // сохраняем оригинальное Y если не заданы параметры
    const posZ = this.params.posZ ?? 0

    mesh.position.set(posX, posY, posZ)

    // Применяем ротацию
    const rotX = this.params.rotationX ?? 0
    const rotY = this.params.rotationY ?? 0
    const rotZ = this.params.rotationZ ?? 0

    mesh.rotation.set(rotX, rotY, rotZ, 'XYZ')
  }

  // Вспомогательный метод для материалов
  getStandardMaterial() {
    return new THREE.MeshStandardMaterial({ 
      color: Math.random() * 0xffffff,
      metalness: 0.1,
      roughness: 0.5
    })
  }

  getLineMaterial() {
    return new THREE.LineBasicMaterial({ color: 0x333333 })
  }


  // Получение конкретного ребра по индексу
  getEdgeByIndex(index) {
    const edges = this.getBoundaryEdges();
    return edges.find(e => e.index === index) || null;
  }

  // Получение ребра в мировых координатах (с учетом позиции и поворота фигуры)
  getWorldEdge(index, mesh) {
    const edge = this.getEdgeByIndex(index);
    if (!edge || !mesh) return null;

    // Обновляем матрицы меша перед вычислениями
    mesh.updateMatrixWorld(true);

    const worldPoints = edge.points3D.map(p => {
      const wp = p.clone();
      wp.applyMatrix4(mesh.matrixWorld);
      return wp;
    });

    return {
      ...edge,
      points3D: worldPoints
    };
  }
}
