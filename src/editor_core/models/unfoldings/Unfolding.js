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

    // Находим реальные границы геометрии, чтобы "вписать" текстуру
    geometryShape.computeBoundingBox();
    const { min, max } = geometryShape.boundingBox;
    const width = max.x - min.x;
    const height = max.y - min.y;

    const uvAttribute = geometryShape.attributes.uv;
    for (let i = 0; i < uvAttribute.count; i++) {
      let u = uvAttribute.getX(i);
      let v = uvAttribute.getY(i);

      // Нормализуем: (значение - минимум) / ширина (координаты будут строго от 0 до 1)
      u = (u - min.x) / (width || 1);
      v = (v - min.y) / (height || 1);

      uvAttribute.setXY(i, u, v);
    }
    uvAttribute.needsUpdate = true;

    // Подготовка цвета (добавляем "#" к "cccccc")
    const materialData = materials.find(m => m.id === material_id)
    const materialColor = "#" + materialData.color;

    // Генерируем текстуру (передаем уже вычисленные width/height)
    const texture = this.createUnfoldingTexture(width, height, foldLines, min, materialColor);

    // Применяем материал
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      color: 0xffffff 
    });

    const mesh = new THREE.Mesh(geometryShape, material);

    // Применение трансформаций (позиция и поворот)
    mesh.position.set(position.x, position.y, 0)
    mesh.rotation.set(0, 0, rotation.z)
    
    // Сохраняем метаданные
    mesh.userData = { id }

    return mesh;
  }



  createUnfoldingTexture(width, height, foldLines, minCoord, color) {
    const ppu = 100; // Качество текстуры
    
    const canvas = document.createElement('canvas');
    // Ограничиваем размер, чтобы браузер не "упал" на огромных деталях
    canvas.width = Math.min(width * ppu, 4096);
    canvas.height = Math.min(height * ppu, 4096);
    
    const ctx = canvas.getContext('2d');

    // Масштабируем всё рисование под размер канваса
    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;

    const toCanvas = (x, y) => ({
      x: (x - minCoord.x) * scaleX,
      y: canvas.height - (y - minCoord.y) * scaleY // Переворачиваем Y
    });

    // Рисуем фон
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Рисуем линии сгиба
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4; // Сделаем потолще для заметности
    ctx.setLineDash([15, 10]); 

    foldLines.forEach(line => {
      const start = toCanvas(line[0].x, line[0].y);
      const end = toCanvas(line[1].x, line[1].y);

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    
    return texture;
  }
}