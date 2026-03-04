import { getGlobalEngineRegistry } from '@/editor_core/general/engine/EngineRegistry'

export class AddConnectionCommand {
  constructor(connection) {
    console.log('[->] AddConnectionCommand: constructor')
    // connection - объект вида: { id, type, parentId, parentEdgeIndex, childId, childEdgeIndex }
    this.connection = connection
    
    // Флаг для HistorySystem (если он используется в твоей архитектуре для разделения 2D/3D команд)
    this.is3DCommand = true 
  }

  execute() {
    console.log('[->] AddConnectionCommand: execute()')
    const ER = getGlobalEngineRegistry()
    if (ER?.connectionSystem) {
      ER.connectionSystem.addConnection(this.connection)
    }
  }

  undo() {
    console.log('[->] AddConnectionCommand: undo()')
    const ER2 = getGlobalEngineRegistry()
    if (ER2?.connectionSystem) {
      ER2.connectionSystem.removeConnection(this.connection.id)
    }
  }
}