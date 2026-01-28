import * as THREE from 'three'
import { BaseSurface } from './BaseSurface'

/**
 * Коническая поверхность
 * Параметры: radiusTop, radiusBottom, height, radialSegments
 */
export class ConicalSurface extends BaseSurface {
  get defaultParams() {
    return {
      radiusTop: 0.5,
      radiusBottom: 2,
      height: 3,
      radialSegments: 32
    }
  }

  createMesh() {
    const { radiusTop, radiusBottom, height, radialSegments } = this.params
    
    // ConeGeometry - это специальный случай ConvexGeometry или можно использовать LatheGeometry
    // Используем LatheGeometry для создания конической поверхности из профиля
    const points = [
      new THREE.Vector2(radiusBottom, 0),
      new THREE.Vector2(radiusTop, height)
    ]

    const geometry = new THREE.LatheGeometry(points, radialSegments)
    const mesh = new THREE.Mesh(geometry, this.getStandardMaterial())

    // Центрируем по высоте
    mesh.geometry.translate(0, -height / 2, 0)
    
    this._setupUserData(mesh, 'conical')
    return mesh
  }

  createUnfold2D() {
    const { radiusTop, radiusBottom, height, radialSegments } = this.params
    const group = new THREE.Group()
    const mat = this.getLineMaterial()

    // Развертка конуса - это сектор круга
    // Вычисляем параметры развертки

    // Длина образующей (слант height)
    const slantHeight = Math.sqrt(height * height + (radiusBottom - radiusTop) ** 2)
    
    // Угол развертки конуса определяется соотношением радиусов основания и вершины
    const baseCircumference = 2 * Math.PI * radiusBottom
    const unfoldAngle = baseCircumference / slantHeight

    // Рисуем развертку как сектор
    const points = [new THREE.Vector3(0, 0, 0)]
    
    // Внешняя дуга (большой радиус - radiusBottom)
    for (let i = 0; i <= radialSegments; i++) {
      const angle = (i / radialSegments) * unfoldAngle
      const x = radiusBottom * Math.cos(angle)
      const y = radiusBottom * Math.sin(angle)
      points.push(new THREE.Vector3(x, y, 0))
    }

    // Внутренняя дуга (малый радиус - radiusTop)
    for (let i = radialSegments; i >= 0; i--) {
      const angle = (i / radialSegments) * unfoldAngle
      const x = radiusTop * Math.cos(angle)
      const y = radiusTop * Math.sin(angle)
      points.push(new THREE.Vector3(x, y, 0))
    }

    // Закрытие контура
    points.push(new THREE.Vector3(0, 0, 0))

    const geo = new THREE.BufferGeometry().setFromPoints(points)
    group.add(new THREE.Line(geo, mat))

    return group
  }
}
