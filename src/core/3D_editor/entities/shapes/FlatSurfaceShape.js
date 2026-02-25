import * as THREE from 'three'
import { BaseShape } from '../BaseShape'

/**
 * FlatSurfaceShape
 *
 * Параметры:
 *  - width, height: габариты ограничивающего прямоугольника (локальная система, центр в [0,0])
 *  - polygon: массив 2D-точек [[x,y], ...] в той же локальной системе координат (x in [-width/2..width/2], y in [-height/2..height/2])
 *  - thickness: небольшая толщина (чтобы получить видимый Mesh); по умолчанию 0.01
 *
 * Использует THREE.Shape + ExtrudeGeometry для создания тонкой 3D-плоскости (двусторонняя).
 */
export class FlatSurfaceShape extends BaseShape {
  get defaultParams() {
    return {
      width: 2,
      height: 1.5,
      thickness: 0.01,
      // polygon по умолчанию — прямоугольник, совпадающий с ограничивающим прямоугольником
      polygon: [
        [-1, -0.75],
        [1, -0.75],
        [1, 0.75],
        [-1, 0.75]
      ]
    }
  }

  get parameterDefinitions() {
    return {
      width: { label: 'Ширина', type: 'number', min: 0.001, step: 0.01 },
      height: { label: 'Высота', type: 'number', min: 0.001, step: 0.01 },
      thickness: { label: 'Толщина (видимость)', type: 'number', min: 0.0001, step: 0.001 },
      polygon: { label: 'Ограничивающий многоугольник', type: 'object' }
    }
  }

  _normalizePolygon(polygon, width, height) {
    // Принимаем два формата точек: [x,y] в абсолютных координатах или относительных.
    // Если polygon полностью лежит внутри [-width/2..width/2]x[-height/2..height/2] — оставляем as is.
    // Если координаты выглядят в диапазоне [0..1], интерпретируем как относительные (0..1 -> -w/2..w/2)
    const allBetween0and1 = polygon.every(p => p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1)
    if (allBetween0and1) {
      return polygon.map(p => [
        (p[0] - 0.5) * width,
        (p[1] - 0.5) * height
      ])
    }
    // иначе предполагаем уже абсолютные координаты
    return polygon
  }

  createMesh() {
    const { width, height, thickness } = this.params
    const polygonRaw = (this.params.polygon || []).slice()
    const polygon = this._normalizePolygon(polygonRaw, width, height)

    // Создаём THREE.Shape из polygon
    const shape = new THREE.Shape()
    if (!polygon || polygon.length < 3) {
      // fallback — прямоугольник
      const hw = width / 2, hh = height / 2
      shape.moveTo(-hw, -hh)
      shape.lineTo(hw, -hh)
      shape.lineTo(hw, hh)
      shape.lineTo(-hw, hh)
      shape.closePath()
    } else {
      shape.moveTo(polygon[0][0], polygon[0][1])
      for (let i = 1; i < polygon.length; i++) {
        shape.lineTo(polygon[i][0], polygon[i][1])
      }
      shape.closePath()
    }

    // Экструдируем очень тонко, делаем дважды сторонний материал
    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: false,
      steps: 1
    }
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geom.computeVertexNormals()

    const mat = this.getStandardMaterial()
    mat.side = THREE.DoubleSide

    const mesh = new THREE.Mesh(geom, mat)
    mesh.userData.shapeType = 'flat'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    // Смещаем так, чтобы нижняя поверхность лежала на Y=0 (толщина по положительному Z у ExtrudeGeometry — но мы хотим Y как "вверх")
    // В нашем проекте Y — вертикаль, поэтому повернём геометрию: Extrude создаёт вдоль Z, так повернём так, чтобы Z->Y.
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = thickness / 2

    return mesh
  }

  createUnfold2D() {
    const { width, height } = this.params
    const polygon = this._normalizePolygon(this.params.polygon || this.defaultParams.polygon, width, height)

    const group = new THREE.Group()
    const mat = this.getLineMaterial()

    const points = polygon.map(p => new THREE.Vector3(p[0], p[1], 0))
    // замыкание
    if (points.length > 0) points.push(points[0].clone())

    const geom = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(geom, mat)
    group.add(line)

    // Добавим рамку ограничивающего прямоугольника для визуального контроля
    const hw = width / 2, hh = height / 2
    const rectPts = [
      new THREE.Vector3(-hw, -hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(hw, hh, 0),
      new THREE.Vector3(-hw, hh, 0),
      new THREE.Vector3(-hw, -hh, 0)
    ]
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rectPts), new THREE.LineBasicMaterial({ color: 0x999999 })))

    return group
  }
}