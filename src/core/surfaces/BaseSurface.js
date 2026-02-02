import * as THREE from 'three'

export class BaseSurface {
  constructor(params = {}) {
    this.params = { ...this.defaultParams, ...params }
  }

  get defaultParams() { return {} }

  createMesh() { throw new Error('Implemented by subclass') }
  createUnfold2D() { throw new Error('Implemented by subclass') }
  
  /**
   * Преобразует точку (u, v) из системы координат развертки в 3D точку (x, y, z)
   * Это ключевой метод для создания точных отрезов.
   */
  mapUVTo3D(u, v) { 
      throw new Error('mapUVTo3D must be implemented') 
  }

  /**
   * Возвращает контур развертки (для отрисовки границ в редакторе)
   * @returns {THREE.Vector2[]} массив точек контура
   */
  getUnfoldOutline() {
      return []
  }

  getStandardMaterial() {
    return new THREE.MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      metalness: 0.1, roughness: 0.5, side: THREE.DoubleSide
    })
  }

  getLineMaterial() {
    return new THREE.LineBasicMaterial({ color: 0x333333 })
  }

  _setupUserData(mesh, surfaceType) {
    mesh.userData.surfaceType = surfaceType
    mesh.userData.params = { ...this.params }
    mesh.userData.selectable = true
  }
  
  // Методы для работы с кривой основания
  getBaseCurve() { return this.baseCurve }
  setBaseCurve(curve) { /* override */ }
}