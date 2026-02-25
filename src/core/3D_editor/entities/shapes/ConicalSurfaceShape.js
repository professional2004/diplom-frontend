import * as THREE from 'three'
import { BaseShape } from '../BaseShape'

/**
 * ConicalSurfaceShape
 *
 * Интерпретация: поверхность, получающаяся как соединение вершины (apex) с ломаной, задающей основание.
 *
 * Параметры:
 *  - basePolyline: массив точек [[x,y,z], ...] — линия основания, может быть замкнутой или открытой.
 *  - apex: [x,y,z] — координаты вершины (пирамида/конус).
 *  - polygon: ограничивающий многоугольник в параметрическом пространстве: [[u,v], ...]
 *      - u: относительное положение вдоль basePolyline (0..1)
 *      - v: радиальное смещение вдоль сегмента от базовой линии к вершине (в абсолютных единицах)
 *
 * createMesh:
 *  - для каждой пары соседних точек basePolyline создаём треугольник (base[i], base[i+1], apex)
 *  - если basePolyline замкнута — получаем поверхность, похожую на усечённую в плане пирамиду
 *
 * createUnfold2D:
 *  - развёртка упрощённая: каждое треугольное ребро разворачивается в отдельный треугольник на плоскости,
 *    и эти треугольники выстраиваются вдоль X (по накопленной длине основания).
 *
 * Примечание: развёртка конуса/пирамиды на произвольное основание — задача нетривиальная (нужна геометрическая засечка).
 * Здесь — практичная, визуально понятная развёртка для CAD/текстильного контекста.
 */
export class ConicalSurfaceShape extends BaseShape {
  get defaultParams() {
    return {
      basePolyline: [
        [-1, 0, 0],
        [0, 0, 0],
        [1, 0, 0]
      ],
      apex: [0, 1.5, 0],
      // polygon в параметрическом пространстве (u along base 0..1, v radial distance to apex — обычно 0..slant)
      polygon: [
        [0, 0],
        [1, 0]
      ]
    }
  }

  get parameterDefinitions() {
    return {
      basePolyline: { label: 'Ломаная основания', type: 'object' },
      apex: { label: 'Вершина (X,Y,Z)', type: 'object' },
      polygon: { label: 'Ограничивающий многоугольник (u,v)', type: 'object' }
    }
  }

  _asVector3Array(poly) {
    return poly.map(p => new THREE.Vector3(p[0], p[1], p[2] || 0))
  }

  createMesh() {
    const base = this._asVector3Array(this.params.basePolyline && this.params.basePolyline.length >= 2 ? this.params.basePolyline : this.defaultParams.basePolyline)
    const apex = new THREE.Vector3(...(this.params.apex || this.defaultParams.apex))

    const vertices = []
    const indices = []
    const normals = []

    // Вершина — последняя вершина в массиве вершин
    const apexIndex = base.length
    // Собираем позиции: сначала все точки основания, потом вершина
    for (let i = 0; i < base.length; i++) {
      vertices.push(base[i].x, base[i].y, base[i].z)
    }
    vertices.push(apex.x, apex.y, apex.z)

    // Создаём треугольники между соседями и вершиной
    const closed = base.length > 2 && base[0].distanceTo(base[base.length - 1]) < 1e-6
    const segCount = closed ? base.length : base.length - 1
    for (let i = 0; i < segCount; i++) {
      const a = i
      const b = (i + 1) % base.length
      indices.push(a, b, apexIndex)
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geom.setIndex(indices)
    geom.computeVertexNormals()

    const mat = this.getStandardMaterial()
    mat.side = THREE.DoubleSide

    const mesh = new THREE.Mesh(geom, mat)
    mesh.userData.shapeType = 'conical'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    return mesh
  }

  createUnfold2D() {
    // Простая развёртка: для каждого сегмента основания создаём треугольник с основанием = длина сегмента,
    // высотой = расстояние апекса до середины сегмента (приближённо — длина наклонного ребра).
    const baseRaw = this.params.basePolyline && this.params.basePolyline.length >= 2 ? this.params.basePolyline : this.defaultParams.basePolyline
    const base = this._asVector3Array(baseRaw)
    const apex = new THREE.Vector3(...(this.params.apex || this.defaultParams.apex))

    const group = new THREE.Group()
    const lineMat = this.getLineMaterial()

    let cursorX = 0
    const triangles = []

    const closed = base.length > 2 && base[0].distanceTo(base[base.length - 1]) < 1e-6
    const segCount = closed ? base.length : base.length - 1

    for (let i = 0; i < segCount; i++) {
      const a = base[i]
      const b = base[(i + 1) % base.length]
      const segLen = a.distanceTo(b)
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
      const slantA = apex.distanceTo(a)
      const slantB = apex.distanceTo(b)
      // приблизительная высота треугольника в развёртке:
      const h = Math.max(slantA, slantB)

      // Треугольник будет с основанием вдоль X от cursorX до cursorX + segLen
      const tri = [
        new THREE.Vector3(cursorX, 0, 0),
        new THREE.Vector3(cursorX + segLen, 0, 0),
        new THREE.Vector3(cursorX + segLen / 2, h, 0)
      ]
      triangles.push(tri)
      cursorX += segLen
    }

    // Рисуем треугольники (как линии)
    triangles.forEach(tri => {
      const closedTri = tri.concat(tri[0].clone())
      const geom = new THREE.BufferGeometry().setFromPoints(closedTri)
      group.add(new THREE.Line(geom, lineMat))
    })

    return group
  }
}