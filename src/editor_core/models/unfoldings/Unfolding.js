import * as THREE from 'three'

export class Unfolding {

  generateMesh(unfolding, materials) {
    const { geometry, material_id, id } = unfolding
    const { position, rotation } = geometry;
    const shapePoints = geometry.shape.shape_polyline.points;
    const foldLines = geometry.decoration.fold_lines;

    // Создаем Shape для геометрии
    const shape = new THREE.Shape();
    shape.moveTo(shapePoints[0].x, shapePoints[0].y);
    for (let i = 1; i < shapePoints.length; i++) {
      shape.lineTo(shapePoints[i].x, shapePoints[i].y);
    }
    shape.closePath();

    const geometryShape = new THREE.ShapeGeometry(shape);

    // Подготовка цвета (превращаем "cccccc" в "#cccccc")
    const materialData = materials.find(m => m.id === material_id)
    const materialColor = "#" + materialData.color;

    // Генерируем текстуру "на лету"
    const texture = this.createUnfoldingTexture(shapePoints, foldLines, materialColor);

    // Применяем материал
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometryShape, material);

    // Применение трансформаций (позиция и поворот)
    mesh.position.set(position.x, position.y, 0)
    mesh.rotation.set(0, 0, rotation.z)
    
    // Сохраняем метаданные
    mesh.userData = { id }

    return mesh;
  }



  createUnfoldingTexture(points, foldLines = [], color) {
    // Pixels Per Unit (качество текстуры)
    const ppu = 100

    // Находим границы (Bounding Box) для определения размера холста
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = (maxX - minX) || 1;
    const height = (maxY - minY) || 1;

    // Создаем canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * ppu;
    canvas.height = height * ppu;
    const ctx = canvas.getContext('2d');

    // Функция перевода координат детали в координаты холста
    const toCanvas = (x, y) => ({
      x: (x - minX) * ppu,
      y: (height - (y - minY)) * ppu // Инвертируем Y, так как в Canvas 0 вверху
    });

    // Заливка основным цветом
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Отрисовка линий сгиба
    ctx.strokeStyle = '#000000'; // Цвет линий
    ctx.lineWidth = 2;            // Толщина линий в пикселях
    ctx.setLineDash([5, 5]);      // Делаем пунктир

    foldLines.forEach(line => {
      const start = toCanvas(line[0].x, line[0].y);
      const end = toCanvas(line[1].x, line[1].y);

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}