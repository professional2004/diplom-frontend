import * as THREE from 'three'

export class ConicalSurfaceShape {
  constructor(params = {}) {
    console.log('[->] ConicalSurfaceShape: constructor')
    this.params = { ...this.defaultParams, ...params }
  }

  get defaultParams() {
    console.log('[->] ConicalSurfaceShape: get defaultParams()')
    return {
      basePolyline: [
        [-1, 0],
        [0, 0],
        [1, 0]
      ],
      apex: [0, 1.5, 1],
      polygon: [
        [0, 0.5],
        [1.8, 0.5],
        [1.8, 1.5],
        [0, 1.5]
      ],
      posX: 0, posY: 0, posZ: 0,
      rotationX: 0, rotationY: 0, rotationZ: 0
    }
  }

  get parameterDefinitions() {
    console.log('[->] ConicalSurfaceShape: get parameterDefinitions()')
    return {
      basePolyline: { label: 'Ломаная основания', type: 'object' },
      apex: { label: 'Вершина (X,Y,Z)', type: 'object' },
      polygon: { label: 'Ограничивающий многоугольник (X,Y)', type: 'object' },
      posX: { label: 'Позиция X', type: 'number', step: 0.1 },
      posY: { label: 'Позиция Y', type: 'number', step: 0.1 },
      posZ: { label: 'Позиция Z', type: 'number', step: 0.1 },
      rotationX: { label: 'Поворот X (рад)', type: 'number', step: 0.1 },
      rotationY: { label: 'Поворот Y (рад)', type: 'number', step: 0.1 },
      rotationZ: { label: 'Поворот Z (рад)', type: 'number', step: 0.1 }
    }
  }

  _toVec3Array(poly) {
    console.log('[->] ConicalSurfaceShape: _toVec3Array()')
    return poly.map(p => new THREE.Vector3(p[0], 0, p[1]))
  }

  _computeUnroll() {
    console.log('[->] ConicalSurfaceShape: _computeUnroll()')
    const base2D = this.params.basePolyline?.length >= 2 ? this.params.basePolyline : this.defaultParams.basePolyline
    const base = this._toVec3Array(base2D)
    const apex = new THREE.Vector3(...(this.params.apex || this.defaultParams.apex))

    const L = base.map(p => p.distanceTo(apex))
    const P2D = []
    let currentTheta = 0

    P2D.push(new THREE.Vector2(L[0] * Math.cos(currentTheta), L[0] * Math.sin(currentTheta)))
    const thetas = [currentTheta]

    for (let i = 0; i < base.length - 1; i++) {
      const b = base[i].distanceTo(base[i+1])
      let cosAlpha = (L[i]*L[i] + L[i+1]*L[i+1] - b*b) / (2 * L[i] * L[i+1])
      cosAlpha = Math.max(-1, Math.min(1, cosAlpha)) 
      const alpha = Math.acos(cosAlpha)
      currentTheta += alpha
      thetas.push(currentTheta)
      P2D.push(new THREE.Vector2(L[i+1] * Math.cos(currentTheta), L[i+1] * Math.sin(currentTheta)))
    }

    return { base, apex, L, P2D, thetas }
  }

  // Алгоритм Сазерленда-Ходжмена для отсечения 2D-полигона лучом из начала координат (0,0)
  _clipAgainstRay(poly, ray, isLeft) {
    console.log('[->] ConicalSurfaceShape: _clipAgainstRay()')
    if (poly.length < 3) return []
    const result = []

    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i]
      const next = poly[(i + 1) % poly.length]

      // Векторное произведение для определения стороны
      const crossCur = ray.x * cur.y - ray.y * cur.x
      const crossNext = ray.x * next.y - ray.y * next.x

      const isCurInside = isLeft ? crossCur >= -1e-8 : crossCur <= 1e-8
      const isNextInside = isLeft ? crossNext >= -1e-8 : crossNext <= 1e-8

      if (isCurInside) {
        result.push(cur)
      }

      // Если грань пересекает луч отсечения
      if (isCurInside !== isNextInside) {
        const Nx = -ray.y
        const Ny = ray.x
        const denom = Nx * (next.x - cur.x) + Ny * (next.y - cur.y)

        // Предотвращение деления на ноль для параллельных отрезков
        if (Math.abs(denom) > 1e-12) {
          const t = -(Nx * cur.x + Ny * cur.y) / denom
          result.push(new THREE.Vector2(
            cur.x + t * (next.x - cur.x),
            cur.y + t * (next.y - cur.y)
          ))
        }
      }
    }
    return result
  }

  createMesh() {
    console.log('[->] ConicalSurfaceShape: createMesh()')
    const { base, apex, P2D } = this._computeUnroll()
    const polygonRaw = this.params.polygon || this.defaultParams.polygon

    // Переводим исходный полигон в Vector2
    const polygon2D = polygonRaw.map(p => new THREE.Vector2(p[0], p[1]))

    const allPositions = []
    const allIndices = []
    let vertexOffset = 0

    // Проходим по каждой панели (грани) развернутого конуса
    for (let sec = 0; sec < P2D.length - 1; sec++) {
      const ray1 = P2D[sec]
      const ray2 = P2D[sec + 1]

      // Определитель для аффинного преобразования (2D в 3D)
      const det = ray1.x * ray2.y - ray1.y * ray2.x
      if (Math.abs(det) < 1e-10) continue // Пропускаем схлопнутые участки

      // Отсекаем полигон для текущего конического сектора
      let polySector = this._clipAgainstRay(polygon2D, ray1, true)   // Отсекаем левым лучом
      polySector = this._clipAgainstRay(polySector, ray2, false)     // Отсекаем правым лучом

      // Убираем дублирующиеся вершины для надежности триангулятора Three.js
      const cleanedSector = []
      for (let i = 0; i < polySector.length; i++) {
        const p = polySector[i]
        const prev = polySector[i === 0 ? polySector.length - 1 : i - 1]
        if (p.distanceToSquared(prev) > 1e-10) {
          cleanedSector.push(p)
        }
      }

      if (cleanedSector.length < 3) continue

      // Создаем геометрию строго в пределах одной математической плоскости
      const shape = new THREE.Shape()
      shape.moveTo(cleanedSector[0].x, cleanedSector[0].y)
      for (let i = 1; i < cleanedSector.length; i++) {
        shape.lineTo(cleanedSector[i].x, cleanedSector[i].y)
      }
      shape.closePath()

      const geom = new THREE.ShapeGeometry(shape)
      const posAttr = geom.attributes.position
      const indexAttr = geom.index

      const v0 = new THREE.Vector3().subVectors(base[sec], apex)
      const v1 = new THREE.Vector3().subVectors(base[sec + 1], apex)

      // Точно проецируем каждую точку 2D из плоскости сектора в 3D
      for (let i = 0; i < posAttr.count; i++) {
        const px = posAttr.getX(i)
        const py = posAttr.getY(i)

        // Аффинные координаты (математически точная версия барицентрических)
        const u = (px * ray2.y - py * ray2.x) / det
        const v = (ray1.x * py - ray1.y * px) / det

        const p3D = new THREE.Vector3().copy(apex)
        p3D.addScaledVector(v0, u)
        p3D.addScaledVector(v1, v)

        allPositions.push(p3D.x, p3D.y, p3D.z)
      }

      // Собираем общие индексы
      if (indexAttr) {
        for (let i = 0; i < indexAttr.count; i++) {
          allIndices.push(indexAttr.getX(i) + vertexOffset)
        }
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          allIndices.push(i + vertexOffset)
        }
      }
      vertexOffset += posAttr.count
    }

    const meshGeom = new THREE.BufferGeometry()
    if (allPositions.length > 0) {
      meshGeom.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3))
      meshGeom.setIndex(allIndices)
      meshGeom.computeVertexNormals() // Вектора нормали будут высчитаны для граней корректно
    }

    const mat = this.getStandardMaterial()
    mat.side = THREE.DoubleSide
    const mesh = new THREE.Mesh(meshGeom, mat)

    mesh.userData.owner = this 
    mesh.userData.shapeType = 'conical'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    this.applyTransformToMesh(mesh)
    return mesh
  }

  createUnfold2D() {
    console.log('[->] ConicalSurfaceShape: createUnfold2D()')
    const group = new THREE.Group()
    const { P2D } = this._computeUnroll()
    const mat = this.getLineMaterial()

    const polygonRaw = this.params.polygon || this.defaultParams.polygon
    if (polygonRaw.length >= 3) {
      const points = polygonRaw.map(p => new THREE.Vector3(p[0], p[1], 0))
      points.push(points[0].clone())
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      group.add(new THREE.Line(geo, mat))
    }

    return group
  }



  // Пересечение отрезка (p1, p2) с лучом из (0,0) в направлении rayDir
  _intersectSegmentRay(p1, p2, rayDir) {
    console.log('[->] ConicalSurfaceShape: _intersectSegmentRay()')
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const Rx = rayDir.x, Ry = rayDir.y
    const denom = dx * Ry - dy * Rx
    
    if (Math.abs(denom) < 1e-10) return null
    
    const s = (p1.y * Rx - p1.x * Ry) / denom
    if (s > 1e-6 && s < 1 - 1e-6) {
      // Проверяем, лежит ли пересечение на положительной стороне луча
      const tx = Rx !== 0 ? (p1.x + s * dx) / Rx : (p1.y + s * dy) / Ry
      if (tx > 0) return { x: p1.x + s * dx, y: p1.y + s * dy, t: s }
    }
    return null
  }

  // Маппинг точки, которая гарантированно лежит внутри сектора sec
  _mapPointTo3DCone(px, py, sec, P2D, base, apex) {
    console.log('[->] ConicalSurfaceShape: _mapPointTo3DCone()')
    const ray1 = P2D[sec]
    const ray2 = P2D[sec + 1]
    const det = ray1.x * ray2.y - ray1.y * ray2.x
    
    if (Math.abs(det) < 1e-10) return apex.clone() // fallback

    const u = (px * ray2.y - py * ray2.x) / det
    const v = (ray1.x * py - ray1.y * px) / det

    const v0 = new THREE.Vector3().subVectors(base[sec], apex)
    const v1 = new THREE.Vector3().subVectors(base[sec + 1], apex)

    const p3D = new THREE.Vector3().copy(apex)
    p3D.addScaledVector(v0, u)
    p3D.addScaledVector(v1, v)
    
    return p3D
  }

  getBoundaryEdges() {
    console.log('[->] ConicalSurfaceShape: getBoundaryEdges()')
    const { base, apex, P2D } = this._computeUnroll()
    const polygonRaw = this.params.polygon || this.defaultParams.polygon
    
    const edges = []
    if (polygonRaw.length < 3) return edges

    for (let i = 0; i < polygonRaw.length; i++) {
      const p1 = new THREE.Vector2(polygonRaw[i][0], polygonRaw[i][1])
      const p2 = new THREE.Vector2(
        polygonRaw[(i + 1) % polygonRaw.length][0], 
        polygonRaw[(i + 1) % polygonRaw.length][1]
      )
      
      const points2D = [{ x: p1.x, y: p1.y, t: 0 }]
      
      // Ищем пересечения с лучами секторов конуса
      for (let j = 1; j < P2D.length - 1; j++) {
        const intersection = this._intersectSegmentRay(p1, p2, P2D[j])
        if (intersection) {
          points2D.push(intersection)
        }
      }
      
      points2D.push({ x: p2.x, y: p2.y, t: 1 })
      points2D.sort((a, b) => a.t - b.t)
      
      const points3D = []
      
      // Мапим каждую точку в 3D, определяя её сектор по средней точке микро-отрезка
      for (let k = 0; k < points2D.length; k++) {
        const pt = points2D[k]
        
        // Для определения сектора берем точку чуть сдвинутую вперед по направлению отрезка 
        // (или саму точку, если она последняя, но сдвинутую назад)
        const checkT = k < points2D.length - 1 ? pt.t + 1e-5 : pt.t - 1e-5
        const midX = p1.x + checkT * (p2.x - p1.x)
        const midY = p1.y + checkT * (p2.y - p1.y)
        
        let targetSec = 0
        for (let s = 0; s < P2D.length - 1; s++) {
          const crossCur = P2D[s].x * midY - P2D[s].y * midX
          const crossNext = P2D[s+1].x * midY - P2D[s+1].y * midX
          // Точка между лучами, если векторные произведения имеют разные знаки
          if (crossCur >= -1e-8 && crossNext <= 1e-8) {
            targetSec = s
            break
          }
        }
        
        points3D.push(this._mapPointTo3DCone(pt.x, pt.y, targetSec, P2D, base, apex))
      }
      
      let length = 0
      for (let k = 0; k < points3D.length - 1; k++) {
        length += points3D[k].distanceTo(points3D[k+1])
      }

      edges.push({
        id: `conic_edge_${i}`,
        index: i,
        points3D: points3D,
        length: length
      })
    }
    return edges
  }


  // --------- общие для shapes методы ----------

  // Применяет позицию и ротацию к меше на основе параметров
  applyTransformToMesh(mesh) {
    console.log('[->] ConicalSurfaceShape: applyTransformToMesh()')
    if (!mesh) return

    // Применяем позицию
    const posX = this.params.posX ?? 0
    const posY = this.params.posY ?? mesh.position.y // сохраняем оригинальное Y если не заданы параметры
    const posZ = this.params.posZ ?? 0

    mesh.position.set(posX, posY, posZ)

    // Применяем ротацию
    const rotX = this.params.rotationX ?? 0
    const rotY = this.params.rotationY ?? 0
    const rotZ = this.params.rotationZ ?? 0

    mesh.rotation.set(rotX, rotY, rotZ, 'XYZ')
  }

  // Вспомогательный метод для материалов
  getStandardMaterial() {
    console.log('[->] ConicalSurfaceShape: getStandardMaterial()')
    return new THREE.MeshStandardMaterial({ 
      color: Math.random() * 0xffffff,
      metalness: 0.1,
      roughness: 0.5
    })
  }

  getLineMaterial() {
    console.log('[->] ConicalSurfaceShape: getLineMaterial()')
    return new THREE.LineBasicMaterial({ color: 0x333333 })
  }

  // Получение конкретного ребра по индексу
  getEdgeByIndex(index) {
    console.log('[->] ConicalSurfaceShape: getEdgeByIndex()')
    const edges = this.getBoundaryEdges();
    return edges.find(e => e.index === index) || null;
  }

  // Получение ребра в мировых координатах (с учетом позиции и поворота фигуры)
  getWorldEdge(index, mesh) {
    console.log('[->] ConicalSurfaceShape: getWorldEdge()')
    const edge = this.getEdgeByIndex(index);
    if (!edge || !mesh) return null;

    // Обновляем матрицы меша перед вычислениями
    mesh.updateMatrixWorld(true);

    const worldPoints = edge.points3D.map(p => {
      const wp = p.clone();
      wp.applyMatrix4(mesh.matrixWorld);
      return wp;
    });

    return {
      ...edge,
      points3D: worldPoints
    };
  }
}