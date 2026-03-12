import * as THREE from 'three';

export class ConnectionSystem {
  constructor(registry) {
    this.registry = registry;
    // Хранилище связей. 
    // Структура: 
    // EDGE_TO_EDGE: { id, type: 'EDGE_TO_EDGE', parentId, parentEdgeIndex, childId, childEdgeIndex }
    // EDGE_TO_PLANE: { id, type: 'EDGE_TO_PLANE', parentId, parentPlaneIndex, childId, childEdgeIndex, bindingEdgeId }
    // PLANE_TO_PLANE: { id, type: 'PLANE_TO_PLANE', parentId, childId }
    this.connections = []; 
  }

  // Добавление новой связи
  addConnection(connection) {
    // Валидация связи
    if (!this._validateConnection(connection)) {
      console.warn('[ConnectionSystem] Invalid connection:', connection);
      return false;
    }
    this.connections.push(connection);
    this.updateDependencies(connection.parentId);
    this.registry.emitUIUpdate('connections:changed', this.connections);
    return true;
  }

  // Удаление связи по ID
  removeConnection(id) {
    this.connections = this.connections.filter(c => c.id !== id);
    this.registry.emitUIUpdate('connections:changed', this.connections);
  }

  // Удаление всех связей, связанных с конкретной фигурой (вызывается при удалении фигуры)
  removeConnectionsForShape(shapeId) {
    this.connections = this.connections.filter(c => c.parentId !== shapeId && c.childId !== shapeId);
    this.registry.emitUIUpdate('connections:changed', this.connections);
  }

  // Проверка, является ли фигура потомком (нужно для блокировки UI)
  isShapeChild(shapeId) {
    return this.connections.some(c => c.childId === shapeId);
  }

  // Валидация типа связи перед добавлением
  _validateConnection(connection) {
    if (!connection || !connection.type) return false;
    
    const engine3D = this.registry.engine3D;
    if (!engine3D) return false;

    const parentMesh = engine3D.sceneSystem3D.getMeshById(connection.parentId);
    const childMesh = engine3D.sceneSystem3D.getMeshById(connection.childId);

    if (!parentMesh || !childMesh) return false;

    const parentShape = parentMesh.userData.owner;
    const childShape = childMesh.userData.owner;

    if (!parentShape || !childShape) return false;

    switch (connection.type) {
      case 'EDGE_TO_EDGE':
        return this._validateEdgeToEdge(connection, parentShape, childShape);
      case 'EDGE_TO_PLANE':
        return this._validateEdgeToPlane(connection, parentShape, childShape);
      case 'PLANE_TO_PLANE':
        return this._validatePlaneToPlane(connection, parentShape, childShape);
      default:
        return false;
    }
  }

  // Валидация связи "ребро к ребру"
  _validateEdgeToEdge(connection, parentShape, childShape) {
    const parentEdge = parentShape.getEdgeByIndex(connection.parentEdgeIndex);
    const childEdge = childShape.getEdgeByIndex(connection.childEdgeIndex);

    if (!parentEdge || !childEdge) return false;

    // Ребра должны иметь одинаковую длину
    const lengthDiff = Math.abs(parentEdge.length - childEdge.length);
    if (lengthDiff > 1e-6) {
      console.warn(`[ConnectionSystem] Edge lengths do not match: ${parentEdge.length} vs ${childEdge.length}`);
      return false;
    }

    return true;
  }

  // Валидация связи "ребро к плоскости"
  _validateEdgeToPlane(connection, parentShape, childShape) {
    // Должна быть плоскость родителя и ребро потомка
    // Ребро должно быть прямой линией
    const childEdge = childShape.getEdgeByIndex(connection.childEdgeIndex);

    if (!childEdge || !childEdge.points3D || childEdge.points3D.length < 2) {
      return false;
    }

    // Проверяем, что ребро - прямая линия (все промежуточные точки лежат на линии между начало и конец)
    const p0 = childEdge.points3D[0];
    const p1 = childEdge.points3D[childEdge.points3D.length - 1];
    const lineDir = new THREE.Vector3().subVectors(p1, p0).normalize();

    for (let i = 1; i < childEdge.points3D.length - 1; i++) {
      const p = childEdge.points3D[i];
      const toP = new THREE.Vector3().subVectors(p, p0);
      const projection = toP.dot(lineDir);
      const projPoint = new THREE.Vector3().copy(p0).addScaledVector(lineDir, projection);
      
      if (p.distanceTo(projPoint) > 1e-6) {
        console.warn(`[ConnectionSystem] Child edge is not a straight line`);
        return false;
      }
    }

    return true;
  }

  // Валидация связи "плоскость к плоскости"
  _validatePlaneToPlane(connection, parentShape, childShape) {
    // Оба объекта должны быть одного типа поверхности
    const parentType = parentShape.constructor.name;
    const childType = childShape.constructor.name;

    if (parentType !== childType) {
      console.warn(`[ConnectionSystem] Surface types do not match: ${parentType} vs ${childType}`);
      return false;
    }

    // Допустимые пары типов
    const validTypes = ['FlatSurfaceShape', 'ConicalSurfaceShape', 'CylindricalSurfaceShape'];
    if (!validTypes.includes(parentType)) {
      console.warn(`[ConnectionSystem] Unsupported surface type for plane-to-plane: ${parentType}`);
      return false;
    }

    return true;
  }

  // Каскадное обновление всех потомков при изменении родителя
  updateDependencies(parentId) {
    const childrenConnections = this.connections.filter(c => c.parentId === parentId);
    
    childrenConnections.forEach(conn => {
      this._solveConnection(conn);
      // Рекурсивно обновляем потомков этого потомка
      this.updateDependencies(conn.childId);
    });
  }

  // Основной "Солвер" (Решатель уравнений привязки)
  _solveConnection(conn) {
    switch (conn.type) {
      case 'EDGE_TO_EDGE':
        this._solveEdgeToEdge(conn);
        break;
      case 'EDGE_TO_PLANE':
        this._solveEdgeToPlane(conn);
        break;
      case 'PLANE_TO_PLANE':
        this._solvePlaneToPlane(conn);
        break;
      default:
        console.warn('[ConnectionSystem] Unknown connection type:', conn.type);
    }
  }

  _solveEdgeToEdge(conn) {
    const engine3D = this.registry.engine3D;
    if (!engine3D) return;

    const parentMesh = engine3D.sceneSystem3D.getMeshById(conn.parentId);
    const childMesh = engine3D.sceneSystem3D.getMeshById(conn.childId);

    if (!parentMesh || !childMesh) return;

    const parentShape = parentMesh.userData.owner;
    const childShape = childMesh.userData.owner;

    if (!parentShape || !childShape) return;

    // 1. Получаем мировое ребро родителя
    const parentEdgeWorld = parentShape.getWorldEdge(conn.parentEdgeIndex, parentMesh);
    // 2. Получаем ЛОКАЛЬНОЕ ребро потомка
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
    const quaternion = new THREE.Quaternion().setFromUnitVectors(dirChildLocal, dirParentWorld);
    const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');

    // 4. Временно применяем поворот к потомку для вычисления смещения позиции
    childMesh.rotation.copy(euler);
    childMesh.updateMatrixWorld(true);

    // Находим, где в мире оказалась стартовая точка ребра потомка после поворота
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

    // 7. Обновляем параметры через ShapeSystem
    this.registry.shapeSystem.updateShapeParamsSilent(conn.childId, newParams);
  }

  _solveEdgeToPlane(conn) {
    const engine3D = this.registry.engine3D;
    if (!engine3D) return;

    const parentMesh = engine3D.sceneSystem3D.getMeshById(conn.parentId);
    const childMesh = engine3D.sceneSystem3D.getMeshById(conn.childId);

    if (!parentMesh || !childMesh) return;

    const parentShape = parentMesh.userData.owner;
    const childShape = childMesh.userData.owner;

    if (!parentShape || !childShape) return;

    // 1. Получаем ребро потомка в локальных координатах
    const childEdgeLocal = childShape.getEdgeByIndex(conn.childEdgeIndex);
    if (!childEdgeLocal) return;

    const p0_ChildLocal = childEdgeLocal.points3D[0];
    const p1_ChildLocal = childEdgeLocal.points3D[childEdgeLocal.points3D.length - 1];

    // 2. Получаем нормаль плоскости родителя (в мировых координатах)
    const parentNormal = parentShape.getSurfaceNormal ? parentShape.getSurfaceNormal(conn.parentPlaneIndex || 0, parentMesh) 
      : this._defaultGetSurfaceNormal(parentShape, parentMesh, conn.parentPlaneIndex);
    
    if (!parentNormal) return;

    // 3. Вычисляем направление ребра потомка
    const dirChildLocal = new THREE.Vector3().subVectors(p1_ChildLocal, p0_ChildLocal).normalize();

    // 4. Вычисляем поворот так, чтобы ребро было параллельно плоскости (перпендикулярно нормали)
    // Ребро должно лежать в плоскости, поэтому его проектируем на плоскость
    const projDir = new THREE.Vector3().copy(dirChildLocal);
    const dotProduct = projDir.dot(parentNormal);
    projDir.addScaledVector(parentNormal, -dotProduct).normalize();

    // Если проекция близка к нулю, ребро параллельно нормали - это ошибка
    if (projDir.length() < 1e-6) {
      console.warn('[ConnectionSystem] Edge is parallel to plane normal');
      return;
    }

    // 5. Поворачиваем потомка так, чтобы его ребро совпало с проекцией
    const quaternion = new THREE.Quaternion().setFromUnitVectors(dirChildLocal, projDir);
    const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');

    // 6. Применяем поворот
    childMesh.rotation.copy(euler);
    childMesh.updateMatrixWorld(true);

    // 7. Позиционируем так, чтобы ребро лежало на плоскости
    // Получаем точку на плоскости родителя
    const planePoint = parentShape.getSurfacePoint ? parentShape.getSurfacePoint(conn.parentPlaneIndex || 0, parentMesh)
      : this._defaultGetPlanePoint(parentShape, parentMesh, conn.parentPlaneIndex);
    
    // Проецируем начало ребра потомка на плоскость
    const p0_ChildRotatedWorld = p0_ChildLocal.clone().applyMatrix4(childMesh.matrixWorld);
    const toPoint = new THREE.Vector3().subVectors(planePoint, p0_ChildRotatedWorld);
    const projection = toPoint.dot(parentNormal);
    
    const finalPos = new THREE.Vector3().copy(childMesh.position).addScaledVector(parentNormal, projection);

    // 8. Формируем новые параметры
    const newParams = {
      ...childShape.params,
      posX: finalPos.x,
      posY: finalPos.y,
      posZ: finalPos.z,
      rotationX: euler.x,
      rotationY: euler.y,
      rotationZ: euler.z
    };

    this.registry.shapeSystem.updateShapeParamsSilent(conn.childId, newParams);
  }

  _solvePlaneToPlane(conn) {
    const engine3D = this.registry.engine3D;
    if (!engine3D) return;

    const parentMesh = engine3D.sceneSystem3D.getMeshById(conn.parentId);
    const childMesh = engine3D.sceneSystem3D.getMeshById(conn.childId);

    if (!parentMesh || !childMesh) return;

    const parentShape = parentMesh.userData.owner;
    const childShape = childMesh.userData.owner;

    if (!parentShape || !childShape) return;

    // 1. Получаем нормали поверхностей
    const parentNormal = parentShape.getSurfaceNormal ? parentShape.getSurfaceNormal(0, parentMesh)
      : this._defaultGetSurfaceNormal(parentShape, parentMesh, 0);
    
    if (!parentNormal) return;

    // Для потомка используем локальную нормаль (0,0,1) - стандартная нормаль
    const childNormalLocal = new THREE.Vector3(0, 0, 1);

    // 2. Вычисляем поворот так, чтобы нормали совпадали
    const quaternion = new THREE.Quaternion().setFromUnitVectors(childNormalLocal, parentNormal);
    const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');

    // 3. Применяем поворот
    childMesh.rotation.copy(euler);
    childMesh.updateMatrixWorld(true);

    // 4. Позиционируем потомка так, чтобы его поверхность совпала с поверхностью родителя
    const parentPoint = parentShape.getSurfacePoint ? parentShape.getSurfacePoint(0, parentMesh)
      : this._defaultGetPlanePoint(parentShape, parentMesh, 0);
    
    // Получаем центр потомка в локальных координатах
    const childCenterLocal = new THREE.Vector3(0, 0, 0);
    
    // Переводим в мировые координаты после поворота
    const childCenterRotated = childCenterLocal.clone().applyMatrix4(childMesh.matrixWorld);
    
    // Выравниваем поверхности
    const diff = new THREE.Vector3().subVectors(parentPoint, childCenterRotated);
    const finalPos = new THREE.Vector3().copy(childMesh.position).add(diff);

    // 5. Для плоскости к плоскости изменяется ограничивающий многоугольник, но не геометрия!
    // Многоугольник потомка должен совпадать с многоугольником родителя
    const newParams = {
      ...childShape.params,
      posX: finalPos.x,
      posY: finalPos.y,
      posZ: finalPos.z,
      rotationX: euler.x,
      rotationY: euler.y,
      rotationZ: euler.z,
      polygon: [...parentShape.params.polygon] // Копируем многоугольник
    };

    this.registry.shapeSystem.updateShapeParamsSilent(conn.childId, newParams);
  }

  // Вспомогательные методы для получения информации о поверхностях
  _defaultGetSurfaceNormal(shape, mesh, planeIndex = 0) {
    // Для плоской поверхности нормаль - это Z-ось в мировых координатах
    const normalLocal = new THREE.Vector3(0, 0, 1);
    const normalWorld = normalLocal.clone().applyMatrix4(mesh.matrixWorld);
    normalWorld.sub(mesh.position).normalize();
    return normalWorld;
  }

  _defaultGetPlanePoint(shape, mesh, planeIndex = 0) {
    // Возвращаем позицию меша (точка на поверхности)
    return new THREE.Vector3().copy(mesh.position);
  }
}