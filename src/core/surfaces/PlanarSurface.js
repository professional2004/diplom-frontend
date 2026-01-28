import * as THREE from 'three'
import { BaseSurface } from './BaseSurface'

/**
 * Плоская поверхность
 * Параметры: width, height
 */
export class PlanarSurface extends BaseSurface {
  get defaultParams() {
    return { width: 2, height: 2 }
  }

  createMesh() {
    const { width, height } = this.params
    const geometry = new THREE.PlaneGeometry(width, height, 4, 4)
    const mesh = new THREE.Mesh(geometry, this.getStandardMaterial())

    this._setupUserData(mesh, 'planar')
    return mesh
  }

  createUnfold2D() {
    const { width, height } = this.params
    const group = new THREE.Group()
    const mat = this.getLineMaterial()

    // Плоская развертка - это просто прямоугольник
    const points = [
      new THREE.Vector3(-width / 2, -height / 2, 0),
      new THREE.Vector3(width / 2, -height / 2, 0),
      new THREE.Vector3(width / 2, height / 2, 0),
      new THREE.Vector3(-width / 2, height / 2, 0),
      new THREE.Vector3(-width / 2, -height / 2, 0)
    ]

    const geo = new THREE.BufferGeometry().setFromPoints(points)
    group.add(new THREE.Line(geo, mat))

    return group
  }
}
