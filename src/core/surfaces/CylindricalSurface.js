import * as THREE from 'three'
import { BaseSurface } from './BaseSurface'

/**
 * Цилиндрическая поверхность
 * Параметры: radius, height, radialSegments
 */
export class CylindricalSurface extends BaseSurface {
  get defaultParams() {
    return {
      radius: 1.5,
      height: 3,
      radialSegments: 32
    }
  }

  createMesh() {
    const { radius, height, radialSegments } = this.params

    // CylinderGeometry с radiusTop = radiusBottom создает цилиндр (только боковая поверхность)
    const geometry = new THREE.CylinderGeometry(
      radius, // radiusTop
      radius, // radiusBottom
      height,
      radialSegments,
      1, // heightSegments
      true // openEnded - только боковая поверхность без крышек
    )

    const mesh = new THREE.Mesh(geometry, this.getStandardMaterial())
    
    this._setupUserData(mesh, 'cylindrical')
    return mesh
  }

  createUnfold2D() {
    const { radius, height, radialSegments } = this.params
    const group = new THREE.Group()
    const mat = this.getLineMaterial()

    // Развертка цилиндра - это прямоугольник
    // Ширина = длина окружности = 2 * PI * radius
    // Высота = height

    const circumference = 2 * Math.PI * radius
    const w = circumference
    const h = height

    const points = [
      new THREE.Vector3(-w / 2, -h / 2, 0),
      new THREE.Vector3(w / 2, -h / 2, 0),
      new THREE.Vector3(w / 2, h / 2, 0),
      new THREE.Vector3(-w / 2, h / 2, 0),
      new THREE.Vector3(-w / 2, -h / 2, 0)
    ]

    const geo = new THREE.BufferGeometry().setFromPoints(points)
    group.add(new THREE.Line(geo, mat))

    return group
  }
}
