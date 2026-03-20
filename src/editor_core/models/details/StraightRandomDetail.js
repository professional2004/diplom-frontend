import { v4 as uuidv4 } from 'uuid';

export class StraightRandomDetail {
  
  create() {
    const detail = {
      id: uuidv4(),
      type: "straight_random",
      parameters: {
        shape_polyline: {
          type: "closed",
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 5 },
            { x: 4, y: 5 },
            { x: 4, y: 0 }
          ]
        },
        depth: 1
      }
    }
    detail.surfaces = this.calculateSurfaces(detail.parameters)
    return detail
  }

  randomPosition() {
    return (Math.random() - 0.5) * 10
  }


  calculateSurfaces(parameters) {
    const { shape_polyline, depth } = parameters;
    const points = shape_polyline.points;
    
    // Расчет параметров для развертки цилиндрической поверхности (стенок)
    let perimeter = 0;
    const fold_lines = [];
    
    // Проходим по всем точкам, включая замыкающий отрезок (от последней к первой)
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      // Вычисляем длину текущего отрезка (Теорема Пифагора)
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      
      perimeter += segmentLength;
      
      // Добавляем линию сгиба на каждом изломе полилинии.
      // На самом последнем шаге линию сгиба не добавляем, так как 
      // это будет край прямоугольника развертки, где деталь сшивается.
      if (i < points.length - 1) {
        fold_lines.push([
          { x: perimeter, y: 0 },
          { x: perimeter, y: depth }
        ]);
      }
    }

    // Ограничивающий многоугольник (и форма развертки) для цилиндрической поверхности — это прямоугольник
    const cylinderBoundingPolyline = {
      type: "closed",
      points: [
        { x: 0, y: 0 },
        { x: perimeter, y: 0 },
        { x: perimeter, y: depth },
        { x: 0, y: depth }
      ]
    };

    // Формирование массива поверхностей
    const surfaces = [];

    // Нижняя плоская поверхность (z = 0)
    surfaces.push({
      id: uuidv4(),
      type: "flat",
      geometry: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        shape: {
          bounding_polyline: shape_polyline
        }
      },
      unfolding: {
        id: uuidv4(),
        material_id: "default",
        geometry: {
          position: { x: this.randomPosition(), y: this.randomPosition() },
          rotation: { z: 0 },
          shape: {
            shape_polyline: shape_polyline
          },
          decoration: {
            fold_lines: []
          }
        }
      }
    });

    // Верхняя плоская поверхность (сдвинута по оси Z на значение depth)
    surfaces.push({
      id: uuidv4(),
      type: "flat",
      geometry: {
        position: { x: 0, y: 0, z: depth },
        rotation: { x: 0, y: 0, z: 0 },
        shape: {
          bounding_polyline: shape_polyline
        }
      },
      unfolding: {
        id: uuidv4(),
        material_id: "default",
        geometry: {
          position: { x: this.randomPosition(), y: this.randomPosition() },
          rotation: { z: 0 },
          shape: {
            shape_polyline: shape_polyline
          },
          decoration: {
            fold_lines: []
          }
        }
      }
    });

    // Боковая цилиндрическая поверхность
    surfaces.push({
      id: uuidv4(),
      type: "cylindrical",
      geometry: {
        position: { x: 0, y: 0, z: depth },
        rotation: { x: -Math.PI/2, y: 0, z: 0 },
        shape: {
          base_polyline: shape_polyline,
          bounding_polyline: cylinderBoundingPolyline
        }
      },
      unfolding: {
        id: uuidv4(),
        material_id: "default",
        geometry: {
          position: { x: this.randomPosition(), y: this.randomPosition() },
          rotation: { z: 0 },
          shape: {
            shape_polyline: cylinderBoundingPolyline
          },
          decoration: {
            fold_lines: fold_lines
          }
        }
      }
    });

    return surfaces;
  }
}