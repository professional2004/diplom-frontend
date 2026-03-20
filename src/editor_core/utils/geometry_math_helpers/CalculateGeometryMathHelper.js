export class CalculateGeometryMathHelper {

  
  // Оптимизированная версия Sutherland-Hodgman для триангуляции (разрезает треугольники вертикальной линией X = L)
  static sliceTriangles(triangles, L) {
    const out = [];
    for (const tri of triangles) {
      const aL = tri[0].x < L, bL = tri[1].x < L, cL = tri[2].x < L;

      if ((aL && bL && cL) || (!aL && !bL && !cL)) {
        out.push(tri);
        continue;
      }

      let v0, v1, v2;
      if (bL === cL) { v0 = tri[0]; v1 = tri[1]; v2 = tri[2]; }
      else if (aL === cL) { v0 = tri[1]; v1 = tri[2]; v2 = tri[0]; }
      else { v0 = tri[2]; v1 = tri[0]; v2 = tri[1]; }

      const t1 = (L - v0.x) / (v1.x - v0.x);
      const i1 = { x: L, y: v0.y + t1 * (v1.y - v0.y) };
      const t2 = (L - v0.x) / (v2.x - v0.x);
      const i2 = { x: L, y: v0.y + t2 * (v2.y - v0.y) };

      out.push([v0, i1, i2]);
      out.push([v1, v2, i2]);
      out.push([v1, i2, i1]);
    }
    return out;
  }




  // Алгоритм Сазерленда-Ходжмена для отсечения 2D-полигона лучом
  static clipAgainstRay(poly, ray, isLeft) {
    if (poly.length < 3) return []
    const result = []
    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i]
      const next = poly[(i + 1) % poly.length]
      const crossCur = ray.x * cur.y - ray.y * cur.x
      const crossNext = ray.x * next.y - ray.y * next.x
      const isCurInside = isLeft ? crossCur >= -1e-8 : crossCur <= 1e-8
      const isNextInside = isLeft ? crossNext >= -1e-8 : crossNext <= 1e-8

      if (isCurInside) result.push(cur)
      if (isCurInside !== isNextInside) {
        const Nx = -ray.y, Ny = ray.x
        const denom = Nx * (next.x - cur.x) + Ny * (next.y - cur.y)
        if (Math.abs(denom) > 1e-12) {
          const t = -(Nx * cur.x + Ny * cur.y) / denom
          result.push(new THREE.Vector2(cur.x + t * (next.x - cur.x), cur.y + t * (next.y - cur.y)))
        }
      }
    }
    return result
  }






}