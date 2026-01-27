import * as THREE from 'three'

export class BaseShape {
  constructor(params = {}) {
    this.params = { ...this.defaultParams, ...params }
  }

  get defaultParams() {
    return {}
  }

  // Создает 3D Mesh для сцены
  createMesh() {
    throw new Error('createMesh must be implemented')
  }

  // Возвращает группу линий (THREE.Group) для 2D виджета
  createUnfold2D() {
    throw new Error('createUnfold2D must be implemented')
  }

  // Обновляет геометрию существующего mesh при изменении параметров
  // Переопределяется в каждой фигуре
  updateMeshGeometry(mesh, newParams) {
    throw new Error('updateMeshGeometry must be implemented')
  }

  // Вспомогательный метод для материалов
  getStandardMaterial() {
    return new THREE.MeshStandardMaterial({ 
      color: Math.random() * 0xffffff,
      metalness: 0.1,
      roughness: 0.5
    })
  }

  getLineMaterial() {
    return new THREE.LineBasicMaterial({ color: 0x333333 })
  }
}