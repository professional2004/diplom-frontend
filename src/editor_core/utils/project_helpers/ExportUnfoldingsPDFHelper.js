import { jsPDF } from "jspdf";

export class ExportUnfoldingsPDFHelper {
  static help(unfoldings, materials, project_name) {
    if (!unfoldings || unfoldings.length === 0) return;
    const unitScale = 10

    // Вспомогательная функция трансформации
    const getTransformedPoint = (p, pos, rotZ) => {
      const cos = Math.cos(rotZ);
      const sin = Math.sin(rotZ);
      const rx = p.x * cos - p.y * sin;
      const ry = p.x * sin + p.y * cos;
      return { x: rx + pos.x, y: ry + pos.y };
    };

    // Вспомогательная функция для конвертации HEX в RGB (для jsPDF)
    const hexToRgb = (hex) => {
      const bigint = parseInt(hex.replace('#', ''), 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
      };
    };

    // Считаем глобальные границы сцены
    let gMinX = Infinity, gMaxX = -Infinity, gMinY = Infinity, gMaxY = -Infinity;

    unfoldings.forEach(u => {
      const { position, rotation } = u.geometry;
      u.geometry.shape.shape_polyline.points.forEach(p => {
        const pt = getTransformedPoint(p, position, rotation.z);
        gMinX = Math.min(gMinX, pt.x);
        gMaxX = Math.max(gMaxX, pt.x);
        gMinY = Math.min(gMinY, pt.y);
        gMaxY = Math.max(gMaxY, pt.y);
      });
    });

    const mmWidth = (gMaxX - gMinX) * unitScale;
    const mmHeight = (gMaxY - gMinY) * unitScale;

    // Инициализируем PDF
    // 'l' - landscape, 'mm' - миллиметры, [ширина, высота] в мм
    const doc = new jsPDF({
      orientation: mmWidth > mmHeight ? 'l' : 'p',
      unit: 'mm',
      format: [mmWidth, mmHeight]
    });

    // Отрисовка каждой детали
    unfoldings.forEach(u => {
      const { geometry, material_id } = u;
      const { position, rotation } = geometry;
      const points = geometry.shape.shape_polyline.points;
      const foldLines = geometry.decoration.fold_lines;

      // Цвет
      const materialData = materials.find(m => m.id === material_id);
      const colorHex = materialData ? `#${materialData.color}` : '#cccccc';
      const rgb = hexToRgb(colorHex);

      // Рисуем основной контур (Path)
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.setDrawColor(0, 0, 0); // Черная обводка
      doc.setLineWidth(0.2);

      const transformedPoints = points.map(p => {
        const pt = getTransformedPoint(p, position, rotation.z);
        return [
          (pt.x - gMinX) * unitScale, 
          (gMaxY - pt.y) * unitScale // Инверсия Y
        ];
      });

      // Рисуем многоугольник (заливка + обводка 'FD')
      doc.lines(
          transformedPoints.map((p, i, arr) => {
              const next = arr[(i + 1) % arr.length];
              return [next[0] - p[0], next[1] - p[1]];
          }),
          transformedPoints[0][0], 
          transformedPoints[0][1], 
          [1, 1], 
          'FD', 
          true
      );

      // Рисуем линии сгиба
      doc.setLineDashPattern([3, 2], 0); // Пунктир
      doc.setLineWidth(0.3);

      foldLines.forEach(line => {
        const p1 = getTransformedPoint(line[0], position, rotation.z);
        const p2 = getTransformedPoint(line[1], position, rotation.z);

        doc.line(
          (p1.x - gMinX) * unitScale, 
          (gMaxY - p1.y) * unitScale,
          (p2.x - gMinX) * unitScale, 
          (gMaxY - p2.y) * unitScale
        );
      });

      // Сбрасываем пунктир для следующей детали
      doc.setLineDashPattern([], 0);
    });

    // Сохранение
    doc.save(`${project_name}.pdf`);
  }
}