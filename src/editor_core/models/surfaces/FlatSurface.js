import * as THREE from 'three'

export class FlatSurface {
  
  generateMesh(surface, materials) {
    const { geometry, unfolding, id, type } = surface;
    const { shape, position, rotation } = geometry;
    const { points } = shape.bounding_polyline;
    
    // Создание формы на основе точек ограничивающего многоугольника
    const threeShape = new THREE.Shape();
    threeShape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      threeShape.lineTo(points[i].x, points[i].y);
    }
    threeShape.closePath(); // Замыкаем контур

    // Создание геометрии и расчет нормалей
    const meshGeom = new THREE.ShapeGeometry(threeShape);
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

    // Применение трансформаций (позиция и поворот)
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);

    // Сохраняем метаданные
    mesh.userData = { id, type }

    return mesh;
  }
}