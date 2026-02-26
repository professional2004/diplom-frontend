export class UnfoldDetail {
  constructor(meshGroup, parentShapeId) {
    this.mesh = meshGroup
    
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

    // Сохраняем исходные цвета линий для SelectionSystem
    this.mesh.traverse(child => {
      if (child.isLine && child.material) {
        // Клонируем материал, чтобы изменение цвета не влияло на все развертки сразу
        child.material = child.material.clone()
        child.userData.originalColor = child.material.color.getHex()
      }
    })
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