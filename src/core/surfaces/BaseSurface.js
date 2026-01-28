import * as THREE from 'three'

/**
 * Базовый класс для всех поверхностей
 * Все поверхности - развертывающиеся (developable surfaces)
 */
export class BaseSurface {
  constructor(params = {}) {
    this.params = { ...this.defaultParams, ...params }
  }

  get defaultParams() {
    return {}
  }

  /**
   * Создает 3D Mesh поверхности для сцены
   * Возвращает THREE.Mesh с сохраненными userData
   */
  createMesh() {
    throw new Error('createMesh must be implemented')
  }

  /**
   * Создает 2D развертку поверхности
   * Возвращает THREE.Group с линиями развертки
   */
  createUnfold2D() {
    throw new Error('createUnfold2D must be implemented')
  }

  /**
   * Возвращает стандартный материал для поверхности
   */
  getStandardMaterial() {
    return new THREE.MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      metalness: 0.1,
      roughness: 0.5,
      side: THREE.DoubleSide
    })
  }

  /**
   * Возвращает материал для линий
   */
  getLineMaterial() {
    return new THREE.LineBasicMaterial({ color: 0x333333 })
  }

  /**
   * Сохраняет в userData типы поверхности и параметры для восстановления
   */
  _setupUserData(mesh, surfaceType) {
    mesh.userData.surfaceType = surfaceType
    mesh.userData.params = { ...this.params }
    mesh.userData.selectable = true
  }
}
