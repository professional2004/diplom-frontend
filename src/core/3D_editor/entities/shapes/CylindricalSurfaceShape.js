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
        [-1, 0],
        [1, 0]
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

  // 2D -> Vector3 (лежит в плоскости X-Y, Z=0)
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

createMesh() {
    const { width } = this.params
    const polyline2D = this.params.polyline?.length >= 2
      ? this.params.polyline
      : this.defaultParams.polyline

    const polyline = this._toVec3Array(polyline2D)
    const n = polyline.length

    const leftRightVerts = []

    for (let i = 0; i < n; i++) {
      const cur = polyline[i]

      let dir = new THREE.Vector3()
      if (i === 0) dir.copy(polyline[i + 1]).sub(cur)
      else if (i === n - 1) dir.copy(cur).sub(polyline[i - 1])
      else dir.addVectors(
        polyline[i + 1].clone().sub(cur),
        cur.clone().sub(polyline[i - 1])
      )

      dir.normalize()

      // ширина уходит по оси Z (перпендикуляр к плоскости основания)
      const lat = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1))
      lat.normalize().multiplyScalar(width / 2)

      leftRightVerts.push([
        cur.clone().sub(lat),
        cur.clone().add(lat)
      ])
    }

    const positions = []
    const indices = []
    const uvs = []

    for (let i = 0; i < n; i++) {
      const [l, r] = leftRightVerts[i]
      positions.push(l.x, l.y, l.z, r.x, r.y, r.z)
      uvs.push(i / (n - 1), 0, i / (n - 1), 1)
    }

    for (let i = 0; i < n - 1; i++) {
      const i0 = i * 2
      indices.push(i0, i0 + 2, i0 + 1)
      indices.push(i0 + 2, i0 + 3, i0 + 1)
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geom.setIndex(indices)
    geom.computeVertexNormals()

    const mat = this.getStandardMaterial()
    mat.side = THREE.DoubleSide

    const mesh = new THREE.Mesh(geom, mat)
    mesh.userData.shapeType = 'cylindrical'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    return mesh
  }

  createUnfold2D() {
    const polyline = this.params.polyline?.length >= 2
      ? this._toVec3Array(this.params.polyline)
      : this._toVec3Array(this.defaultParams.polyline)

    const { lens, total } = this._computeArcLengths(polyline)
    const width = this.params.width

    const group = new THREE.Group()

    const rect = [
      new THREE.Vector3(0, -width / 2, 0),
      new THREE.Vector3(total, -width / 2, 0),
      new THREE.Vector3(total, width / 2, 0),
      new THREE.Vector3(0, width / 2, 0),
      new THREE.Vector3(0, -width / 2, 0)
    ]

    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(rect),
      new THREE.LineBasicMaterial({ color: 0x999999 })
    ))

    return group
  }
}