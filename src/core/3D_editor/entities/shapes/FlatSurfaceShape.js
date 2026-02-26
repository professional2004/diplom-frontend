import * as THREE from 'three'
import { BaseShape } from '../BaseShape'

export class FlatSurfaceShape extends BaseShape {
  get defaultParams() {
    return {
      width: 2,
      height: 1.5,
      // polygon по умолчанию — прямоугольник, совпадающий с ограничивающим прямоугольником
      polygon: [
        [-1, -0.75],
        [1, -0.75],
        [1, 0.75],
        [-1, 0.75]
      ],
      posX: 0,
      posY: 0,
      posZ: 0,
      rotationX: -Math.PI / 2,
      rotationY: 0,
      rotationZ: 0
    }
  }

  get parameterDefinitions() {
    return {
      width: { label: 'Ширина', type: 'number', min: 0.001, step: 0.01 },
      height: { label: 'Высота', type: 'number', min: 0.001, step: 0.01 },
      polygon: { label: 'Ограничивающий многоугольник', type: 'object' },
      posX: { label: 'Позиция X', type: 'number', step: 0.1 },
      posY: { label: 'Позиция Y', type: 'number', step: 0.1 },
      posZ: { label: 'Позиция Z', type: 'number', step: 0.1 },
      rotationX: { label: 'Поворот X (рад)', type: 'number', step: 0.1 },
      rotationY: { label: 'Поворот Y (рад)', type: 'number', step: 0.1 },
      rotationZ: { label: 'Поворот Z (рад)', type: 'number', step: 0.1 }
    }
  }

  _normalizePolygon(polygon, width, height) {
    const allBetween0and1 = polygon.every(p => p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1)
    if (allBetween0and1) {
      return polygon.map(p => [
        (p[0] - 0.5) * width,
        (p[1] - 0.5) * height
      ])
    }
    return polygon
  }

  createMesh() {
    const { width, height } = this.params
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

    // Используем ShapeGeometry для создания истинной 2D-плоскости в 3D
    const geom = new THREE.ShapeGeometry(shape)
    geom.computeVertexNormals()

    const mat = this.getStandardMaterial()
    mat.side = THREE.DoubleSide // Важно, чтобы поверхность была видна с обеих сторон

    const mesh = new THREE.Mesh(geom, mat)

    mesh.userData.owner = this 
    
    mesh.userData.shapeType = 'flat'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    // Применяем позицию и ротацию
    const posX = this.params.posX ?? 0
    const posY = this.params.posY ?? 0
    const posZ = this.params.posZ ?? 0
    
    const rotX = this.params.rotationX ?? -Math.PI / 2
    const rotY = this.params.rotationY ?? 0
    const rotZ = this.params.rotationZ ?? 0
    
    mesh.position.set(posX, posY, posZ)
    mesh.rotation.set(rotX, rotY, rotZ, 'XYZ')

    return mesh
  }

  createUnfold2D() {
    const { width, height } = this.params
    const polygon = this._normalizePolygon(this.params.polygon || this.defaultParams.polygon, width, height)

    const group = new THREE.Group()
    const mat = this.getLineMaterial()

    if (polygon.length > 0) {
      const points = polygon.map(p => new THREE.Vector3(p[0], p[1], 0))
      points.push(points[0].clone()) // замыкание
      const geom = new THREE.BufferGeometry().setFromPoints(points)
      const line = new THREE.Line(geom, mat)
      group.add(line)
    }

    // Рамка ограничивающего прямоугольника (вспомогательная)
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