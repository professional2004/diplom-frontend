export class RotateUnfoldDetailCommand {
  constructor(mesh, newRotation, oldRotation) {
    console.log('[->] RotateUnfoldDetailCommand: constructor')
    this.mesh = mesh
    this.newRotation = newRotation
    this.oldRotation = oldRotation
    
    // Флаг для Registry, чтобы не запускать rebuild
    this.is3DCommand = false
  }

  execute() {
    console.log('[->] RotateUnfoldDetailCommand: execute()')
    if (this.mesh) {
      this.mesh.rotation.z = this.newRotation

      // Сохраняем ротацию в параметры развертки
      if (!this.mesh.userData.unfoldParams) {
        this.mesh.userData.unfoldParams = { posX: 0, posY: 0, rotation: 0 }
      }
      
      this.mesh.userData.unfoldParams.rotation = this.newRotation
    }
  }

  undo() {
    console.log('[->] RotateUnfoldDetailCommand: undo()')
    if (this.mesh) {
      this.mesh.rotation.z = this.oldRotation
      
      // Восстанавливаем параметры
      if (!this.mesh.userData.unfoldParams) {
        this.mesh.userData.unfoldParams = { posX: 0, posY: 0, rotation: 0 }
      }
      this.mesh.userData.unfoldParams.rotation = this.oldRotation
    }
  }
}
