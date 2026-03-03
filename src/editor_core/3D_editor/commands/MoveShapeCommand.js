export class MoveShapeCommand {
  constructor(mesh, newPosition, oldPosition) {
    console.log('[->] MoveShapeCommand: constructor')
    this.mesh = mesh
    this.newPosition = newPosition.clone()
    this.oldPosition = oldPosition.clone()
    
    // Сохраняем старые параметры для отката
    this.oldParams = this.mesh.userData.params ? { ...this.mesh.userData.params } : {}
    
    // Говорим реестру, что после этой команды 2D сцена должна обновиться
    this.is3DCommand = true 
  }

  execute() {
    console.log('[->] MoveShapeCommand: execute()')
    if (this.mesh) {
      this.mesh.position.copy(this.newPosition)
      
      // Обновляем параметры позиции
      if (this.mesh.userData.params) {
        this.mesh.userData.params.posX = this.newPosition.x
        this.mesh.userData.params.posY = this.newPosition.y
        this.mesh.userData.params.posZ = this.newPosition.z
        
        // Обновляем у владельца
        if (this.mesh.userData.owner && this.mesh.userData.owner.params) {
          this.mesh.userData.owner.params = { ...this.mesh.userData.params }
        }
      }
    }
  }

  undo() {
    console.log('[->] MoveShapeCommand: undo()')
    if (this.mesh) {
      this.mesh.position.copy(this.oldPosition)
      
      // Восстанавливаем параметры
      if (this.oldParams && this.mesh.userData) {
        this.mesh.userData.params = { ...this.oldParams }
        
        if (this.mesh.userData.owner && this.mesh.userData.owner.params) {
          this.mesh.userData.owner.params = { ...this.oldParams }
        }
      }
    }
  }
}