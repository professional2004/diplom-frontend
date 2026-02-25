import * as THREE from 'three'
import { BaseShape } from '../BaseShape'

export class ConicalSurfaceShape extends BaseShape {
  get defaultParams() {
    return {
      basePolyline: [
        [-1, 0],
        [0, 0],
        [1, 0]
      ],
      apex: [0, 1.5, 1],
      // Валидный полярный многоугольник по умолчанию
      polygon: [
        [0, 0.5],
        [1.8, 0.5],
        [1.8, 1.5],
        [0, 1.5]
      ]
    }
  }

  get parameterDefinitions() {
    return {
      basePolyline: { label: 'Ломаная основания', type: 'object' },
      apex: { label: 'Вершина (X,Y,Z)', type: 'object' },
      polygon: { label: 'Ограничивающий многоугольник (X,Y)', type: 'object' }
    }
  }

  _toVec3Array(poly) {
    return poly.map(p => new THREE.Vector3(p[0], 0, p[1]))
  }

  // Математическое вычисление точной плоской развертки ("веера")
  _computeUnroll() {
    const base2D = this.params.basePolyline?.length >= 2 ? this.params.basePolyline : this.defaultParams.basePolyline
    const base = this._toVec3Array(base2D)
    const apex = new THREE.Vector3(...(this.params.apex || this.defaultParams.apex))

    const L = base.map(p => p.distanceTo(apex)) // длины лучей к вершине
    const P2D = []
    let currentTheta = 0

    // Вершина в 2D развертке находится в начале координат (0,0)
    P2D.push(new THREE.Vector2(L[0] * Math.cos(currentTheta), L[0] * Math.sin(currentTheta)))
    const thetas = [currentTheta]

    for (let i = 0; i < base.length - 1; i++) {
      const b = base[i].distanceTo(base[i+1]) // длина сегмента основания
      // Теорема косинусов для нахождения угла развернутого треугольника
      let cosAlpha = (L[i]*L[i] + L[i+1]*L[i+1] - b*b) / (2 * L[i] * L[i+1])
      cosAlpha = Math.max(-1, Math.min(1, cosAlpha)) 
      const alpha = Math.acos(cosAlpha)
      currentTheta += alpha
      thetas.push(currentTheta)
      P2D.push(new THREE.Vector2(L[i+1] * Math.cos(currentTheta), L[i+1] * Math.sin(currentTheta)))
    }

    return { base, apex, L, P2D, thetas }
  }

  // Барицентрические координаты для проекции из 2D развертки в 3D
  _getBarycentric(p, a, b, c) {
    const v0 = new THREE.Vector2().subVectors(b, a)
    const v1 = new THREE.Vector2().subVectors(c, a)
    const v2 = new THREE.Vector2().subVectors(p, a)
    const d00 = v0.dot(v0)
    const d01 = v0.dot(v1)
    const d11 = v1.dot(v1)
    const d20 = v2.dot(v0)
    const d21 = v2.dot(v1)
    const denom = d00 * d11 - d01 * d01
    if (denom === 0) return { u: 0, v: 0, w: 1 }
    const v = (d11 * d20 - d01 * d21) / denom
    const w = (d00 * d21 - d01 * d20) / denom
    const u = 1.0 - v - w
    return { u, v, w }
  }

  createMesh() {
    const { base, apex, P2D, thetas } = this._computeUnroll()
    const polygonRaw = this.params.polygon || this.defaultParams.polygon

    const shape = new THREE.Shape()
    if (polygonRaw.length >= 3) {
      shape.moveTo(polygonRaw[0][0], polygonRaw[0][1])
      for (let i = 1; i < polygonRaw.length; i++) {
        shape.lineTo(polygonRaw[i][0], polygonRaw[i][1])
      }
      shape.closePath()
    }

    const geom = new THREE.ShapeGeometry(shape)
    const posAttribute = geom.attributes.position
    const apex2D = new THREE.Vector2(0, 0)

    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i)
      const y = posAttribute.getY(i)
      const pt2D = new THREE.Vector2(x, y)

      // Определяем угол в развертке
      let phi = Math.atan2(y, x)
      if (phi < 0 && thetas[thetas.length-1] > Math.PI) {
         if (phi < 0) phi += Math.PI * 2
      }

      // Ищем, в каком 2D-треугольнике веера лежит точка
      let sec = 0
      for (let j = 0; j < thetas.length - 1; j++) {
        if (phi >= thetas[j] && phi <= thetas[j+1]) {
          sec = j
          break
        }
        if (phi > thetas[j+1]) sec = j
      }

      // Получаем веса вершины, и двух точек основания
      const { u: wA, v: w0, w: w1 } = this._getBarycentric(pt2D, apex2D, P2D[sec], P2D[sec+1])

      // Смешиваем те же веса для 3D вершин
      const p3D = new THREE.Vector3()
      p3D.addScaledVector(apex, wA)
      p3D.addScaledVector(base[sec], w0)
      p3D.addScaledVector(base[sec+1], w1)

      posAttribute.setXYZ(i, p3D.x, p3D.y, p3D.z)
    }

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
    const group = new THREE.Group()
    const { P2D } = this._computeUnroll()
    const mat = this.getLineMaterial()

    // 1. Отрисовка ограничивающего многоугольника (развертка)
    const polygonRaw = this.params.polygon || this.defaultParams.polygon
    if (polygonRaw.length >= 3) {
      const points = polygonRaw.map(p => new THREE.Vector3(p[0], p[1], 0))
      points.push(points[0].clone())
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      group.add(new THREE.Line(geo, mat))
    }

    // 2. Отрисовка "скелета" конуса тонкими линиями
    const faintMat = new THREE.LineBasicMaterial({ color: 0xcccccc })
    const apexPt = new THREE.Vector3(0, 0, 0)
    
    // Дуга (ломаная основания)
    const baseGeoPoints = P2D.map(p => new THREE.Vector3(p.x, p.y, 0))
    const baseGeo = new THREE.BufferGeometry().setFromPoints(baseGeoPoints)
    group.add(new THREE.Line(baseGeo, faintMat))

    // Лучи от вершины
    for (let i = 0; i < P2D.length; i++) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([apexPt, new THREE.Vector3(P2D[i].x, P2D[i].y, 0)])
      group.add(new THREE.Line(lineGeo, faintMat))
    }

    return group
  }
}