import { v4 as uuidv4 } from 'uuid';
import { CalculateGeometryMathHelper } from '@/editor_core/utils/geometry_math_helpers/CalculateGeometryMathHelper'

export class StraightRandomDetail {
  
  createDetail() {
    const detail = {
      id: uuidv4(),
      type: "straight_random",
      parameters: {
        shape_polyline: {
          type: "closed",
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 6 },
            { x: 10, y: 6 },
            { x: 10, y: 0 }
          ]
        },
        depth: 4
      }
    }
    detail.surfaces = this.calculateDetailSurfaces(detail.parameters)
    return detail
  }


  calculateDetailSurfaces(detail) {
    const parameters = detail.parameters
    const shapePolyline = parameters.shape_polyline;
    const depth = parameters.depth;
    
    const isClosed = shapePolyline.type === "closed";
    const points = shapePolyline.points;
    
    // Вычисляем длину контура для развертки боковой поверхности
    const perimeter = CalculateGeometryMathHelper.calculatePolylineLength(points, isClosed);

    // Формируем массив поверхностей
    const surfaces = []

    // Передняя плоская поверхность (Z = depth)
    surfaces.push({
      id: uuidv4(),
      type: "flat",
      geometry: {
        position: { x: 0, y: 0, z: depth },
        rotation: { x: 0, y: 0, z: 0 },
        shape: {
          bounding_polyline: {
            type: shapePolyline.type,
            points: JSON.parse(JSON.stringify(points)) // Глубокая копия точек
          }
        }
      },
      unfolding: { material_id: "default" }
    });

    // Задняя плоская поверхность (Z = 0)
    surfaces.push({
      id: uuidv4(),
      type: "flat",
      geometry: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }, 
        shape: {
          bounding_polyline: {
            type: shapePolyline.type,
            points: JSON.parse(JSON.stringify(points))
          }
        }
      },
      unfolding: { material_id: "default" }
    });

    // Цилиндрическая (боковая) поверхность
    // Развертка представляет собой прямоугольник: ширина = периметр, высота = depth
    surfaces.push({
      id: uuidv4(),
      type: "cylindrical",
      geometry: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        shape: {
          base_polyline: {
            type: shapePolyline.type,
            points: JSON.parse(JSON.stringify(points))
          },
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
      unfolding: { material_id: "default" }
    });

    return surfaces;
  }
}