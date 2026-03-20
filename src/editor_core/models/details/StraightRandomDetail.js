import { v4 as uuidv4 } from 'uuid';
import { CalculateGeometryMathHelper } from '@/editor_core/utils/geometry_math_helpers/CalculateGeometryMathHelper'

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



  calculateSurfaces(parameters) {
    const { shape_polyline, depth } = parameters;
    const points = shape_polyline.points;
    const isClosed = shape_polyline.type === "closed";

    // Рассчитываем периметр основания
    // Он нужен для формирования прямоугольника развертки боковой (цилиндрической) поверхности
    const perimeter = CalculateGeometryMathHelper.calculatePolylineLength(points, isClosed);
    const surfaces = [];

    // Нижняя плоская поверхность
    surfaces.push({
      id: uuidv4(),
      type: "flat",
      geometry: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        shape: {
          // Делаем глубокую копию, чтобы избежать мутаций по ссылке
          bounding_polyline: JSON.parse(JSON.stringify(shape_polyline))
        }
      },
      unfolding: {
        material_id: "default"
      }
    });

    // Верхняя плоская поверхность
    surfaces.push({
      id: uuidv4(),
      type: "flat",
      geometry: {
        position: { x: 0, y: 0, z: depth },
        rotation: { x: 0, y: 0, z: 0 }, 
        shape: {
          bounding_polyline: JSON.parse(JSON.stringify(shape_polyline))
        }
      },
      unfolding: {
        material_id: "default"
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
          base_polyline: JSON.parse(JSON.stringify(shape_polyline)),
          bounding_polyline: {
            type: "closed",
            points: [
              { x: 0, y: 0 },
              { x: perimeter, y: 0 },
              { x: perimeter, y: depth },
              { x: 0, y: depth }
            ]
          }
        }
      },
      unfolding: {
        material_id: "default"
      }
    });

    return surfaces;
  }
}