import * as THREE from 'three'
import { CalculateGeometryMathHelper } from '@/editor_core/utils/geometry_math_helpers/CalculateGeometryMathHelper'

export class CylindricalSurface {
  
  generateMesh(surface, materials) {
    const { geometry, unfolding, id, type } = surface;
    const { shape, position, rotation } = geometry;
    const { base_polyline, bounding_polyline } = shape;
    
    // Подготовка базовой полилинии и расчет длин дуг (развертки)
    let basePts = base_polyline.points.map(p => new THREE.Vector3(p.x, 0, p.y));
    
    // Обработка замкнутого контура основания
    if (base_polyline.type === 'closed' && basePts.length > 0) {
      const first = basePts[0];
      const last = basePts[basePts.length - 1];
      if (first.distanceToSquared(last) > 1e-10) {
        basePts.push(first.clone());
      }
    }

    if (basePts.length < 2) return new THREE.Mesh();

    // Расчет кумулятивных длин для оси U
    const lens = [0];
    for (let i = 1; i < basePts.length; i++) {
      lens.push(lens[i - 1] + basePts[i].distanceTo(basePts[i - 1]));
    }

    // Создание плоской геометрии из ограничивающего многоугольника
    const shape2D = new THREE.Shape();
    const bPoints = bounding_polyline.points;
    if (bPoints.length < 3) return new THREE.Mesh();

    shape2D.moveTo(bPoints[0].x, bPoints[0].y);
    for (let i = 1; i < bPoints.length; i++) {
      shape2D.lineTo(bPoints[i].x, bPoints[i].y);
    }
    shape2D.closePath();

    const geom2D = new THREE.ShapeGeometry(shape2D);
    const pos2D = geom2D.attributes.position;
    const index2D = geom2D.index;

    // Извлекаем треугольники
    let triangles = [];
    for (let i = 0; i < (index2D ? index2D.count : pos2D.count); i += 3) {
      const getPt = (idx) => ({
        x: pos2D.getX(index2D ? index2D.getX(idx) : idx),
        y: pos2D.getY(index2D ? index2D.getX(idx) : idx)
      });
      triangles.push([getPt(i), getPt(i + 1), getPt(i + 2)]);
    }

    // Разрезание треугольников по линиям изгиба основания (U-координаты)
    for (let i = 1; i < lens.length - 1; i++) {
      triangles = CalculateGeometryMathHelper.sliceTriangles(triangles, lens[i]);
    }

    // Проецирование в 3D пространство
    const positions = new Float32Array(triangles.length * 9);
    let pIdx = 0;

    for (const tri of triangles) {
      // Центр масс для определения сегмента полилинии
      const cx = (tri[0].x + tri[1].x + tri[2].x) / 3;
      let sec = 0;
      for (let j = 0; j < lens.length - 1; j++) {
        if (cx >= lens[j] && cx <= lens[j + 1]) {
          sec = j;
          break;
        }
        if (cx > lens[j + 1]) sec = j;
      }

      const L0 = lens[sec], L1 = lens[sec + 1], lenSec = L1 - L0;
      const p0 = basePts[sec], p1 = basePts[sec + 1];

      for (const pt of tri) {
        const t = lenSec > 0 ? Math.max(0, Math.min(1, (pt.x - L0) / lenSec)) : 0;
        // x, z — интерполяция по основанию, y — высота из развертки
        positions[pIdx++] = p0.x + (p1.x - p0.x) * t;
        positions[pIdx++] = pt.y;
        positions[pIdx++] = p0.z + (p1.z - p0.z) * t;
      }
    }

    // Сборка меша
    const meshGeom = new THREE.BufferGeometry();
    meshGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    meshGeom.computeVertexNormals();

    // Подготовка цвета (превращаем "cccccc" в 0xcccccc)
    const matColor = parseInt(materials[unfolding.material_id].color, 16);

    // Применяем материал
    const material = new THREE.MeshStandardMaterial({
      color: matColor,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.5
    });

    const mesh = new THREE.Mesh(meshGeom, material);
    
    // Применение трансформаций
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    
    // Сохраняем метаданные
    mesh.userData = { id, type };

    return mesh;
  }
}