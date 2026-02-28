import * as THREE from 'three'

export class BaseShape {
  constructor(params = {}) {
    this.params = { ...this.defaultParams, ...params }
  }

  get defaultParams() {
    return {}
  }

  get parameterDefinitions() {
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

  // Применяет позицию и ротацию к меше на основе параметров
  applyTransformToMesh(mesh) {
    if (!mesh) return

    // Применяем позицию
    const posX = this.params.posX ?? 0
    const posY = this.params.posY ?? mesh.position.y // сохраняем оригинальное Y если не заданы параметры
    const posZ = this.params.posZ ?? 0

    mesh.position.set(posX, posY, posZ)

    // Применяем ротацию
    const rotX = this.params.rotationX ?? 0
    const rotY = this.params.rotationY ?? 0
    const rotZ = this.params.rotationZ ?? 0

    mesh.rotation.set(rotX, rotY, rotZ, 'XYZ')
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