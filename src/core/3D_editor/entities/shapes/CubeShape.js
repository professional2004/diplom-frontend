import * as THREE from 'three'
import { primitives } from '@jscad/modeling'
import { BaseShape } from '../BaseShape'
import { createMeshFromJscad } from '@/core/general/utils/JscadAdapter'

export class CubeShape extends BaseShape {
  get defaultParams() {
    return { width: 2, height: 2, depth: 2 }
  }

  get parameterDefinitions() {
    return {
      width: { label: 'Ширина', type: 'number', min: 0.1, step: 0.1 },
      height: { label: 'Высота', type: 'number', min: 0.1, step: 0.1 },
      depth: { label: 'Глубина', type: 'number', min: 0.1, step: 0.1 }
    }
  }

  createMesh() {
    const { width, height, depth } = this.params
    // Создаем форму с помощью JSCAD (параметрическое моделирование)
    const jscadGeom = primitives.cuboid({ size: [width, height, depth] })
    const mesh = createMeshFromJscad(jscadGeom, this.getStandardMaterial())

    mesh.userData.owner = this 

    // Сохраняем тип и параметры для восстановления/развертки
    mesh.userData.shapeType = 'cube'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    // Ставим на "пол" (половина высоты)
    mesh.position.y = height / 2
    return mesh
  }

  createUnfold2D() {
    const { width: w, height: h, depth: d } = this.params
    const group = new THREE.Group()
    const mat = this.getLineMaterial()

    const createClosedLine = (pointsArray) => {
      const points = pointsArray.map(p => new THREE.Vector3(p[0], p[1], 0))
      const closed = points.concat(points[0]) // замыкаем контур
      const geo = new THREE.BufferGeometry().setFromPoints(closed)
      return new THREE.Line(geo, mat)
    }

    // Дно
    const bottomGroup = new THREE.Group()
    bottomGroup.add(createClosedLine([
      [-w/2, -d/2], [w/2, -d/2], [w/2, d/2], [-w/2, d/2]
    ]))
    group.add(bottomGroup)

    // Перед
    const frontGroup = new THREE.Group()
    frontGroup.add(createClosedLine([
      [-w/2, -d/2], [w/2, -d/2], [w/2, -d/2 - h], [-w/2, -d/2 - h]
    ]))
    group.add(frontGroup)

    // Зад
    const backGroup = new THREE.Group()
    backGroup.add(createClosedLine([
      [-w/2, d/2], [w/2, d/2], [w/2, d/2 + h], [-w/2, d/2 + h]
    ]))
    group.add(backGroup)

    // Лево
    const leftGroup = new THREE.Group()
    leftGroup.add(createClosedLine([
      [-w/2, -d/2], [-w/2 - h, -d/2], [-w/2 - h, d/2], [-w/2, d/2]
    ]))
    group.add(leftGroup)

    // Право
    const rightGroup = new THREE.Group()
    rightGroup.add(createClosedLine([
      [w/2, -d/2], [w/2 + h, -d/2], [w/2 + h, d/2], [w/2, d/2]
    ]))
    group.add(rightGroup)

    // Верх
    const topGroup = new THREE.Group()
    topGroup.add(createClosedLine([
      [-w/2, d/2 + h], [w/2, d/2 + h], [w/2, d/2 + h + d], [-w/2, d/2 + h + d]
    ]))
    group.add(topGroup)

    return group
  }
}