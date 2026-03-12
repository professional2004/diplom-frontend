import * as THREE from 'three'

export class UnfoldDetail {
  constructor(mesh, parentShapeId) {
    this.mesh = mesh // Теперь это один THREE.Mesh, а не Group
    
    // Помечаем объект для InputSystem и SelectionSystem
    this.mesh.userData.isUnfoldPart = true
    this.mesh.userData.selectable = true
    this.mesh.userData.parentShapeId = parentShapeId

    // Инициализируем параметры позиции и ротации для 2D развертки
    if (!this.mesh.userData.unfoldParams) {
      this.mesh.userData.unfoldParams = {
        posX: 0,
        posY: 0,
        rotation: 0
      }
    }

    // Сохраняем исходный цвет материала для SelectionSystem
    if (this.mesh.material) {
      // Клонируем материал, чтобы подсветка при выделении не меняла все развертки
      this.mesh.material = this.mesh.material.clone()
      if (this.mesh.material.color) {
        this.mesh.userData.originalColor = this.mesh.material.color.getHex()
      }
    }
  }

  // Применяет сохраненные параметры позиции и ротации к меше
  applyStoredTransform() {
    if (this.mesh.userData.unfoldParams) {
      const params = this.mesh.userData.unfoldParams
      this.mesh.position.set(params.posX ?? 0, params.posY ?? 0, 0)
      this.mesh.rotation.z = params.rotation ?? 0
    }
  }
}