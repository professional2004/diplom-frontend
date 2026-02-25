import * as THREE from 'three'
import { BaseShape } from '../BaseShape'

/**
 * CylindricalSurfaceShape
 *
 * Представление: гибкая лента (призма вдоль ломаной).
 *
 * Параметры:
 *  - polyline: массив точек [[x,y,z], ...] задаёт линию вдоль которой "натягивается" лента.
 *              Может быть открытой или замкнутой (если замкнута — последний ≈ первый).
 *  - width: ширина ленты
 *  - polygon: ограничивающий многоугольник в параметрическом пространстве поверхности: массив точек [[u, v], ...]
 *      - u в формате относительного положения вдоль ломаной (0..1)
 *      - v — смещение по ширине в локальных единицах (в диапазоне примерно [-width/2 .. width/2])
 *
 * Реализация createMesh:
 *  - строит двухвершинную полосу (строку треугольников) вдоль каждого узла ломаной: для каждого узла генерируем 2 вершины (лево/право).
 *  - коннектим секции соседних узлов в индексы треугольников.
 *
 * createUnfold2D:
 *  - развёртка: вдоль X — длина полилинии (arc length), по Y — ширина; polygon (u,v) -> (u*length, v)
 *
 * Примечание: polygon ожидается в относительных координатах u∈[0,1], v в абсолютных единицах (например -w/2..w/2).
 */
export class CylindricalSurfaceShape extends BaseShape {
  get defaultParams() {
    return {
      width: 0.5,
      // простая прямая ломаная по оси X длиной 2
      polyline: [
        [-1, 0, 0],
        [1, 0, 0]
      ],
      // polygon в параметрическом пространстве [u, v]
      polygon: [
        [0, -0.25],
        [1, -0.25],
        [1, 0.25],
        [0, 0.25]
      ],
      segmentsPerUnit: 10 // опция: больше -> более гладкая лента
    }
  }

  get parameterDefinitions() {
    return {
      width: { label: 'Ширина', type: 'number', min: 0.001, step: 0.01 },
      polyline: { label: 'Ломаная (polyline)', type: 'object' },
      polygon: { label: 'Ограничивающий многоугольник (u,v)', type: 'object' }
    }
  }

  _asVector3Array(polyline) {
    return polyline.map(p => new THREE.Vector3(p[0], p[1], p[2] || 0))
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

  createMesh() {
    const { width, polyline: rawPolyline, segmentsPerUnit } = this.params
    const polyline = this._asVector3Array(rawPolyline && rawPolyline.length >= 2 ? rawPolyline : this.defaultParams.polyline)

    // Упрощённый подход: используем именно узлы полилинии (нет subdivision между точками).
    // Для плавности можно интерполировать, но в большинстве случаев ломанная уже имеет нужную детализацию.
    const n = polyline.length
    if (n < 2) {
      // fallback — тонкая плоскость
      const flat = new THREE.PlaneGeometry(1, width, 1, 1)
      const mat = this.getStandardMaterial()
      mat.side = THREE.DoubleSide
      const mesh = new THREE.Mesh(flat, mat)
      mesh.userData.shapeType = 'cylindrical'
      mesh.userData.params = this.params
      mesh.userData.selectable = true
      return mesh
    }

    // Для каждого узла вычислим локальную нормаль-латеральный вектор:
    const leftRightVerts = [] // [ [leftVec], [rightVec] ] per node
    for (let i = 0; i < n; i++) {
      const cur = polyline[i]
      // направление касательной: усреднение соседних сегментов
      let dir = new THREE.Vector3()
      if (i === 0) dir.copy(polyline[i + 1]).sub(cur)
      else if (i === n - 1) dir.copy(cur).sub(polyline[i - 1])
      else {
        dir.addVectors(polyline[i + 1].clone().sub(cur), cur.clone().sub(polyline[i - 1]))
      }
      dir.normalize()
      // Ориентируем "ширину" перпендикулярно касательной. Выбираем вектор up (примерно мировая Y)
      const worldUp = new THREE.Vector3(0, 1, 0)
      let lat = new THREE.Vector3().crossVectors(dir, worldUp)
      if (lat.lengthSq() < 1e-6) {
        // касательная близка к Y — используем X как up
        lat = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0))
      }
      lat.normalize()
      lat.multiplyScalar(width / 2)
      leftRightVerts.push([cur.clone().sub(lat), cur.clone().add(lat)])
    }

    // Собираем буферы
    const positions = []
    const normals = []
    const uvs = []
    const indices = []

    // Упорядочим вершины: для каждого узла left then right
    for (let i = 0; i < n; i++) {
      const left = leftRightVerts[i][0]
      const right = leftRightVerts[i][1]
      positions.push(left.x, left.y, left.z)
      positions.push(right.x, right.y, right.z)
      // простые нормали: в сторону от центра ленты (приближённо)
      const normalLeft = new THREE.Vector3().subVectors(left, polyline[i]).normalize()
      const normalRight = new THREE.Vector3().subVectors(right, polyline[i]).normalize()
      normals.push(normalLeft.x, normalLeft.y, normalLeft.z)
      normals.push(normalRight.x, normalRight.y, normalRight.z)
      // uvs: u = относительное расстояние вдоль полилинии (будем вычислять ниже), v = 0/1
      uvs.push(i / (n - 1), 0)
      uvs.push(i / (n - 1), 1)
    }

    // Индексы (стрип из трапеций)
    for (let i = 0; i < n - 1; i++) {
      const i0 = i * 2
      const i1 = i0 + 1
      const i2 = i0 + 2
      const i3 = i0 + 3
      // два треугольника (i0,i2,i1) и (i2,i3,i1)
      indices.push(i0, i2, i1)
      indices.push(i2, i3, i1)
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geom.setIndex(indices)
    geom.computeBoundingBox()
    geom.computeBoundingSphere()
    geom.computeVertexNormals() // перезапишет нормали, но это ок

    const mat = this.getStandardMaterial()
    mat.side = THREE.DoubleSide

    const mesh = new THREE.Mesh(geom, mat)
    mesh.userData.shapeType = 'cylindrical'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    return mesh
  }

  createUnfold2D() {
    const { polyline: rawPolyline, width, polygon } = this.params
    const polyline = this._asVector3Array(rawPolyline && rawPolyline.length >= 2 ? rawPolyline : this.defaultParams.polyline)
    const { lens, total } = this._computeArcLengths(polyline)
    const group = new THREE.Group()
    const lineMat = this.getLineMaterial()

    // рамка: длина x ширина
    const rect = [
      new THREE.Vector3(0, -width / 2, 0),
      new THREE.Vector3(total, -width / 2, 0),
      new THREE.Vector3(total, width / 2, 0),
      new THREE.Vector3(0, width / 2, 0),
      new THREE.Vector3(0, -width / 2, 0)
    ]
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rect), new THREE.LineBasicMaterial({ color: 0x999999 })))

    // Рисуем полигон — интерпретируем (u,v) -> (u * total, v)
    const poly = (polygon && polygon.length >= 3) ? polygon : this.defaultParams.polygon
    const pts2D = poly.map(p => new THREE.Vector3((p[0] || 0) * total, p[1] || 0, 0))
    if (pts2D.length > 0) pts2D.push(pts2D[0].clone())
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2D), lineMat))

    // Для наглядности добавим отметки вдоль длинной оси (каждый узел полилинии)
    for (let i = 0; i < polyline.length; i++) {
      const x = lens[i]
      const mark = [
        new THREE.Vector3(x, -width / 2, 0),
        new THREE.Vector3(x, width / 2, 0)
      ]
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(mark), new THREE.LineDashedMaterial({ color: 0x666666, dashSize: 0.02, gapSize: 0.02 })))
    }

    return group
  }
}