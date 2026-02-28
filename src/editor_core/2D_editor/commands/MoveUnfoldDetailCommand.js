export class MoveUnfoldDetailCommand {
  constructor(mesh, newPosition, oldPosition) {
    this.mesh = mesh
    this.newPosition = newPosition.clone()
    this.oldPosition = oldPosition.clone()
    
    // Сохраняем старые параметры развертки
    this.oldUnfoldParams = this.mesh.userData.unfoldParams 
      ? { ...this.mesh.userData.unfoldParams }
      : { posX: 0, posY: 0, rotation: 0 }
    
    // Флаг для Registry, чтобы не запускать rebuild
    this.is3DCommand = false 
  }

  execute() {
    if (this.mesh) {
      this.mesh.position.copy(this.newPosition)

      // Сохраняем позицию и ротацию в параметры развертки
      if (!this.mesh.userData.unfoldParams) {
        this.mesh.userData.unfoldParams = { posX: 0, posY: 0, rotation: 0 }
      }
      
      this.mesh.userData.unfoldParams.posX = this.newPosition.x
      this.mesh.userData.unfoldParams.posY = this.newPosition.y
      this.mesh.userData.unfoldParams.rotation = this.mesh.rotation.z

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
      
      // Восстанавливаем параметры
      this.mesh.userData.unfoldParams = { ...this.oldUnfoldParams }
      this.mesh.rotation.z = this.oldUnfoldParams.rotation ?? 0
      
      if (this.mesh.userData.sourceObject) {
        this.mesh.userData.sourceObject.userData.last2DPosition = this.oldPosition.clone();
      }
    }
  }
}