import * as THREE from 'three';

export class BoxUnfoldStrategy {
  generate(sourceMesh) {
    const { width, height, depth } = sourceMesh.geometry.parameters;
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ 
      color: sourceMesh.material.color, 
      wireframe: true,
      side: THREE.DoubleSide 
    });

    // Описываем смещения для классического "креста" развертки
    // Центр — Передняя грань (Front)
    const faces = [
      { w: width, h: height, x: 0, y: 0, name: 'front' },
      { w: width, h: height, x: 0, y: height + depth, name: 'back' },
      { w: width, h: depth,  x: 0, y: height/2 + depth/2, name: 'top' },
      { w: width, h: depth,  x: 0, y: -(height/2 + depth/2), name: 'bottom' },
      { w: depth, h: height, x: -(width/2 + depth/2), y: 0, name: 'left' },
      { w: depth, h: height, x: (width/2 + depth/2), y: 0, name: 'right' },
    ];

    faces.forEach(f => {
      const geom = new THREE.PlaneGeometry(f.w, f.h);
      const mesh = new THREE.Mesh(geom, material.clone());
      mesh.position.set(f.x, f.y, 0);
      mesh.userData.faceName = f.name;
      group.add(mesh);
    });

    return group;
  }

  update(unfoldGroup, sourceMesh) {
    // Синхронизируем позицию всей развертки на 2D плоскости 
    // в соответствии с X и Z координатами 3D объекта
    unfoldGroup.position.set(sourceMesh.position.x, sourceMesh.position.z, 0);
    unfoldGroup.rotation.z = -sourceMesh.rotation.y; // Синхронизируем поворот
    
    // Масштабируем всю группу развертки
    unfoldGroup.scale.copy(sourceMesh.scale);
  }
}