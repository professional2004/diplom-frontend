import * as THREE from 'three'
import { BaseShape } from './BaseShape'

export class RoundedPrismShape extends BaseShape {
  get defaultParams() {
    return { width: 3, depth: 2, height: 4, radius: 0.5 }
  }

  // Создаем форму скругленного прямоугольника
  _createShapePath(w, d, r) {
    const shape = new THREE.Shape()
    const x = -w / 2
    const y = -d / 2
    
    shape.moveTo(x, y + r)
    shape.lineTo(x, y + d - r)
    shape.absarc(x + r, y + d - r, r, Math.PI, Math.PI / 2, true) // Top Left
    shape.lineTo(x + w - r, y + d)
    shape.absarc(x + w - r, y + d - r, r, Math.PI / 2, 0, true) // Top Right
    shape.lineTo(x + w, y + r)
    shape.absarc(x + w - r, y + r, r, 0, -Math.PI / 2, true) // Bottom Right
    shape.lineTo(x + r, y)
    shape.absarc(x + r, y + r, r, -Math.PI / 2, -Math.PI, true) // Bottom Left
    
    return shape
  }

  createMesh() {
    const { width, depth, height, radius } = this.params
    // Валидация радиуса
    const safeRadius = Math.min(radius, width/2, depth/2)
    
    const shape = this._createShapePath(width, depth, safeRadius)
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height, // Extrude делает depth по оси Z, потом повернем
      bevelEnabled: false,
      curveSegments: 12
    })

    // Центрируем геометрию
    geometry.center()

    const mesh = new THREE.Mesh(geometry, this.getStandardMaterial())
    
    // ExtrudeGeometry создает объект "лежа", поворачиваем, чтобы стоял вертикально
    // Или оставляем как есть, зависит от осей. Usually Extrude is along Z.
    // Повернем X на -90, чтобы Z стала Y (высотой).
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = height / 2

    mesh.userData.shapeType = 'roundedPrism'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    return mesh
  }

  createUnfold2D() {
    const { width, depth, height, radius } = this.params
    const r = Math.min(radius, width/2, depth/2)
    const group = new THREE.Group()
    const mat = this.getLineMaterial()

    // Развертка прямой призмы:
    // 1. Дно (основание)
    // 2. Крышка (топ)
    // 3. Боковая поверхность (разворачивается в длинный прямоугольник)
    
    // Периметр основания (длина развертки боковины)
    // P = 2*(w-2r) + 2*(d-2r) + 2*PI*r
    const straightW = width - 2 * r
    const straightD = depth - 2 * r
    const perimeter = 2 * straightW + 2 * straightD + 2 * Math.PI * r

    // --- 1. Боковина (большой прямоугольник) ---
    // Рисуем слева направо
    const bodyW = perimeter
    const bodyH = height
    const bodyPoints = [
      [0, 0], [bodyW, 0], [bodyW, bodyH], [0, bodyH], [0, 0]
    ].map(p => new THREE.Vector3(p[0], p[1], 0))
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bodyPoints), mat))

    // --- 2. Дно и Крышка ---
    // Присоединим их, например, к одной из плоских граней посередине развертки.
    // Для простоты нарисуем их рядом (как cut-out pattern).
    
    // Функция рисования контура основания
    const drawBase = (yOffset) => {
      const pts = new THREE.Path()
      // Повторяем логику _createShapePath, но в 2D координатах unfold
      // Смещаем к центру боковины по X
      const cx = bodyW / 2
      const cy = yOffset
      
      const hw = width / 2
      const hd = depth / 2
      
      pts.moveTo(cx - hw, cy - hd + r)
      pts.lineTo(cx - hw, cy + hd - r)
      pts.absarc(cx - hw + r, cy + hd - r, r, Math.PI, Math.PI / 2, true)
      pts.lineTo(cx + hw - r, cy + hd)
      pts.absarc(cx + hw - r, cy + hd - r, r, Math.PI / 2, 0, true)
      pts.lineTo(cx + hw, cy - hd + r)
      pts.absarc(cx + hw - r, cy - hd + r, r, 0, -Math.PI / 2, true)
      pts.lineTo(cx - hw + r, cy - hd)
      pts.absarc(cx - hw + r, cy - hd + r, r, -Math.PI / 2, -Math.PI, true)
      
      const geometry = new THREE.BufferGeometry().setFromPoints(pts.getPoints())
      return new THREE.Line(geometry, mat)
    }

    // Дно (снизу)
    group.add(drawBase(-depth / 2 - 1)) 
    // Крышка (сверху)
    group.add(drawBase(bodyH + depth / 2 + 1))

    return group
  }

  // Обновляет геометрию скругленной призмы при изменении параметров
  updateMeshGeometry(mesh, newParams) {
    const { width, depth, height, radius } = newParams
    const safeRadius = Math.min(radius, width / 2, depth / 2)

    // Удаляем старую геометрию
    if (mesh.geometry) {
      mesh.geometry.dispose()
    }

    // Создаем новую форму
    const shape = this._createShapePath(width, depth, safeRadius)
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
      curveSegments: 12
    })

    // Центрируем геометрию
    geometry.center()
    
    mesh.geometry = geometry

    // Обновляем позицию (для того чтобы фигура была на полу)
    mesh.position.y = height / 2
    
    // Обновляем параметры в userData
    mesh.userData.params = { width, depth, height, radius }
  }
}