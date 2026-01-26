import * as THREE from 'three'

export class MoveCommand {
  constructor(mesh, newPosition, oldPosition) {
    this.mesh = mesh
    // Копируем значения, чтобы они не менялись по ссылке
    this.newPosition = newPosition.clone()
    this.oldPosition = oldPosition.clone()
  }

  execute() {
    if (this.mesh) {
      this.mesh.position.copy(this.newPosition)
    }
  }

  undo() {
    if (this.mesh) {
      this.mesh.position.copy(this.oldPosition)
    }
  }
}