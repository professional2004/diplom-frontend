import * as THREE from 'three'
import { BaseShape } from './BaseShape'

export class CubeShape extends BaseShape {
  get defaultParams() {
    return { width: 2, height: 2, depth: 2 }
  }

  createMesh() {
    const { width, height, depth } = this.params
    const geometry = new THREE.BoxGeometry(width, height, depth)
    const mesh = new THREE.Mesh(geometry, this.getStandardMaterial())
    
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

    // Классическая крестовая развертка
    // Координаты: [x, y]. Центр (дно) в 0,0
    const paths = [
      // Дно (Center)
      [ [-w/2, -d/2], [w/2, -d/2], [w/2, d/2], [-w/2, d/2], [-w/2, -d/2] ],
      // Перед (Front) - вниз по схеме
      [ [-w/2, -d/2], [-w/2, -d/2 - h], [w/2, -d/2 - h], [w/2, -d/2] ],
      // Зад (Back) - вверх по схеме
      [ [-w/2, d/2], [-w/2, d/2 + h], [w/2, d/2 + h], [w/2, d/2] ],
      // Лево (Left)
      [ [-w/2, -d/2], [-w/2 - h, -d/2], [-w/2 - h, d/2], [-w/2, d/2] ],
      // Право (Right)
      [ [w/2, -d/2], [w/2 + h, -d/2], [w/2 + h, d/2], [w/2, d/2] ],
      // Верх (Top) - крепится к Back
      [ [-w/2, d/2 + h], [-w/2, d/2 + h + d], [w/2, d/2 + h + d], [w/2, d/2 + h] ]
    ]

    paths.forEach(path => {
      const points = path.map(p => new THREE.Vector3(p[0], p[1], 0))
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      group.add(new THREE.Line(geo, mat))
    })

    return group
  }
}