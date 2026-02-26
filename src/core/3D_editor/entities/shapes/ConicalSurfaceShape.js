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
      polygon: [
        [0, 0.5],
        [1.8, 0.5],
        [1.8, 1.5],
        [0, 1.5]
      ],
      posX: 0, posY: 0, posZ: 0,
      rotationX: 0, rotationY: 0, rotationZ: 0
    }
  }

  get parameterDefinitions() {
    return {
      basePolyline: { label: 'Ломаная основания', type: 'object' },
      apex: { label: 'Вершина (X,Y,Z)', type: 'object' },
      polygon: { label: 'Ограничивающий многоугольник (X,Y)', type: 'object' },
      posX: { label: 'Позиция X', type: 'number', step: 0.1 },
      posY: { label: 'Позиция Y', type: 'number', step: 0.1 },
      posZ: { label: 'Позиция Z', type: 'number', step: 0.1 },
      rotationX: { label: 'Поворот X (рад)', type: 'number', step: 0.1 },
      rotationY: { label: 'Поворот Y (рад)', type: 'number', step: 0.1 },
      rotationZ: { label: 'Поворот Z (рад)', type: 'number', step: 0.1 }
    }
  }

  _toVec3Array(poly) {
    return poly.map(p => new THREE.Vector3(p[0], 0, p[1]))
  }

  _computeUnroll() {
    const base2D = this.params.basePolyline?.length >= 2 ? this.params.basePolyline : this.defaultParams.basePolyline
    const base = this._toVec3Array(base2D)
    const apex = new THREE.Vector3(...(this.params.apex || this.defaultParams.apex))

    const L = base.map(p => p.distanceTo(apex))
    const P2D = []
    let currentTheta = 0

    P2D.push(new THREE.Vector2(L[0] * Math.cos(currentTheta), L[0] * Math.sin(currentTheta)))
    const thetas = [currentTheta]

    for (let i = 0; i < base.length - 1; i++) {
      const b = base[i].distanceTo(base[i+1])
      let cosAlpha = (L[i]*L[i] + L[i+1]*L[i+1] - b*b) / (2 * L[i] * L[i+1])
      cosAlpha = Math.max(-1, Math.min(1, cosAlpha)) 
      const alpha = Math.acos(cosAlpha)
      currentTheta += alpha
      thetas.push(currentTheta)
      P2D.push(new THREE.Vector2(L[i+1] * Math.cos(currentTheta), L[i+1] * Math.sin(currentTheta)))
    }

    return { base, apex, L, P2D, thetas }
  }

  // Алгоритм Сазерленда-Ходжмена для отсечения 2D-полигона лучом из начала координат (0,0)
  _clipAgainstRay(poly, ray, isLeft) {
    if (poly.length < 3) return []
    const result = []

    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i]
      const next = poly[(i + 1) % poly.length]

      // Векторное произведение для определения стороны
      const crossCur = ray.x * cur.y - ray.y * cur.x
      const crossNext = ray.x * next.y - ray.y * next.x

      const isCurInside = isLeft ? crossCur >= -1e-8 : crossCur <= 1e-8
      const isNextInside = isLeft ? crossNext >= -1e-8 : crossNext <= 1e-8

      if (isCurInside) {
        result.push(cur)
      }

      // Если грань пересекает луч отсечения
      if (isCurInside !== isNextInside) {
        const Nx = -ray.y
        const Ny = ray.x
        const denom = Nx * (next.x - cur.x) + Ny * (next.y - cur.y)

        // Предотвращение деления на ноль для параллельных отрезков
        if (Math.abs(denom) > 1e-12) {
          const t = -(Nx * cur.x + Ny * cur.y) / denom
          result.push(new THREE.Vector2(
            cur.x + t * (next.x - cur.x),
            cur.y + t * (next.y - cur.y)
          ))
        }
      }
    }
    return result
  }

  createMesh() {
    const { base, apex, P2D } = this._computeUnroll()
    const polygonRaw = this.params.polygon || this.defaultParams.polygon

    // Переводим исходный полигон в Vector2
    const polygon2D = polygonRaw.map(p => new THREE.Vector2(p[0], p[1]))

    const allPositions = []
    const allIndices = []
    let vertexOffset = 0

    // Проходим по каждой панели (грани) развернутого конуса
    for (let sec = 0; sec < P2D.length - 1; sec++) {
      const ray1 = P2D[sec]
      const ray2 = P2D[sec + 1]

      // Определитель для аффинного преобразования (2D в 3D)
      const det = ray1.x * ray2.y - ray1.y * ray2.x
      if (Math.abs(det) < 1e-10) continue // Пропускаем схлопнутые участки

      // Отсекаем полигон для текущего конического сектора
      let polySector = this._clipAgainstRay(polygon2D, ray1, true)   // Отсекаем левым лучом
      polySector = this._clipAgainstRay(polySector, ray2, false)     // Отсекаем правым лучом

      // Убираем дублирующиеся вершины для надежности триангулятора Three.js
      const cleanedSector = []
      for (let i = 0; i < polySector.length; i++) {
        const p = polySector[i]
        const prev = polySector[i === 0 ? polySector.length - 1 : i - 1]
        if (p.distanceToSquared(prev) > 1e-10) {
          cleanedSector.push(p)
        }
      }

      if (cleanedSector.length < 3) continue

      // Создаем геометрию строго в пределах одной математической плоскости
      const shape = new THREE.Shape()
      shape.moveTo(cleanedSector[0].x, cleanedSector[0].y)
      for (let i = 1; i < cleanedSector.length; i++) {
        shape.lineTo(cleanedSector[i].x, cleanedSector[i].y)
      }
      shape.closePath()

      const geom = new THREE.ShapeGeometry(shape)
      const posAttr = geom.attributes.position
      const indexAttr = geom.index

      const v0 = new THREE.Vector3().subVectors(base[sec], apex)
      const v1 = new THREE.Vector3().subVectors(base[sec + 1], apex)

      // Точно проецируем каждую точку 2D из плоскости сектора в 3D
      for (let i = 0; i < posAttr.count; i++) {
        const px = posAttr.getX(i)
        const py = posAttr.getY(i)

        // Аффинные координаты (математически точная версия барицентрических)
        const u = (px * ray2.y - py * ray2.x) / det
        const v = (ray1.x * py - ray1.y * px) / det

        const p3D = new THREE.Vector3().copy(apex)
        p3D.addScaledVector(v0, u)
        p3D.addScaledVector(v1, v)

        allPositions.push(p3D.x, p3D.y, p3D.z)
      }

      // Собираем общие индексы
      if (indexAttr) {
        for (let i = 0; i < indexAttr.count; i++) {
          allIndices.push(indexAttr.getX(i) + vertexOffset)
        }
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          allIndices.push(i + vertexOffset)
        }
      }
      vertexOffset += posAttr.count
    }

    const meshGeom = new THREE.BufferGeometry()
    if (allPositions.length > 0) {
      meshGeom.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3))
      meshGeom.setIndex(allIndices)
      meshGeom.computeVertexNormals() // Вектора нормали будут высчитаны для граней корректно
    }

    const mat = this.getStandardMaterial()
    mat.side = THREE.DoubleSide
    const mesh = new THREE.Mesh(meshGeom, mat)

    mesh.userData.owner = this 
    mesh.userData.shapeType = 'conical'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    this.applyTransformToMesh(mesh)
    return mesh
  }

  createUnfold2D() {
    const group = new THREE.Group()
    const { P2D } = this._computeUnroll()
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
}