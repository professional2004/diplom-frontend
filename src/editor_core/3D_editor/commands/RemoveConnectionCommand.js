import EngineRegistry from '@/editor_core/general/engine/EngineRegistry'

export class RemoveConnectionCommand {
  constructor(connectionId) {
    console.log('[->] RemoveConnectionCommand: constructor')
    this.connectionId = connectionId
    this.is3DCommand = true
    
    // Переменная для сохранения удаляемой связи, чтобы её можно было восстановить при Undo
    this.savedConnection = null 
  }

  execute() {
    console.log('[->] RemoveConnectionCommand: execute()')
    if (EngineRegistry.connectionSystem) {
      // Ищем связь перед удалением, чтобы сохранить её для отмены
      const connections = EngineRegistry.connectionSystem.connections
      this.savedConnection = connections.find(c => c.id === this.connectionId)
      
      if (this.savedConnection) {
        EngineRegistry.connectionSystem.removeConnection(this.connectionId)
      }
    }
  }

  undo() {
    console.log('[->] RemoveConnectionCommand: undo()')
    if (EngineRegistry.connectionSystem && this.savedConnection) {
      // Восстанавливаем сохраненную связь
      EngineRegistry.connectionSystem.addConnection(this.savedConnection)
    }
  }
}