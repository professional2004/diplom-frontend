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

  createMesh() {
    const polyline2D = this.params.polyline?.length >= 2
      ? this.params.polyline
      : this.defaultParams.polyline

    const polyline = this._toVec3Array(polyline2D)
    const { lens } = this._computeArcLengths(polyline)

    const polygonRaw = this.params.polygon || this.defaultParams.polygon

    // Создаем базовую плоскую геометрию из многоугольника
    const shape = new THREE.Shape()
    if (polygonRaw.length >= 3) {
      shape.moveTo(polygonRaw[0][0], polygonRaw[0][1])
      for (let i = 1; i < polygonRaw.length; i++) {
        shape.lineTo(polygonRaw[i][0], polygonRaw[i][1])
      }
      shape.closePath()
    }

    // Триангулируем многоугольник в UV пространстве
    const geom = new THREE.ShapeGeometry(shape)
    const posAttribute = geom.attributes.position

    // Искривляем каждую вершину: заворачиваем 2D координаты в 3D цилиндр
    for (let i = 0; i < posAttribute.count; i++) {
      const u = posAttribute.getX(i) // расстояние по кривой
      const v = posAttribute.getY(i) // высота

      // Ищем нужный сегмент ломаной
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
      const t = (L1 - L0) > 0 ? Math.max(0, Math.min(1, (u - L0) / (L1 - L0))) : 0

      const p0 = polyline[sec]
      const p1 = polyline[sec + 1]

      // Интерполируем позицию на плоскости (X, Z)
      const x = p0.x + (p1.x - p0.x) * t
      const z = p0.z + (p1.z - p0.z) * t
      const y = v // v соответствует высоте по оси Y

      posAttribute.setXYZ(i, x, y, z)
    }

    geom.computeVertexNormals()

    const mat = this.getStandardMaterial()
    mat.side = THREE.DoubleSide

    const mesh = new THREE.Mesh(geom, mat)

    mesh.userData.owner = this 
    
    mesh.userData.shapeType = 'cylindrical'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    // Применяем позицию и ротацию
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
    const polyline = this._toVec3Array(this.params.polyline?.length >= 2 ? this.params.polyline : this.defaultParams.polyline)
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