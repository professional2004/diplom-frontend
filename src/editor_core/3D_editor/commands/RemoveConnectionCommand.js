import { getGlobalEngineRegistry } from '@/editor_core/general/engine/EngineRegistry'

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
    const ER = getGlobalEngineRegistry()
    if (ER?.connectionSystem) {
      // Ищем связь перед удалением, чтобы сохранить её для отмены
      const connections = ER.connectionSystem.connections
      this.savedConnection = connections.find(c => c.id === this.connectionId)
      
      if (this.savedConnection) {
        ER.connectionSystem.removeConnection(this.connectionId)
      }
    }
  }

  undo() {
    console.log('[->] RemoveConnectionCommand: undo()')
    const ER2 = getGlobalEngineRegistry()
    if (ER2?.connectionSystem && this.savedConnection) {
      ER2.connectionSystem.addConnection(this.savedConnection)
    }
  }
}