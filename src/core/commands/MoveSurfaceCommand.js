/**
 * Команда для перемещения поверхности
 */
export class MoveSurfaceCommand {
  constructor(mesh, fromPosition, toPosition) {
    this.mesh = mesh
    this.fromPosition = fromPosition.clone()
    this.toPosition = toPosition.clone()
  }

  execute() {
    this.mesh.position.copy(this.toPosition)
  }

  undo() {
    this.mesh.position.copy(this.fromPosition)
  }
}
