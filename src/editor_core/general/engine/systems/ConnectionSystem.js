import * as THREE from 'three';

export class ConnectionSystem {
  constructor(registry) {
    console.log('[->] ConnectionSystem: constructor')
    this.registry = registry;
    // Хранилище связей. 
    // Структура: { id: string, type: 'EDGE_TO_EDGE' | 'SURFACE', parentId: string, parentEdgeIndex: number, childId: string, childEdgeIndex: number }
    this.connections = []; 
  }

  // Добавление новой связи
  addConnection(connection) {
    console.log('[->] ConnectionSystem: addConnection()')
    this.connections.push(connection);
    this.updateDependencies(connection.parentId);
    this.registry.emitUIUpdate('connections:changed', this.connections);
  }

  // Удаление связи по ID
  removeConnection(id) {
    console.log('[->] ConnectionSystem: removeConnection()')
    this.connections = this.connections.filter(c => c.id !== id);
    this.registry.emitUIUpdate('connections:changed', this.connections);
  }

  // Удаление всех связей, связанных с конкретной фигурой (вызывается при удалении фигуры)
  removeConnectionsForShape(shapeId) {
    console.log('[->] ConnectionSystem: removeConnectionsForShape()')
    this.connections = this.connections.filter(c => c.parentId !== shapeId && c.childId !== shapeId);
    this.registry.emitUIUpdate('connections:changed', this.connections);
  }

  // Проверка, является ли фигура потомком (нужно для блокировки UI)
  isShapeChild(shapeId) {
    console.log('[->] ConnectionSystem: isShapeChild()')
    return this.connections.some(c => c.childId === shapeId);
  }

  // Каскадное обновление всех потомков при изменении родителя
  updateDependencies(parentId) {
    console.log('[->] ConnectionSystem: updateDependencies()')
    const childrenConnections = this.connections.filter(c => c.parentId === parentId);
    
    childrenConnections.forEach(conn => {
      this._solveConnection(conn);
      // Рекурсивно обновляем потомков этого потомка
      this.updateDependencies(conn.childId);
    });
  }

  // Основной "Солвер" (Решатель уравнений привязки)
  _solveConnection(conn) {
    console.log('[->] ConnectionSystem: _solveConnection()')
    if (conn.type === 'EDGE_TO_EDGE') {
      this._solveEdgeToEdge(conn);
    }
    // Здесь в будущем добавим 'EDGE_TO_SURFACE' и 'SURFACE_TO_SURFACE'
  }

  _solveEdgeToEdge(conn) {
    console.log('[->] ConnectionSystem: _solveEdgeToEdge()')
    const engine3D = this.registry.engine3D;
    if (!engine3D) return;

    // Получаем меши из сцены (в твоей архитектуре они, вероятно, хранятся в sceneSystem3D или shapeSystem)
    const parentMesh = engine3D.sceneSystem3D.getMeshById(conn.parentId);
    const childMesh = engine3D.sceneSystem3D.getMeshById(conn.childId);

    if (!parentMesh || !childMesh) return;

    const parentShape = parentMesh.userData.owner;
    const childShape = childMesh.userData.owner;

    // 1. Получаем мировое ребро родителя
    const parentEdgeWorld = parentShape.getWorldEdge(conn.parentEdgeIndex, parentMesh);
    // 2. Получаем ЛОКАЛЬНОЕ ребро потомка (чтобы понять, как его крутить относительно его собственного центра)
    const childEdgeLocal = childShape.getEdgeByIndex(conn.childEdgeIndex);

    if (!parentEdgeWorld || !childEdgeLocal) return;

    // Берем начальные и конечные точки ребер
    const p0_Parent = parentEdgeWorld.points3D[0];
    const p1_Parent = parentEdgeWorld.points3D[parentEdgeWorld.points3D.length - 1];
    
    const p0_ChildLocal = childEdgeLocal.points3D[0];
    const p1_ChildLocal = childEdgeLocal.points3D[childEdgeLocal.points3D.length - 1];

    // Вычисляем векторы направления
    const dirParentWorld = new THREE.Vector3().subVectors(p1_Parent, p0_Parent).normalize();
    const dirChildLocal = new THREE.Vector3().subVectors(p1_ChildLocal, p0_ChildLocal).normalize();

    // 3. Вычисляем необходимый поворот
    // Нам нужно повернуть потомка так, чтобы его локальный вектор ребра совпал с мировым вектором ребра родителя
    const quaternion = new THREE.Quaternion().setFromUnitVectors(dirChildLocal, dirParentWorld);
    const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');

    // 4. Временно применяем поворот к потомку, чтобы вычислить правильное смещение позиции
    childMesh.rotation.copy(euler);
    childMesh.updateMatrixWorld(true);

    // Теперь, когда потомок правильно повернут, находим, где в мире оказалась его стартовая точка
    const p0_ChildRotatedWorld = p0_ChildLocal.clone().applyMatrix4(childMesh.matrixWorld);

    // 5. Вычисляем вектор смещения позиции
    const translationDiff = new THREE.Vector3().subVectors(p0_Parent, p0_ChildRotatedWorld);
    
    const finalPosX = childMesh.position.x + translationDiff.x;
    const finalPosY = childMesh.position.y + translationDiff.y;
    const finalPosZ = childMesh.position.z + translationDiff.z;

    // 6. Формируем новые параметры для фигуры-потомка
    const newParams = {
      ...childShape.params,
      posX: finalPosX,
      posY: finalPosY,
      posZ: finalPosZ,
      rotationX: euler.x,
      rotationY: euler.y,
      rotationZ: euler.z
    };

    // 7. Обновляем параметры через ShapeSystem (без создания записи в истории)
    // Предполагается, что в ShapeSystem есть метод updateShapeParams без сайд-эффектов для истории
    this.registry.shapeSystem.updateShapeParamsSilent(conn.childId, newParams);
  }
}