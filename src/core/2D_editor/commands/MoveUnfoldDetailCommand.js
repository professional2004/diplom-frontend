export class MoveUnfoldDetailCommand {
  constructor(mesh, newPosition, oldPosition) {
    this.mesh = mesh
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