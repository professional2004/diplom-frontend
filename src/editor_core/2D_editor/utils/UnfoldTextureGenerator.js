import * as THREE from 'three'

export class UnfoldTextureGenerator {
  // Создает единый меш с формой развертки и текстурой границ/линий сгиба
  // THREE.Vector2[]  polygon - точки границы развертки
  // Array<{start: THREE.Vector2, end: THREE.Vector2}> foldLines - линии сгиба

  static createMeshWithTexture(polygon, foldLines = []) {
    if (!polygon || polygon.length < 3) return new THREE.Mesh()

    // 1. Ищем bounding box для корректного масштабирования
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    polygon.forEach(p => {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    })

    const width = maxX - minX
    const height = maxY - minY
    
    // Добавляем отступ (padding), чтобы линии обводки не обрезались краем canvas
    const padding = Math.max(width, height) * 0.05
    const paddedWidth = width + padding * 2
    const paddedHeight = height + padding * 2

    // 2. Настраиваем Canvas
    const canvas = document.createElement('canvas')
    const resolution = 2048 // Высокое разрешение для четких линий
    canvas.width = resolution
    canvas.height = resolution * (paddedHeight / paddedWidth)

    const ctx = canvas.getContext('2d')

    // Заливка фона (светлая, чтобы деталь была видна, можно заменить на transparent)
    ctx.fillStyle = '#f8f9fa'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Функции перевода локальных 3D координат в пиксели Canvas (с учетом инверсии Y)
    const scaleX = canvas.width / paddedWidth
    const scaleY = canvas.height / paddedHeight

    const toCanvasX = (x) => (x - minX + padding) * scaleX
    const toCanvasY = (y) => canvas.height - ((y - minY + padding) * scaleY)

    // 3. Рисуем внутренние линии сгиба (пунктир)
    ctx.strokeStyle = '#888888'
    ctx.lineWidth = 4
    ctx.setLineDash([15, 15])
    ctx.beginPath()
    foldLines.forEach(line => {
      ctx.moveTo(toCanvasX(line.start.x), toCanvasY(line.start.y))
      ctx.lineTo(toCanvasX(line.end.x), toCanvasY(line.end.y))
    })
    ctx.stroke()

    // 4. Рисуем внешнюю границу развертки (сплошная линия)
    ctx.strokeStyle = '#212529'
    ctx.lineWidth = 8
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(toCanvasX(polygon[0].x), toCanvasY(polygon[0].y))
    for(let i = 1; i < polygon.length; i++) {
      ctx.lineTo(toCanvasX(polygon[i].x), toCanvasY(polygon[i].y))
    }
    ctx.closePath()
    ctx.stroke()

    // 5. Создаем текстуру из холста
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace 

    // 6. Создаем физическую геометрию формы (идеально для Raycaster)
    const shape = new THREE.Shape()
    shape.moveTo(polygon[0].x, polygon[0].y)
    for (let i = 1; i < polygon.length; i++) {
      shape.lineTo(polygon[i].x, polygon[i].y)
    }
    shape.closePath()

    const geometry = new THREE.ShapeGeometry(shape)

    // Корректируем UV-координаты геометрии, чтобы текстура легла точно по границам с учетом padding
    const posAttr = geometry.attributes.position
    const uvAttr = geometry.attributes.uv
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i)
      const y = posAttr.getY(i)
      const u = (x - minX + padding) / paddedWidth
      const v = (y - minY + padding) / paddedHeight
      uvAttr.setXY(i, u, v)
    }

    // 7. Собираем финальный меш
    const material = new THREE.MeshBasicMaterial({ 
      map: texture, 
      side: THREE.DoubleSide
    })

    // Сначала создаем объект меша в переменную
    const mesh = new THREE.Mesh(geometry, material)

    // --- ДОБАВЛЯЕМ ДАННЫЕ ДЛЯ ЭКСПОРТЕРА ---
    // Устанавливаем флаг, по которому UnfoldingsExporter найдет этот меш
    mesh.userData.isUnfoldPart = true 
    
    // Сохраняем чистые векторные данные (координаты точек), 
    // чтобы PDF и SVG были точными, а не просто картинкой
    mesh.userData.exportData = {
      polygon: polygon.map(p => ({ x: p.x, y: p.y })),
      foldLines: foldLines.map(line => ({
        start: { x: line.start.x, y: line.start.y },
        end: { x: line.end.x, y: line.end.y }
      }))
    }

    return mesh
  }
}