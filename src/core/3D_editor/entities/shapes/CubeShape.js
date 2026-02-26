import * as THREE from 'three'
import { primitives } from '@jscad/modeling'
import { BaseShape } from '../BaseShape'
import { createMeshFromJscad } from '@/core/general/utils/JscadAdapter'

export class CubeShape extends BaseShape {
  get defaultParams() {
    return { 
      width: 2, 
      height: 2, 
      depth: 2,
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
      width: { label: 'Ширина', type: 'number', min: 0.1, step: 0.1 },
      height: { label: 'Высота', type: 'number', min: 0.1, step: 0.1 },
      depth: { label: 'Глубина', type: 'number', min: 0.1, step: 0.1 },
      posX: { label: 'Позиция X', type: 'number', step: 0.1 },
      posY: { label: 'Позиция Y', type: 'number', step: 0.1 },
      posZ: { label: 'Позиция Z', type: 'number', step: 0.1 },
      rotationX: { label: 'Поворот X (рад)', type: 'number', step: 0.1 },
      rotationY: { label: 'Поворот Y (рад)', type: 'number', step: 0.1 },
      rotationZ: { label: 'Поворот Z (рад)', type: 'number', step: 0.1 }
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

    // Если позиция Y не задана в параметрах, ставим на "пол" (половина высоты)
    const baseY = height / 2
    const originalY = mesh.position.y
    mesh.position.set(0, baseY, 0)

    // Применяем позицию и ротацию
    // Но сохраняем оригинальное Y если posY не задан
    const posX = this.params.posX ?? 0
    const posY = this.params.posY ?? baseY
    const posZ = this.params.posZ ?? 0
    
    mesh.position.set(posX, posY, posZ)
    
    const rotX = this.params.rotationX ?? 0
    const rotY = this.params.rotationY ?? 0
    const rotZ = this.params.rotationZ ?? 0
    mesh.rotation.set(rotX, rotY, rotZ, 'XYZ')

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