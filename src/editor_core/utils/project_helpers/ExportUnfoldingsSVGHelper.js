export class ExportUnfoldingsSVGHelper {
  static help(unfoldings, materials, project_name) {
    if (!unfoldings || unfoldings.length === 0) return '';
    const unitScale = 10

    // Вспомогательная функция для трансформации точки (поворот + позиция)
    const getTransformedPoint = (p, pos, rotZ) => {
      // Поворот вокруг локального центра (0,0)
      const cos = Math.cos(rotZ);
      const sin = Math.sin(rotZ);
      const rx = p.x * cos - p.y * sin;
      const ry = p.x * sin + p.y * cos;

      // Смещение на позицию в сцене
      return {
        x: rx + pos.x,
        y: ry + pos.y
      };
    };

    // Вычисляем глобальные границы всей сцены
    let gMinX = Infinity, gMaxX = -Infinity, gMinY = Infinity, gMaxY = -Infinity;

    unfoldings.forEach(u => {
      const { position, rotation } = u.geometry;
      u.geometry.shape.shape_polyline.points.forEach(p => {
        const pt = getTransformedPoint(p, position, rotation.z);
        if (pt.x < gMinX) gMinX = pt.x;
        if (pt.x > gMaxX) gMaxX = pt.x;
        if (pt.y < gMinY) gMinY = pt.y;
        if (pt.y > gMaxY) gMaxY = pt.y;
      });
    });

    const sceneWidth = (gMaxX - gMinX);
    const sceneHeight = (gMaxY - gMinY);

    // Генерация контента SVG
    let svgContent = '';

    unfoldings.forEach(u => {
      const { geometry, material_id } = u;
      const { position, rotation } = geometry;
      const points = geometry.shape.shape_polyline.points;
      const foldLines = geometry.decoration.fold_lines;

      // Цвет
      const materialData = materials.find(m => m.id === material_id);
      const color = materialData ? `#${materialData.color}` : '#cccccc';

      // Рисуем основной контур детали
      const d = points.map((p, i) => {
        const pt = getTransformedPoint(p, position, rotation.z);
        // Перевод в координаты SVG (относительно gMinX/gMaxY)
        const x = (pt.x - gMinX) * unitScale;
        const y = (gMaxY - pt.y) * unitScale; // Инверсия Y
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(3)} ${y.toFixed(3)}`;
      }).join(' ') + ' Z';

      svgContent += `<path d="${d}" fill="${color}" stroke="black" stroke-width="0.5" />\n`;

      // Рисуем линии сгиба для этой детали
      foldLines.forEach(line => {
        const p1 = getTransformedPoint(line[0], position, rotation.z);
        const p2 = getTransformedPoint(line[1], position, rotation.z);

        const x1 = (p1.x - gMinX) * unitScale;
        const y1 = (gMaxY - p1.y) * unitScale;
        const x2 = (p2.x - gMinX) * unitScale;
        const y2 = (gMaxY - p2.y) * unitScale;

        svgContent += `<line x1="${x1.toFixed(3)}" y1="${y1.toFixed(3)}" 
                            x2="${x2.toFixed(3)}" y2="${y2.toFixed(3)}" 
                            stroke="black" stroke-width="0.3" stroke-dasharray="3,2" />\n`;
      });
    });

    // Финальная сборка файла
    const mmWidth = sceneWidth * unitScale;
    const mmHeight = sceneHeight * unitScale;

    const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
  <svg width="${mmWidth}mm" height="${mmHeight}mm" 
      viewBox="0 0 ${mmWidth} ${mmHeight}" 
      xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ffffff" /> ${svgContent}
  </svg>`;

    // загрузка файла
    const a = document.createElement("a");
    const file = new Blob([svg], { type: 'image/svg+xml' });
    a.href = URL.createObjectURL(file);
    a.download = `${project_name}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);  
  }

}