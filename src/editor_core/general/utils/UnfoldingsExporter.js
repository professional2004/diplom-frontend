import { jsPDF } from 'jspdf';

export class UnfoldingsExporter {
  constructor(sceneSystem2D) {
    this.sceneSystem2D = sceneSystem2D
  }

  // Сбор данных со всех разверток на 2D сцене
  _collectLayout() {
    const scene2D = this.sceneSystem2D.scene;
    const parts = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    scene2D.traverse((obj) => {
      if (obj.isMesh) {
          // Проверяем, почему объект может не подходить под условия
          if (!obj.userData?.isUnfoldPart) console.log("Пропущен меш: нет флага isUnfoldPart", obj);
          if (!obj.userData?.exportData) console.log("Пропущен меш: нет данных exportData", obj);
      }

      if (obj.isMesh && obj.userData?.isUnfoldPart && obj.userData?.exportData) {
        const data = obj.userData.exportData;
        const pos = obj.position;
        const rot = obj.rotation.z;

        // Трансформируем локальные точки детали в мировые координаты 2D-сцены
        const transform = (p) => {
          const cos = Math.cos(rot);
          const sin = Math.sin(rot);
          const tx = p.x * cos - p.y * sin + pos.x;
          const ty = p.x * sin + p.y * cos + pos.y;
          
          minX = Math.min(minX, tx); maxX = Math.max(maxX, tx);
          minY = Math.min(minY, ty); maxY = Math.max(maxY, ty);
          return { x: tx, y: ty };
        };

        parts.push({
          polygon: data.polygon.map(transform),
          foldLines: data.foldLines.map(l => ({ start: transform(l.start), end: transform(l.end) }))
        });
      }
    });

    if (parts.length === 0) {
      console.warn("Экспорт отменен: на сцене не найдено подходящих деталей развертки.");
      return null;
    }

    console.log(`Найдено деталей для экспорта: ${parts.length}`);

    const padding = 10; // отступ в мм
    return {
      parts,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2,
      offsetX: minX - padding,
      offsetY: minY - padding,
      maxY: maxY // нужно для инверсии оси Y
    };
  }

  // Экспорт в SVG
  exportToSVG() {
    const layout = this._collectLayout();
    if (!layout) return false;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}mm" height="${layout.height}mm" viewBox="0 0 ${layout.width} ${layout.height}">\n`;
    
    // В Three.js Y идет вверх, в SVG — вниз. Инвертируем через группу.
    svg += `  <g transform="translate(${-layout.offsetX}, ${layout.height + layout.offsetY}) scale(1, -1)">\n`;

    layout.parts.forEach(part => {
      // Контур (черный)
      const points = part.polygon.map(p => `${p.x},${p.y}`).join(' ');
      svg += `    <polygon points="${points}" fill="none" stroke="black" stroke-width="0.5" />\n`;
      
      // Линии сгиба (пунктир)
      part.foldLines.forEach(l => {
        svg += `    <line x1="${l.start.x}" y1="${l.start.y}" x2="${l.end.x}" y2="${l.end.y}" stroke="blue" stroke-width="0.3" stroke-dasharray="2,2" />\n`;
      });
    });

    svg += `  </g>\n</svg>`;
    this._downloadFile(svg, 'pattern.svg', 'image/svg+xml');
    return true;
  }

  // Экспорт в PDF
  exportToPDF() {
    const layout = this._collectLayout();
    if (!layout) return false;

    const doc = new jsPDF({
      orientation: layout.width > layout.height ? 'l' : 'p',
      unit: 'mm',
      format: [layout.width, layout.height]
    });

    layout.parts.forEach(part => {
      // Рисуем контур
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      const poly = part.polygon.map(p => [p.x - layout.offsetX, layout.height - (p.y - layout.offsetY)]);
      doc.polygon(poly, 'S');

      // Рисуем линии сгиба
      doc.setDrawColor(100, 100, 255);
      doc.setLineWidth(0.2);
      part.foldLines.forEach(l => {
        doc.line(
          l.start.x - layout.offsetX, layout.height - (l.start.y - layout.offsetY),
          l.end.x - layout.offsetX, layout.height - (l.end.y - layout.offsetY)
        );
      });
    });

    doc.save('pattern.pdf');
    return true;
  }

  _downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}