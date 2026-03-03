import EngineRegistry from '@/editor_core/general/engine/EngineRegistry'

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
    if (EngineRegistry.connectionSystem) {
      // Добавляем связь. Внутри addConnection автоматически вызовется updateDependencies,
      // и фигура-потомок сразу же "примагнитится" к родителю.
      EngineRegistry.connectionSystem.addConnection(this.connection)
    }
  }

  undo() {
    console.log('[->] AddConnectionCommand: undo()')
    if (EngineRegistry.connectionSystem) {
      // При отмене просто удаляем связь.
      // Важно: фигура-потомок останется на том месте, куда примагнитилась (так работает большинство САПР).
      // Если нужно возвращать её на старое место, нам придется сохранять её старые координаты в этой команде.
      EngineRegistry.connectionSystem.removeConnection(this.connection.id)
    }
  }
}