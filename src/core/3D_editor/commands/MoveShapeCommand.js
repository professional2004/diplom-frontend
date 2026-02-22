export class MoveShapeCommand {
  constructor(mesh, newPosition, oldPosition) {
    this.mesh = mesh
    this.newPosition = newPosition.clone()
    this.oldPosition = oldPosition.clone()
    // Говорим реестру, что после этой команды 2D сцена должна обновиться
    this.is3DCommand = true 
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