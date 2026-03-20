import * as THREE from 'three'

export class ConicalSurface {
  
  generateMesh(surface, materials) {
    const { geometry, unfolding, id, type } = surface
    const { shape, position, rotation } = geometry
    const { apex_coords, base_polyline, bounding_polyline } = shape

    // Инициализация базовых векторов
    const apex = new THREE.Vector3(apex_coords.x, apex_coords.y, apex_coords.z)
    const basePoints = base_polyline.points.map(p => new THREE.Vector3(p.x, 0, p.y))

    // Автоматическое замыкание полилинии, если тип "closed"
    if (base_polyline.type === 'closed' && basePoints.length > 0) {
      const first = basePoints[0]
      const last = basePoints[basePoints.length - 1]
      if (first.distanceToSquared(last) > 1e-10) {
        basePoints.push(first.clone())
      }
    }

    if (basePoints.length < 2) return new THREE.Mesh()

    // Вычисление параметров развертки
    const L = basePoints.map(p => p.distanceTo(apex))
    const P2D = [new THREE.Vector2(L[0], 0)]
    let currentTheta = 0

    for (let i = 0; i < basePoints.length - 1; i++) {
      const b = basePoints[i].distanceTo(basePoints[i + 1])
      const cosAlpha = Math.max(-1, Math.min(1, (L[i]**2 + L[i+1]**2 - b**2) / (2 * L[i] * L[i+1])))
      currentTheta += Math.acos(cosAlpha)
      P2D.push(new THREE.Vector2(L[i+1] * Math.cos(currentTheta), L[i+1] * Math.sin(currentTheta)))
    }

    const polygon2D = bounding_polyline.points.map(p => new THREE.Vector2(p.x, p.y))
    const allPositions = []
    const allIndices = []
    let vertexOffset = 0

    // Генерация геометрии по секторам
    for (let sec = 0; sec < P2D.length - 1; sec++) {
      const ray1 = P2D[sec]
      const ray2 = P2D[sec + 1]
      const det = ray1.x * ray2.y - ray1.y * ray2.x
      
      if (Math.abs(det) < 1e-10) continue

      let polySector = this.clipAgainstRay(polygon2D, ray1, true)
      polySector = this.clipAgainstRay(polySector, ray2, false)

      const cleaned = polySector.filter((p, i, arr) => 
        p.distanceToSquared(arr[i === 0 ? arr.length - 1 : i - 1]) > 1e-10
      )

      if (cleaned.length < 3) continue

      const shapeGeom = new THREE.ShapeGeometry(new THREE.Shape(cleaned))
      const posAttr = shapeGeom.attributes.position
      const indexAttr = shapeGeom.index
      
      const v0 = new THREE.Vector3().subVectors(basePoints[sec], apex)
      const v1 = new THREE.Vector3().subVectors(basePoints[sec + 1], apex)

      for (let i = 0; i < posAttr.count; i++) {
        const px = posAttr.getX(i)
        const py = posAttr.getY(i)

        const u = (px * ray2.y - py * ray2.x) / det
        const v = (ray1.x * py - ray1.y * px) / det

        const p3D = apex.clone().addScaledVector(v0, u).addScaledVector(v1, v)
        allPositions.push(p3D.x, p3D.y, p3D.z)
      }

      const count = indexAttr ? indexAttr.count : posAttr.count
      for (let i = 0; i < count; i++) {
        allIndices.push((indexAttr ? indexAttr.getX(i) : i) + vertexOffset)
      }
      vertexOffset += posAttr.count
    }

    // Сборка меша
    const meshGeom = new THREE.BufferGeometry()
    if (allPositions.length > 0) {
      meshGeom.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3))
      meshGeom.setIndex(allIndices)
      meshGeom.computeVertexNormals()
    }    
    
    // Подготовка цвета (превращаем "cccccc" в 0xcccccc)
    const materialData = materials.find(m => m.id === unfolding.material_id)
    const materialColor = parseInt(materialData.color, 16);

    // Применяем материал
    const material = new THREE.MeshStandardMaterial({
      color: materialColor,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.5
    })

    const mesh = new THREE.Mesh(meshGeom, material)

    // Применение трансформаций (позиция и поворот)
    mesh.position.set(position.x, position.y, position.z)
    mesh.rotation.set(rotation.x, rotation.y, rotation.z)

    // Сохраняем метаданные
    mesh.userData = { id, type }

    return mesh
  }


  // Алгоритм Сазерленда-Ходжмена для отсечения 2D-полигона лучом
  clipAgainstRay(poly, ray, isLeft) {
    if (poly.length < 3) return []
    const result = []
    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i]
      const next = poly[(i + 1) % poly.length]
      const crossCur = ray.x * cur.y - ray.y * cur.x
      const crossNext = ray.x * next.y - ray.y * next.x
      const isCurInside = isLeft ? crossCur >= -1e-8 : crossCur <= 1e-8
      const isNextInside = isLeft ? crossNext >= -1e-8 : crossNext <= 1e-8

      if (isCurInside) result.push(cur)
      if (isCurInside !== isNextInside) {
        const Nx = -ray.y, Ny = ray.x
        const denom = Nx * (next.x - cur.x) + Ny * (next.y - cur.y)
        if (Math.abs(denom) > 1e-12) {
          const t = -(Nx * cur.x + Ny * cur.y) / denom
          result.push(new THREE.Vector2(cur.x + t * (next.x - cur.x), cur.y + t * (next.y - cur.y)))
        }
      }
    }
    return result
  }
}