import * as THREE from 'three'

export class UnfoldPart {
  constructor(meshGroup, parentShapeId) {
    this.mesh = meshGroup
    
    // Помечаем объект для InputSystem и SelectionSystem
    this.mesh.userData.isUnfoldPart = true
    this.mesh.userData.selectable = true
    this.mesh.userData.parentShapeId = parentShapeId

    // Сохраняем исходные цвета линий для SelectionSystem
    this.mesh.traverse(child => {
      if (child.isLine && child.material) {
        // Клонируем материал, чтобы изменение цвета не влияло на все развертки сразу
        child.material = child.material.clone()
        child.userData.originalColor = child.material.color.getHex()
      }
    })
  }
}