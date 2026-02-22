export class MoveUnfoldDetailCommand {
  constructor(mesh, newPosition, oldPosition) {
    this.mesh = mesh
    this.newPosition = newPosition.clone()
    this.oldPosition = oldPosition.clone()
    // Флаг для Registry, чтобы не запускать rebuild
    this.is3DCommand = false 
  }

  execute() {
    if (this.mesh) {
      this.mesh.position.copy(this.newPosition)

      // сохраняем позицию в 3D объект, чтобы при случайной пересборке деталь осталась на месте
      if (this.mesh.userData.sourceId) {
        const source3D = this.mesh.userData.sourceObject;
        if (source3D) {
          source3D.userData.last2DPosition = this.newPosition.clone();
        }
      }
    }
  }

  undo() {
    if (this.mesh) {
      this.mesh.position.copy(this.oldPosition)
      if (this.mesh.userData.sourceObject) {
        this.mesh.userData.sourceObject.userData.last2DPosition = this.oldPosition.clone();
      }
    }
  }
}